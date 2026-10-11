// node --conditions=react-server --import tsx --test src/backend/redaction/redaction.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import type { Pixmap, Quad } from "mupdf";

import { makeTextPdf } from "@/backend/db/fake/pdf";

import { createDetector, foldAccents } from "./detect";
import { redactResume } from "./index";

const detector = createDetector("Casey Example");

function matchedText(text: string): string[] {
  const folded = foldAccents(text);
  return detector.find(folded).map(({ start, end }) => folded.slice(start, end));
}

test("recognizes capitalized US city/state labels, including multi-word and punctuated cities", () => {
  for (const label of ["Seattle, WA", "New York, NY", "Salt Lake City, UT", "St. Louis, MO", "Winston-Salem, NC", "Washington, DC", "PORTLAND, OR"]) {
    assert.deepEqual(matchedText(label), [label]);
  }
  assert.deepEqual(matchedText("San José, CA"), ["San Jose, CA"]);
});

test("location boundaries preserve neighboring employers, job titles, and delimiters", () => {
  for (const separator of ["\n", "\r\n", "\t", "  ", " | ", " · ", " • ", ", ", "; ", ": ", " — ", " – ", " - ", " ("]) {
    const text = `Acme Corp${separator}New York, NY`;
    assert.deepEqual(matchedText(text), ["New York, NY"], JSON.stringify(separator));
  }
  assert.deepEqual(matchedText("Software Engineering Intern\nSeattle, WA"), ["Seattle, WA"]);
  assert.deepEqual(matchedText("Seattle, WA | New York, NY"), ["Seattle, WA", "New York, NY"]);
  assert.deepEqual(matchedText("Acme Corp\nNew York, NY\nBuilt reliable systems"), ["New York, NY"]);
});

test("requires a location label and a complete, valid US state abbreviation", () => {
  for (const text of ["Toronto, ON", "London, UK", "Seattle, ZZ", "Seattle, WASHINGTON", "Seattle, WA_2026", "Skills: Python, SQL", "Seattle", "Built systems in Seattle, WA"]) {
    assert.deepEqual(matchedText(text), [], text);
  }
});

test("addresses still match across the preserved line breaks", () => {
  const text = "123 College\nAve, State College, PA 16801";
  const matches = matchedText(text);
  assert.ok(matches.includes("123 College\nAve"));
  assert.ok(matches.includes("State College, PA"));
  assert.ok(matches.includes("PA 16801"));
});

/** Pixel rows inside a source text quad at the pipeline's 2x render scale. */
function pixelRows(pixmap: Pixmap, quad: Quad, insideBar = false): Uint8ClampedArray[] {
  const [left, top, right, , , bottom] = quad;
  // Sample well inside the bar, not the font's larger ascender/descender box.
  const x0 = insideBar ? Math.ceil(left * 2) + 2 : Math.floor(left * 2);
  const x1 = insideBar ? Math.floor(right * 2) - 2 : Math.ceil(right * 2);
  const y0 = Math.floor((insideBar ? top + (bottom - top) * 0.4 : top) * 2);
  const y1 = Math.ceil((insideBar ? top + (bottom - top) * 0.7 : bottom) * 2);
  const stride = pixmap.getStride();
  const channels = pixmap.getNumberOfComponents();
  const pixels = pixmap.getPixels();

  assert.ok(x1 > x0 && y1 > y0);
  return Array.from({ length: y1 - y0 }, (_, row) =>
    pixels.slice((y0 + row) * stride + x0 * channels, (y0 + row) * stride + x1 * channels),
  );
}

test("rendered previews hide locations without changing adjacent text in tight rows and columns", async () => {
  const mupdf = await import("mupdf");
  // The existing helper uses 12 pt Helvetica with 16 pt leading; adjacent glyph boxes nearly touch.
  const pdf = makeTextPdf([
    "Casey Example",
    "casey@example.com",
    "Acme Corp",
    "New York, NY",
    "Software Engineering Intern | Seattle, WA",
    "Built reliable systems and reduced latency by 30%.",
    "Vanguard                Salt Lake City, UT",
    "Skills: Python, React, PostgreSQL",
    "123 College",
    "Ave, State College, PA 16801",
    "Available for internships",
  ]);
  const source = mupdf.Document.openDocument(pdf, "application/pdf");
  const page = source.loadPage(0);
  const original = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, false);
  const [png] = await redactResume(pdf, { name: "Casey Example" });
  assert.deepEqual([...png.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const image = new mupdf.Image(png);
  const preview = image.toPixmap();

  try {
    assert.equal(preview.getWidth(), original.getWidth());
    assert.equal(preview.getHeight(), original.getHeight());

    for (const text of ["Acme Corp", "Software Engineering Intern", "Built reliable systems and reduced latency by 30%.", "Vanguard", "Skills: Python, React, PostgreSQL", "Available for internships"]) {
      const hits = page.search(text, {});
      assert.equal(hits.length, 1, `Missing source text: ${text}`);
      for (const quad of hits[0]) {
        assert.deepEqual(pixelRows(preview, quad), pixelRows(original, quad), `Changed retained text: ${text}`);
      }
    }

    for (const text of ["casey@example.com", "New York, NY", "Seattle, WA", "Salt Lake City, UT", "State College, PA", "123 College", "Ave"]) {
      const hits = page.search(text, {});
      assert.equal(hits.length, 1, `Missing source text: ${text}`);
      for (const quad of hits[0]) {
        assert.ok(pixelRows(preview, quad, true).every((row) => row.every((channel) => channel === 0)), `Missing redaction bar: ${text}`);
      }
    }
  } finally {
    preview.destroy();
    image.destroy();
    original.destroy();
    page.destroy();
    source.destroy();
  }
});
