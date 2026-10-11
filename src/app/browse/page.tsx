import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/frontend/components/shell/app-header";
import { Browser } from "@/frontend/features/resumes/browser";
import { browseHref, parseFilters, SELECTED_PARAM } from "@/frontend/features/resumes/filters";
import { getResume, getResumeFacets, getViewer, listResumes } from "@/frontend/lib/api";

export const metadata: Metadata = { title: "Browse resumes · Roster" };

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const selectedId = typeof params[SELECTED_PARAM] === "string" ? params[SELECTED_PARAM] : null;

  // Any signed-in account can browse; only companies can unlock.
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(browseHref(filters, selectedId))}`);
  if (!viewer.accountType) redirect("/signup");

  const [facets, page] = await Promise.all([getResumeFacets(), listResumes(filters, null)]);

  // A shared link can point at a resume that isn't on the first page.
  const linkedResume = selectedId && !page.items.some((resume) => resume.id === selectedId) ? await getResume(selectedId) : null;

  return (
    <>
      <AppHeader viewer={viewer} />
      <main id="main-content" tabIndex={-1}>
        <h1 className="visually-hidden">Browse resumes</h1>
        <Browser
          filters={filters}
          facets={facets}
          initialPage={page}
          canUnlock={viewer.accountType === "recruiter"}
          unlockedCount={viewer.unlockedCount}
          linkedResume={linkedResume}
        />
      </main>
    </>
  );
}
