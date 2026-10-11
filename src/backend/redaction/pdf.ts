import "server-only";

import type { Document, PDFDocument, PDFPage, Quad, Rect } from "mupdf";

import { UserError } from "@/backend/errors";

import { foldAccents, type Detector } from "./detect";

type Mupdf = typeof import("mupdf");

const MAX_PAGES = 3;

/** Rendered pixels per PDF point: a US Letter page becomes 1224 × 1584. */
const RENDER_SCALE = 2;

/** Grows each box past the glyph outlines, so no ascender or descender peeks out. */
const PADDING = 1;

/**
 * One block of text (roughly a paragraph) with its lines joined by spaces, so a pattern can
 * match an address that wraps. `glyphs[i]` says where `text[i]` (a UTF-16 unit) is drawn,
 * or is `null` for the spaces added between lines.
 */
type Block = { text: string; glyphs: (Glyph | null)[] };

/** A character's box, and which line of its block it's on. */
type Glyph = { quad: Quad; line: number };

/**
 * Blacks out everything `detector` finds, plus every link and image, and renders each page
 * to PNG. See `redactResume` for the contract.
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

    const boxesByPage = pages.map((page) => {
      const { blocks, images } = readPage(page);
      const boxes = [...images, ...page.getLinks().map((link) => link.getBounds())];

      for (const block of blocks) {
        characterCount += block.text.length;

        for (const match of detector.find(block.text)) {
          boxes.push(...boxesPerLine(block.glyphs.slice(match.start, match.end)));
          if (match.namePart) foundNameParts.add(match.namePart);
        }
      }

      return boxes;
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
      for (const box of boxesByPage[index]) {
        page.createAnnotation("Redact").setRect(pad(box));
      }

      page.applyRedactions(
        true, // draw black boxes
        mupdf.PDFPage.REDACT_IMAGE_PIXELS,
        mupdf.PDFPage.REDACT_LINE_ART_NONE,
        mupdf.PDFPage.REDACT_TEXT_REMOVE,
      );

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
    onChar(char, _origin, _font, _size, quad) {
      const folded = foldAccents(char);
      block.text += folded;

      // Every UTF-16 unit the character became maps back to the character's box.
      for (let unit = 0; unit < folded.length; unit++) block.glyphs.push({ quad, line });
    },
    endTextBlock() {
      blocks.push(block);
    },
  });

  text.destroy();
  return { blocks, images };
}

/**
 * One box per line a match touches. A single box around a match that wraps would cover
 * both lines from edge to edge.
 */
function boxesPerLine(glyphs: (Glyph | null)[]): Rect[] {
  const quadsByLine = new Map<number, Quad[]>();

  for (const glyph of glyphs) {
    if (!glyph) continue;
    quadsByLine.set(glyph.line, [...(quadsByLine.get(glyph.line) ?? []), glyph.quad]);
  }

  return [...quadsByLine.values()].map(boundingBox);
}

/**
 * The redaction step is trusted only after this check: read the page back and confirm no
 * pattern matches anymore. Fails loudly, because a leak is our bug, not the student's.
 */
function assertNothingLeft(page: PDFPage, detector: Detector, pageIndex: number) {
  const leaked = readPage(page).blocks.some((block) => detector.find(block.text).length > 0);
  if (leaked) throw new Error(`Redaction left identifying text on page ${pageIndex + 1}.`);
}

/** The smallest rectangle around every corner of every quad. */
function boundingBox(quads: Quad[]): Rect {
  const xs = quads.flatMap((quad) => [quad[0], quad[2], quad[4], quad[6]]);
  const ys = quads.flatMap((quad) => [quad[1], quad[3], quad[5], quad[7]]);

  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function pad([x0, y0, x1, y1]: Rect): Rect {
  return [x0 - PADDING, y0 - PADDING, x1 + PADDING, y1 + PADDING];
}
