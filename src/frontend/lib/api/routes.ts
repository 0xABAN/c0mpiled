/**
 * HTTP endpoints the UI links to directly (as opposed to calling server actions).
 */

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
