import "server-only";

import type { Document, PDFDocument, PDFPage, Point, Quad, Rect } from "mupdf";

import { UserError } from "@/backend/errors";

import { foldAccents, type Detector } from "./detect";

type Mupdf = typeof import("mupdf");

const MAX_PAGES = 3;

/** Rendered pixels per PDF point: a US Letter page becomes 1224 × 1584. */
const RENDER_SCALE = 2;

/**
 * How far a bar reaches above and below the baseline, in multiples of the font size: from
 * cap height to the middle of the descenders.
 *
 * Bars can't simply cover each glyph's box. `applyRedactions` removes every glyph whose box
 * touches a bar, and with tight line spacing those boxes overlap the lines above and below,
 * so a full-height bar would also delete text from the neighboring lines.
 */
const BAR_ABOVE_BASELINE = 0.75;
const BAR_BELOW_BASELINE = 0.15;

/**
 * One block of text (roughly a paragraph) with its lines joined by spaces, so a pattern can
 * match an address that wraps. `glyphs[i]` says where `text[i]` (a UTF-16 unit) is drawn,
 * or is `null` for the spaces added between lines.
 */
type Block = { text: string; glyphs: (Glyph | null)[] };

/** Where a character is drawn, and which line of its block it's on. */
type Glyph = { quad: Quad; baseline: number; size: number; line: number };

/**
 * Removes everything `detector` finds, plus all linked text and every image, and renders
 * each page to PNG. See `redactResume` for the contract.
 */
export async function redactPdf(pdf: Uint8Array, detector: Detector): Promise<Uint8Array[]> {
  // mupdf is ESM with top-level await, which CommonJS can't `require` (tsx runs this repo's
  // .ts files as CommonJS). A dynamic import works everywhere, and it defers compiling
  // mupdf's ~10 MB of WebAssembly until a resume is actually redacted.
  const mupdf = await import("mupdf");
  const document = openPdf(mupdf, pdf);

  try {
    const pages = Array.from({ length: document.countPages() }, (_, index) => document.loadPage(index));
    if (pages.length > MAX_PAGES) throw new UserError(`Resumes can be at most ${MAX_PAGES} pages.`);

    // Find everything first: the name check below needs every page before anything is changed.
    const foundNameParts = new Set<string>();
    let characterCount = 0;

    const plans = pages.map((page) => {
      const { blocks, images } = readPage(page);
      const links = page.getLinks().map((link) => link.getBounds());
      const bars: Rect[] = [];

      for (const block of blocks) {
        characterCount += block.text.length;
        const hidden = block.glyphs.map(() => false);

        for (const match of detector.find(block.text)) {
          hidden.fill(true, match.start, match.end);
          if (match.namePart) foundNameParts.add(match.namePart);
        }

        // Linked text usually points at a profile or personal site, whatever it says.
        block.glyphs.forEach((glyph, index) => {
          if (glyph && links.some((link) => contains(link, center(glyph.quad)))) hidden[index] = true;
        });

        bars.push(...barsOverHiddenText(block.glyphs, hidden));
      }

      return { images, bars };
    });

    if (characterCount === 0) {
      throw new UserError("We can't read the text in this PDF. Export it from Word or Google Docs instead of scanning it.");
    }

    // A name we can't find is usually drawn as shapes or typed differently on the form.
    // Either way it would stay visible, so refuse rather than publish it.
    const missing = detector.nameParts.filter((part) => !foundNameParts.has(part));
    if (missing.length > 0) {
      throw new UserError(`We couldn't find "${missing.join(" ")}" on your resume. Enter your name exactly as it's written there.`);
    }

    return pages.map((page, index) => {
      const { images, bars } = plans[index];

      // Images (headshots, logos) are deleted outright, without a box and without touching
      // text: a template's background image can sit under the whole page.
      if (images.length > 0) {
        for (const image of images) page.createAnnotation("Redact").setRect(image);
        page.applyRedactions(false, mupdf.PDFPage.REDACT_IMAGE_REMOVE, mupdf.PDFPage.REDACT_LINE_ART_NONE, mupdf.PDFPage.REDACT_TEXT_NONE);
      }

      if (bars.length > 0) {
        for (const bar of bars) page.createAnnotation("Redact").setRect(bar);
        page.applyRedactions(true, mupdf.PDFPage.REDACT_IMAGE_NONE, mupdf.PDFPage.REDACT_LINE_ART_NONE, mupdf.PDFPage.REDACT_TEXT_REMOVE);
      }

      assertNothingLeft(page, detector, index);

      // showExtras = false leaves out annotations and form fields, which can hold text of their own.
      const pixmap = page.toPixmap(mupdf.Matrix.scale(RENDER_SCALE, RENDER_SCALE), mupdf.ColorSpace.DeviceRGB, false, false);
      const png = pixmap.asPNG();
      pixmap.destroy();

      return png;
    });
  } finally {
    // mupdf lives in WebAssembly memory, which the JS garbage collector doesn't feel.
    document.destroy();
  }
}

