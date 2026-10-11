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
