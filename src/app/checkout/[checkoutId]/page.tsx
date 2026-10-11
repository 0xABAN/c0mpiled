import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/frontend/components/shell/app-header";
import { CheckoutReturn } from "@/frontend/features/unlock/checkout-return";
import { getCheckout, getViewer } from "@/frontend/lib/api";

export const metadata: Metadata = { title: "Test checkout · Roster" };

export default async function CheckoutPage({ params }: { params: Promise<{ checkoutId: string }> }) {
  const { checkoutId } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/checkout/${checkoutId}`)}`);
  if (viewer.accountType !== "recruiter") redirect("/browse");
  if (!viewer.onboarded) redirect("/setup");

  const checkout = await getCheckout(checkoutId);
  if (!checkout) notFound();

  return (
    <>
      <AppHeader viewer={viewer} />
      <main id="main-content" tabIndex={-1}><CheckoutReturn checkout={checkout} /></main>
    </>
  );
}
