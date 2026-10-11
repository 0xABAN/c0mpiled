import { getResumePdfUrl } from "@/backend/api/queries";

/**
 * A resume's original PDF, for recruiters who bought a book it's in. Redirects to a presigned
 * S3 URL that works for 5 minutes. `?download=1` saves the file instead of showing it.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const download = new URL(request.url).searchParams.get("download") === "1";

  const url = await getResumePdfUrl(id, download);
  if (!url) return new Response("Not found", { status: 404 });

  // The link expires, so neither the browser nor a CDN may reuse this redirect.
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store" } });
}
