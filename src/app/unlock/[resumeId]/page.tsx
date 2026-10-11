import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/frontend/components/shell/app-header";
import { Checkout } from "@/frontend/features/unlock/checkout";
import { getUnlockQuote, getViewer } from "@/frontend/lib/api";

export const metadata: Metadata = { title: "Unlock · Roster" };

export default async function UnlockPage({ params }: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = await params;

  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=/unlock/${resumeId}`);
  if (viewer.accountType !== "recruiter") redirect("/");

  const quote = await getUnlockQuote(resumeId);
  if (!quote) notFound();

  return (
    <>
      <AppHeader viewer={viewer} />
      <main>
        <Checkout quote={quote} />
      </main>
    </>
  );
}
