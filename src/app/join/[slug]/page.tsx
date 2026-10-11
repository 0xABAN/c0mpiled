import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { JoinFlow, type JoinBlocker } from "@/frontend/features/onboarding/join-flow";
import { getClubBySlug, getViewer } from "@/frontend/lib/api";

export const metadata: Metadata = { title: "Join a club · Roster" };

export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const club = await getClubBySlug(slug);
  if (!club) notFound();

  // Anyone can see the invitation; joining needs a school account at the club's school.
  const viewer = await getViewer();
  if (viewer && !viewer.accountType) redirect(`/signup?club=${slug}`);

  const school = viewer?.school ? { name: viewer.school.name, domain: viewer.school.domains[0] } : null;
  const blocker: JoinBlocker | null = !viewer
    ? "signed-out"
    : viewer.accountType === "recruiter"
      ? "recruiter"
      : viewer.school?.name !== club.school
        ? "other-school"
        : null;

  return <JoinFlow club={club} blocker={blocker} school={school} finishesSetup={!!viewer && !viewer.onboarded} />;
}
