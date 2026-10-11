import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/frontend/components/shell/app-header";
import { Checkout } from "@/frontend/features/unlock/checkout";
import { browseHref, parseFilters, unlockHref } from "@/frontend/features/resumes/filters";
import { getUnlockQuote, getViewer } from "@/frontend/lib/api";

export const metadata: Metadata = { title: "Unlock · Roster" };

export default async function UnlockPage({ params, searchParams }: {
  params: Promise<{ resumeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { resumeId } = await params;
  const filters = parseFilters(await searchParams);

  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(unlockHref(filters, resumeId))}`);
  if (viewer.accountType !== "recruiter") redirect("/");

  const quote = await getUnlockQuote(resumeId);
  if (!quote) notFound();

  return (
    <>
      <AppHeader viewer={viewer} />
      <main>
        <Checkout quote={quote} resumeHref={browseHref(filters, resumeId)} />
      </main>
    </>
  );
}
