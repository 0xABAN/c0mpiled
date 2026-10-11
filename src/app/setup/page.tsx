import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SetupFlow } from "@/frontend/features/onboarding/setup-flow";
import { getResumeFacets, getViewer, listOpenBooks } from "@/frontend/lib/api";

export const metadata: Metadata = { title: "Set up · Roster" };

export default async function SetupPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/setup");
  if (!viewer.accountType) redirect("/signup");
  if (viewer.onboarded) redirect("/");

  if (viewer.accountType === "school") {
    // School accounts always have a school; signup won't create one without it.
    return <SetupFlow accountType="school" email={viewer.email} school={viewer.school!} books={await listOpenBooks()} />;
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
