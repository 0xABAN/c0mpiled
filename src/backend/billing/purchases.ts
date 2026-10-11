import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, gt, inArray, isNull, isNotNull, or, sql } from "drizzle-orm";
import { z } from "zod";

import { requireAccount } from "@/backend/accounts";
import { billingProducts, bookCheckouts, bookMembers, books, clubs, db, unlocks } from "@/backend/db";
import { UserError } from "@/backend/errors";
import { parseInput } from "@/backend/validation";

import { browseReturnPath, isDemoBuyer, sameBillingApp } from "./contracts";
import { splitBookPrice } from "./fees";
import { createProduct, paidForProduct, startProviderCheckout } from "./provider";
import { activeUnlocks, billingConfig } from "./scope";

const pending = and(isNull(bookCheckouts.paidAt), isNull(bookCheckouts.expiredAt));
type Checkout = typeof bookCheckouts.$inferSelect;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CheckoutInput = { bookId: string; resumeId: string; priceCents: number; returnPath: string };
export type CheckoutView = {
  id: string;
  billingMode: "sandbox" | "live";
  bookName: string;
  priceCents: number;
  returnPath: string;
  checkoutUrl: string | null;
  expired: boolean;
};

/** Pending prices are held until the provider's checkout expiry, not recalculated on return. */
export async function pendingBookSplits(recruiterId: string, bookIds: string[]) {
  if (!bookIds.length) return [];
  return db.select({
    bookId: bookCheckouts.bookId,
    priceCents: bookCheckouts.priceCents,
    platformFeeCents: bookCheckouts.platformFeeCents,
    clubPayoutCents: sql<number>`${bookCheckouts.priceCents} - ${bookCheckouts.platformFeeCents}`,
  }).from(bookCheckouts).where(and(
    eq(bookCheckouts.recruiterId, recruiterId), inArray(bookCheckouts.bookId, bookIds), pending,
    eq(bookCheckouts.appArn, billingConfig().appArn),
    or(isNull(bookCheckouts.expiresAt), gt(bookCheckouts.expiresAt, new Date())),
  ));
}

async function requireBuyer() {
  const buyer = await requireAccount("recruiter");
  if (!buyer.company || !buyer.onboardedAt) throw new UserError("Finish your company setup before buying a book.");
  return buyer;
}

/** Serialize start/confirm for one buyer and book, including concurrent tabs and callbacks. */
async function lockPurchase(tx: Transaction, buyerId: string, bookId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${buyerId}:${bookId}`}, 0))`);
}

async function recordedUnlock(tx: Transaction, buyerId: string, bookId: string) {
  const [row] = await tx.select().from(unlocks).where(and(eq(unlocks.recruiterId, buyerId), eq(unlocks.bookId, bookId), activeUnlocks()));
  return row;
}

/** Resolve a catalog entry once. Repricing never mutates a product an earlier buyer could own. */
async function readyProduct(productId: string) {
  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(billingProducts).where(eq(billingProducts.id, productId)).for("update");
    if (!product) throw new Error("Catalog reservation is missing.");
    if (product.metricId) return product;
    if (billingConfig().mode === "live") throw new UserError("Live checkout has not been enabled for this book at this price.");

    const metricId = await createProduct(product);
    const [ready] = await tx.update(billingProducts).set({ metricId }).where(eq(billingProducts.id, product.id)).returning();
    return ready;
  });
}

async function hasPayment(tx: Transaction, checkout: Checkout): Promise<boolean> {
  if (checkout.appArn !== billingConfig().appArn) throw new UserError("This checkout belongs to a different billing environment.");
  // A deliberately free book needs no card, but still requires an authenticated purchase intent.
  if (checkout.priceCents === 0) return true;
  if (!checkout.productId || !checkout.providerSessionId || !checkout.providerPurchaseId) return false;

  const [product] = await tx.select().from(billingProducts).where(eq(billingProducts.id, checkout.productId));
  if (!product?.metricId || product.bookId !== checkout.bookId || product.priceCents !== checkout.priceCents || !sameBillingApp(product.appArn, checkout.appArn)) {
    throw new Error("Checkout and provider product do not match.");
  }
  return paidForProduct(checkout.recruiterId, product.id, product.metricId);
}

