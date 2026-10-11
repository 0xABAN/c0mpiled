import "server-only";

import { createDetector } from "./detect";
import { redactPdf } from "./pdf";

/**
 * Contract 3 (AGENTS.md): the redacted resume recruiters see before they buy a book.
 *
 * Returns one PNG per page with the student's identity blacked out: every part of `name`,
 * emails, phone numbers, web addresses, street addresses, and linked text. Images (headshots)
 * are deleted.
 * Pages are images so nothing hidden survives: no text layer, metadata, or link targets.
 *
 * Pure: bytes in, bytes out. Callers own storage and access checks.
 *
 * Throws `UserError` when the student has to fix something: a scanned or locked PDF, more
 * than 3 pages, or a name that doesn't appear on the resume as typed. Throws `Error` if the
 * redacted pages still contain identifying text.
 */
export async function redactResume(pdf: Uint8Array, student: { name: string }): Promise<Uint8Array[]> {
  return redactPdf(pdf, createDetector(student.name));
}
