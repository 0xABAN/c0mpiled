import type { Metadata } from "next";

import { SignupFlow } from "@/frontend/features/auth/signup-flow";

export const metadata: Metadata = { title: "Sign up · Roster" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ as?: string; club?: string }> }) {
  const { as, club } = await searchParams;
  const initialType = as === "school" || as === "recruiter" ? as : null;

  return <SignupFlow initialType={club ? "school" : initialType} joinSlug={club ?? null} />;
}
