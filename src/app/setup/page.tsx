import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SetupFlow } from "@/frontend/features/onboarding/setup-flow";
import { getResumeFacets, getViewer, listOpenBooks } from "@/frontend/lib/api";
import { accountHomeHref } from "@/frontend/lib/api/routes";

export const metadata: Metadata = { title: "Set up · Roster" };

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/setup");
  if (!viewer.accountType) redirect("/signup");

  // `?club=1` lets a student who skipped it during onboarding start selling their club's book.
  const startingClub = (await searchParams).club === "1" && viewer.accountType === "school" && !viewer.ownedClub;
  if (viewer.onboarded && !startingClub) redirect(accountHomeHref(viewer));

  if (viewer.accountType === "school") {
    const only = startingClub ? "club" : viewer.ownedClub ? "resume" : undefined;

    // School accounts always have a school; signup won't create one without it.
    return <SetupFlow accountType="school" email={viewer.email} school={viewer.school!} only={only} books={await listOpenBooks()} />;
  }

  const facets = await getResumeFacets();

  return (
    <SetupFlow
      accountType="recruiter"
      majorOptions={facets.majors.slice(0, 12).map((option) => option.label)}
      gradYearOptions={facets.gradYears.map((option) => Number(option.value))}
    />
  );
}