function openPdf(mupdf: Mupdf, pdf: Uint8Array): PDFDocument {
  let document: Document;

  try {
    document = mupdf.Document.openDocument(pdf, "application/pdf");
  } catch {
    throw new UserError("That file isn't a readable PDF.");
  }

  const asPdf = document.asPDF();
  if (!asPdf) throw new UserError("That file isn't a readable PDF.");
  if (asPdf.needsPassword()) throw new UserError("Remove the password from this PDF and upload it again.");

  return asPdf;
}

/** The page's text blocks, with accents folded for the detector, and the boxes of its images. */
function readPage(page: PDFPage): { blocks: Block[]; images: Rect[] } {
  const text = page.toStructuredText("preserve-images");
  const blocks: Block[] = [];
  const images: Rect[] = [];

  let block: Block = { text: "", glyphs: [] };
  let line = -1;

  text.walk({
    onImageBlock(bbox) {
      images.push(bbox);
    },
    beginTextBlock() {
      block = { text: "", glyphs: [] };
      line = -1;
    },
    beginLine() {
      line += 1;

      if (block.text.length > 0) {
        block.text += " ";
        block.glyphs.push(null);
      }
    },
    onChar(char, origin, _font, size, quad) {
      const folded = foldAccents(char);
      const glyph = { quad, baseline: origin[1], size, line };
      block.text += folded;

      // Every UTF-16 unit the character became maps back to the same glyph.
      for (let unit = 0; unit < folded.length; unit++) block.glyphs.push(glyph);
    },
    endTextBlock() {
      blocks.push(block);
    },
  });

  text.destroy();
  return { blocks, images };
}

/** One bar per unbroken run of hidden glyphs on a line. */
function barsOverHiddenText(glyphs: (Glyph | null)[], hidden: boolean[]): Rect[] {
  const runs: Glyph[][] = [];
  let run: Glyph[] = [];

  glyphs.forEach((glyph, index) => {
    const extendsRun = glyph && hidden[index] && (run.length === 0 || run[0].line === glyph.line);
    if (!extendsRun && run.length > 0) {
      runs.push(run);
      run = [];
    }

    if (glyph && hidden[index]) run.push(glyph);
  });

  if (run.length > 0) runs.push(run);

  return runs.map((glyphs) => [
    Math.min(...glyphs.map(({ quad }) => Math.min(quad[0], quad[4]))),
    Math.min(...glyphs.map(({ baseline, size }) => baseline - BAR_ABOVE_BASELINE * size)),
    Math.max(...glyphs.map(({ quad }) => Math.max(quad[2], quad[6]))),
    Math.max(...glyphs.map(({ baseline, size }) => baseline + BAR_BELOW_BASELINE * size)),
  ]);
}

/**
 * The redaction step is trusted only after this check: read the page back and confirm no
 * pattern matches anymore. Fails loudly, because a leak is our bug, not the student's.
 */
function assertNothingLeft(page: PDFPage, detector: Detector, pageIndex: number) {
  const leaked = readPage(page).blocks.some((block) => detector.find(block.text).length > 0);
  if (leaked) throw new Error(`Redaction left identifying text on page ${pageIndex + 1}.`);
}

function center(quad: Quad): Point {
  return [(quad[0] + quad[2] + quad[4] + quad[6]) / 4, (quad[1] + quad[3] + quad[5] + quad[7]) / 4];
}

function contains([x0, y0, x1, y1]: Rect, [x, y]: Point): boolean {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}
