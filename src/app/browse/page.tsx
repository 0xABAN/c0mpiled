import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/frontend/components/shell/app-header";
import { Browser } from "@/frontend/features/resumes/browser";
import { parseFilters, SELECTED_PARAM } from "@/frontend/features/resumes/filters";
import { getResume, getResumeFacets, getViewer, listResumes } from "@/frontend/lib/api";

export const metadata: Metadata = { title: "Browse resumes · Roster" };

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const selectedId = typeof params[SELECTED_PARAM] === "string" ? params[SELECTED_PARAM] : null;

  // Browsing is for signed-in recruiters who have finished setup.
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/browse");
  if (!viewer.accountType) redirect("/signup");
  if (!viewer.onboarded) redirect("/setup");
  if (viewer.accountType !== "recruiter") redirect("/");

  const [facets, page] = await Promise.all([getResumeFacets(), listResumes(filters, null)]);

  // A shared link can point at a resume that isn't on the first page.
  const linkedResume = selectedId && !page.items.some((resume) => resume.id === selectedId) ? await getResume(selectedId) : null;

  return (
    <>
      <AppHeader viewer={viewer} />
      <main>
        <Browser
          filters={filters}
          facets={facets}
          initialPage={page}
          unlockedCount={viewer.unlockedCount}
          linkedResume={linkedResume}
        />
      </main>
    </>
  );
}
