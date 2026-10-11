/**
 * Redacts one resume PDF and writes its pages as PNGs, for checking redaction without the app.
 *
 *   npm run redact -- fake-resume.pdf "Jane Doe" [out-dir]
 *
 * Writes `page-1.png`, `page-2.png`, … to `out-dir` (default: a new temp directory).
 */

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { UserError } from "@/backend/errors";
import { redactResume } from "@/backend/redaction";

async function main() {
  const [pdfPath, name, outDir] = process.argv.slice(2);
  if (!pdfPath || !name) throw new Error('Usage: npm run redact -- resume.pdf "Full Name" [out-dir]');

  const pages = await redactResume(await readFile(pdfPath), { name });
  const dir = outDir ?? (await mkdtemp(join(tmpdir(), "redacted-")));

  for (const [index, png] of pages.entries()) {
    const path = join(dir, `page-${index + 1}.png`);
    await writeFile(path, png);
    console.log(path);
  }
}

main().catch((error: unknown) => {
  // A UserError is what the student would see; anything else is a bug worth a stack trace.
  console.error(error instanceof UserError ? `Rejected: ${error.message}` : error);
  process.exit(1);
});