/** Called only after server-side payment verification (or an explicit zero-price purchase). */
async function saveUnlock(tx: Transaction, checkout: Checkout) {
  await tx.insert(unlocks).values({
    bookId: checkout.bookId,
    recruiterId: checkout.recruiterId,
    checkoutId: checkout.id,
    billingMode: billingConfig().mode,
    priceCents: checkout.priceCents,
    platformFeeCents: checkout.platformFeeCents,
  }).onConflictDoNothing({ target: [unlocks.bookId, unlocks.recruiterId, unlocks.billingMode] });
  await tx.update(bookCheckouts).set({ paidAt: new Date() }).where(eq(bookCheckouts.id, checkout.id));
}

/**
 * Create or resume a checkout. Nothing in the caller's price, redirect, or return query authorizes access.
 * Persist the intent before contacting the provider so a lost response retries the same payment.
 */
export async function beginCheckout(raw: unknown, origin: string): Promise<{ url: string }> {
  const buyer = await requireBuyer();
  const input = parseInput(z.object({
    bookId: z.uuid(), resumeId: z.uuid(), priceCents: z.number().int().nonnegative(),
    returnPath: z.string().max(4096),
  }), raw);
  let returnPath: string;
  try {
    returnPath = browseReturnPath(input.returnPath);
  } catch {
    throw new UserError("Return to the resume and try checkout again.");
  }
  const { appArn, mode, liveProductId } = billingConfig();
  if (mode === "live" && isDemoBuyer(buyer)) {
    throw new UserError("Create your own company account to make a real purchase. Shared demo accounts cannot pay.");
  }

  const [book] = await db.select({ id: books.id, name: clubs.name, priceCents: books.priceCents })
    .from(books).innerJoin(clubs, eq(clubs.id, books.clubId)).innerJoin(bookMembers, eq(bookMembers.bookId, books.id))
    .where(and(eq(books.id, input.bookId), eq(bookMembers.resumeId, input.resumeId), eq(bookMembers.status, "accepted")));
  if (!book) throw new UserError("This resume is no longer available in that book.");

  // Reserve the intent under a buyer/book lock. Provider catalog work happens after this commit.
  const intent = await db.transaction(async (tx) => {
    await lockPurchase(tx, buyer.id, book.id);
    if (await recordedUnlock(tx, buyer.id, book.id)) return null;

    const [previous] = await tx.select().from(bookCheckouts).where(and(
      eq(bookCheckouts.bookId, book.id), eq(bookCheckouts.recruiterId, buyer.id), eq(bookCheckouts.appArn, appArn), pending,
    ));
    if (previous) {
      if (await hasPayment(tx, previous)) {
        await saveUnlock(tx, previous);
        return previous;
      }
      if (!previous.expiresAt || previous.expiresAt > new Date()) {
        if (input.priceCents !== previous.priceCents) throw new UserError("An earlier checkout holds a different price. Refresh this page to resume it.");
        return previous;
      }
      await tx.update(bookCheckouts).set({ expiredAt: new Date() }).where(eq(bookCheckouts.id, previous.id));
    }
    if (input.priceCents !== book.priceCents) throw new UserError("The book price changed. Refresh this page before paying.");

    const id = randomUUID();
    // Catalog reservation and intent are committed together; only positive-price books need a product.
    let productId: string | null = null;
    if (mode === "live") {
      // Catalogs are shared across provider environments. Only this approved product may go live.
      const [product] = await tx.select().from(billingProducts).where(and(
        eq(billingProducts.bookId, book.id), eq(billingProducts.priceCents, book.priceCents),
        eq(billingProducts.id, liveProductId!), isNotNull(billingProducts.metricId),
      ));
      if (!product || !sameBillingApp(product.appArn, appArn)) throw new UserError("Live checkout has not been enabled for this book at this price.");
      productId = product.id;
    } else if (book.priceCents > 0) {
      const [product] = await tx.insert(billingProducts).values({ bookId: book.id, name: `Test: ${book.name}`, priceCents: book.priceCents, appArn })
        .onConflictDoUpdate({ target: [billingProducts.bookId, billingProducts.priceCents, billingProducts.appArn], set: { bookId: book.id } }).returning();
      productId = product.id;
    }
    const split = splitBookPrice(book.priceCents);
    const [created] = await tx.insert(bookCheckouts).values({
      id, bookId: book.id, recruiterId: buyer.id, productId, appArn,
      priceCents: split.priceCents, platformFeeCents: split.platformFeeCents,
      returnPath, callbackUrl: new URL(`/checkout/${id}`, origin).href,
    }).returning();
    return created;
  });
  if (!intent) return { url: returnPath };
  if (intent.priceCents === 0 || intent.paidAt) return { url: `/checkout/${intent.id}` };

  if (!intent.productId) throw new Error("A paid checkout requires a catalog product.");
  await readyProduct(intent.productId);
  return db.transaction(async (tx) => {
    await lockPurchase(tx, buyer.id, book.id);
    const [current] = await tx.select().from(bookCheckouts).where(eq(bookCheckouts.id, intent.id));
    if (!current) throw new Error("Checkout reservation is missing.");
    if (await recordedUnlock(tx, buyer.id, book.id)) return { url: `/checkout/${current.id}` };
    if (current.checkoutUrl) return { url: current.checkoutUrl };
    if (!current.productId) throw new Error("A paid checkout requires a catalog product.");

    const session = await startProviderCheckout(buyer.id, current.productId, current.id, current.callbackUrl);
    await tx.update(bookCheckouts).set({
      checkoutUrl: session.checkoutUrl, providerSessionId: session.checkoutSessionId,
      providerPurchaseId: session.purchaseIds[0], expiresAt: session.expiresAt,
    }).where(eq(bookCheckouts.id, current.id));
    return { url: session.checkoutUrl };
  });
}

