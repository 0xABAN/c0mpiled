import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginScreen } from "@/frontend/features/auth/login-screen";
import { getViewer } from "@/frontend/lib/api";
import { accountHomeHref, safeNextPath } from "@/frontend/lib/api/routes";

export const metadata: Metadata = { title: "Log in · Roster" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  const safeNext = safeNextPath(next);
  const viewer = await getViewer();
  if (viewer) redirect(safeNext ?? accountHomeHref(viewer));

  return <LoginScreen next={safeNext} />;
}
