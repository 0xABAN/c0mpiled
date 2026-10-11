import { getResumePreviewUrl } from "@/backend/api/queries";

/**
 * One redacted resume page (Contract 3), `page` starting at 1. Redirects to a presigned S3
 * URL that works for 5 minutes, after checking that the viewer may see the resume.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; page: string }> }) {
  const { id, page } = await params;

  const url = await getResumePreviewUrl(id, page);
  if (!url) return new Response("Not found", { status: 404 });

  // The link expires, so neither the browser nor a CDN may reuse this redirect.
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store" } });
}