/** Return-page data contains no contact details and is only available to the checkout's buyer. */
export async function getCheckout(rawId: unknown): Promise<CheckoutView | null> {
  const buyer = await requireBuyer();
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return null;
  const [row] = await db.select({ checkout: bookCheckouts, bookName: clubs.name })
    .from(bookCheckouts).innerJoin(books, eq(books.id, bookCheckouts.bookId)).innerJoin(clubs, eq(clubs.id, books.clubId))
    .where(and(eq(bookCheckouts.id, id.data), eq(bookCheckouts.recruiterId, buyer.id)));
  if (!row || row.checkout.appArn !== billingConfig().appArn) return null;
  const { checkout } = row;
  return {
    id: checkout.id, bookName: row.bookName, billingMode: billingConfig().mode, priceCents: checkout.priceCents,
    returnPath: checkout.returnPath, checkoutUrl: checkout.checkoutUrl,
    expired: Boolean(checkout.expiresAt && checkout.expiresAt <= new Date()),
  };
}

/** Returning from checkout is not proof. Recheck the exact buyer/product before the ledger insert. */
export async function confirmCheckout(rawId: unknown): Promise<{ unlocked: boolean }> {
  const buyer = await requireBuyer();
  const id = parseInput(z.uuid(), rawId);
  const [checkout] = await db.select().from(bookCheckouts).where(and(eq(bookCheckouts.id, id), eq(bookCheckouts.recruiterId, buyer.id)));
  if (!checkout || checkout.appArn !== billingConfig().appArn) throw new UserError("Checkout not found in this billing environment.");

  return db.transaction(async (tx) => {
    await lockPurchase(tx, buyer.id, checkout.bookId);
    if (await recordedUnlock(tx, buyer.id, checkout.bookId)) return { unlocked: true };
    if (!await hasPayment(tx, checkout)) return { unlocked: false };
    await saveUnlock(tx, checkout);
    return { unlocked: true };
  });
}
