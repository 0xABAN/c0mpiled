import type { Metadata } from "next";

import { SignupFlow } from "@/frontend/features/auth/signup-flow";
import { getClubBySlug } from "@/frontend/lib/api";
import { searchSchools } from "@/frontend/lib/api/actions";

export const metadata: Metadata = { title: "Sign up · Roster" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ as?: string; club?: string }> }) {
  const { as, club: slug } = await searchParams;
  const initialType = as === "school" || as === "recruiter" ? as : null;

  // A join link already tells us the school, so that step can be skipped.
  const club = slug ? await getClubBySlug(slug) : null;
  const clubSchool = club ? ((await searchSchools(club.school)).find((school) => school.name === club.school) ?? null) : null;

  return <SignupFlow initialType={club ? "school" : initialType} initialSchool={clubSchool} joinSlug={club?.slug ?? null} />;
}
