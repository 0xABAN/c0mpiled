import type { Metadata } from "next";

import { LoginScreen } from "@/frontend/features/auth/login-screen";

export const metadata: Metadata = { title: "Log in · Roster" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  // Only follow same-site paths, so a crafted link can't bounce users elsewhere after login.
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;

  return <LoginScreen next={safeNext} />;
}
