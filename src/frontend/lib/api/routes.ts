import type { Viewer } from "./types";

/**
 * HTTP endpoints the UI links to directly (as opposed to calling server actions).
 */

/** Account destination after authentication, separate from the public homepage. */
export function accountHomeHref(viewer: Pick<Viewer, "accountType" | "onboarded">): string {
  if (!viewer.accountType) return "/signup";
  if (!viewer.onboarded) return "/setup";
  return viewer.accountType === "recruiter" ? "/browse" : "/resume";
}

/** Only local paths may be used as post-login destinations. */
export function safeNextPath(path: unknown): string | null {
  if (typeof path !== "string" || !path.startsWith("/")) return null;

  const origin = "https://roster.invalid";
  try {
    const url = new URL(path, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

/**
 * The original PDF of an unlocked resume. The route checks access, then redirects to a
 * presigned S3 URL that expires after 5 minutes.
 */
export function resumePdfUrl(resumeId: string, options: { download?: boolean } = {}): string {
  const url = `/api/resumes/${encodeURIComponent(resumeId)}/pdf`;
  return options.download ? `${url}?download=1` : url;
}

/**
 * One page (1-based) of a resume with the student's identity blacked out, as a PNG.
 * Redirects to a presigned S3 URL; see Contract 3 in AGENTS.md.
 */
export function resumePreviewUrl(resumeId: string, page: number): string {
  return `/api/resumes/${encodeURIComponent(resumeId)}/preview/${page}`;
}
