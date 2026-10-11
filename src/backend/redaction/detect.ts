import "server-only";

import { UserError } from "@/backend/errors";

/**
 * What counts as identifying text on a resume.
 *
 * Every pattern runs over one paragraph at a time, with its lines joined by spaces so an
 * address that wraps still matches. Whatever matches is blacked out.
 * The patterns lean toward hiding too much: losing "Socket.io" from a skills line is fine,
 * showing a phone number is not.
 */

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;

/** US numbers: 814-555-0134, (814) 555 0134, +1 814.555.0134. */
const PHONE = /(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/gu;

/**
 * Web addresses, with or without a scheme: linkedin.com/in/jdoe, jdoe.github.io, janedoe.dev.
 * The top-level domain is case-sensitive so skills like "ASP.NET" aren't read as sites.
 */
const WEB_ADDRESS =
  /(?:https?:\/\/)?(?:[\p{L}\p{N}-]+\.)+(?:com|dev|io|me|net|org|app|ai|co|xyz|site|tech|page|us|info|edu)(?![\p{L}\p{N}])(?:\/[^\s|·•,;()]*)?/gu;

/** "123 College Ave", "42 N Atherton Street, Apt 4". */
const STREET_ADDRESS =
  /\b\d{1,6}\s+(?:[A-Z][\p{L}.'-]*\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl|Circle|Cir|Terrace|Ter|Parkway|Pkwy)\b\.?(?:,?\s+(?:Apt|Unit|Suite|#)\s*[\p{L}\p{N}-]+)?/gu;

/** A state and ZIP code: "PA 16801". The city alone is left visible. */
const STATE_ZIP = /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/gu;

const PATTERNS = [EMAIL, PHONE, WEB_ADDRESS, STREET_ADDRESS, STATE_ZIP];

/** A span of text to black out. `namePart` is set when the span is part of the student's name. */
export type Match = { start: number; end: number; namePart: string | null };

export type Detector = {
  /** The name parts that must appear on the resume, lowercased and without accents. */
  nameParts: string[];
  /** Every identifying span in `text`, which must already be passed through `foldAccents`. Spans may overlap. */
  find(text: string): Match[];
};

/**
 * Builds the detector for one student.
 *
 * Names can't be found by pattern, so each part of `name` ("Mary-Kate O'Neil" → mary, kate,
 * o'neil) is matched as a whole word, ignoring case and accents. One-letter initials are
 * skipped: they would black out every lone "A" on the page.
 */
export function createDetector(name: string): Detector {
  const nameParts = [
    ...new Set(
      normalizeName(name)
        .split(/[^\p{L}']+/u)
        .filter((part) => [...part].length >= 2),
    ),
  ];

  if (nameParts.length === 0) throw new UserError("Enter your full name as it appears on your resume.");

  // Either apostrophe matches either, since the form and the PDF may use different ones.
  const alternatives = nameParts.map((part) => escapeRegExp(part).replaceAll("'", "['’]"));

  // \b only knows ASCII letters, so letters on either side are ruled out explicitly ("José", "Zoë").
  const namePattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join("|")})(?![\\p{L}\\p{N}])`, "giu");

  return {
    nameParts,

    find(text) {
      const matches: Match[] = [];

      for (const pattern of PATTERNS) {
        for (const match of text.matchAll(pattern)) {
          matches.push({ start: match.index, end: match.index + match[0].length, namePart: null });
        }
      }

      for (const match of text.matchAll(namePattern)) {
        matches.push({ start: match.index, end: match.index + match[0].length, namePart: normalizeName(match[0]) });
      }

      return matches;
    },
  };
}

/**
 * Strips accents ("Zoë" → "Zoe"), so a name typed without them still matches the resume.
 * The name and every character read from the PDF both go through this.
 */
export function foldAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}

/** Lowercase, no accents, straight apostrophes: "Zoë O’Neil" and "zoe o'neil" compare equal. */
function normalizeName(text: string): string {
  return foldAccents(text).toLocaleLowerCase().replaceAll("’", "'");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
