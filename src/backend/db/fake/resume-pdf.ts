import { fakeResumeContent, type FakeResume } from "./resume-content";

/** Used to distinguish our generated sources from uploads during explicitly requested refreshes. */
export const SYNTHETIC_LABEL = "SYNTHETIC DEMO RESUME";
/** Bump when layout/content changes; a refresh leaves already-current generated PDFs alone. */
export const TEMPLATE_VERSION = "Roster synthetic source v2";

const SCHOOL_LOCATIONS: Record<string, string> = {
  "Pennsylvania State University": "University Park, PA",
  "University of Pittsburgh": "Pittsburgh, PA",
  "Carnegie Mellon University": "Pittsburgh, PA",
};

/**
 * Jake's resume-style layout: centered serif header, thin section rules, paired title/date
 * rows, italic subrows, and indented bullets. Drawn directly with the existing MuPDF package,
 * so generating fixtures requires no LaTeX installation or new runtime dependency.
 * Layout reference: https://github.com/jakegut/resume/blob/master/resume.tex
 */
export async function renderFakeResumePdf(student: FakeResume): Promise<Uint8Array> {
  const content = fakeResumeContent(student);
  const location = SCHOOL_LOCATIONS[student.school];
  if (!location) throw new Error(`No sample school location defined for ${student.school}.`);

  const mupdf = await import("mupdf");
  const document = new mupdf.PDFDocument();
  const fonts = {
    regular: new mupdf.Font("Times-Roman"),
    bold: new mupdf.Font("Times-Bold"),
    italic: new mupdf.Font("Times-Italic"),
  };
  type Face = keyof typeof fonts;
  const fontKeys: Record<Face, string> = { regular: "F1", bold: "F2", italic: "F3" };
  const left = 42;
  const right = 570;
  const commands: string[] = [];
  let y = 744;

  function width(text: string, face: Face, size: number): number {
    return [...text].reduce((sum, char) => sum + fonts[face].advanceGlyph(fonts[face].encodeCharacter(char)) * size, 0);
  }

  function draw(text: string, x: number, baseline: number, face: Face = "regular", size = 10.5) {
    if (/[^\x20-\x7e]/.test(text)) throw new Error("Synthetic PDF text must be printable ASCII.");
    if (x < left || x + width(text, face, size) > right + 0.1) throw new Error(`Synthetic text exceeds horizontal margins: ${text}`);
    const escaped = text.replace(/[\\()]/g, (char) => `\\${char}`);
    commands.push(`BT /${fontKeys[face]} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm (${escaped}) Tj ET`);
  }

  function wrap(text: string, available: number, face: Face = "regular", size = 10.5): string[] {
    const lines = [""];
    for (const word of text.split(" ")) {
      if (width(word, face, size) > available) throw new Error(`Unwrappable synthetic text: ${word}`);
      const last = lines.length - 1;
      const candidate = `${lines[last]}${lines[last] ? " " : ""}${word}`;
      if (width(candidate, face, size) > available) lines.push(word);
      else lines[last] = candidate;
    }
    return lines;
  }

  function paragraph(text: string, x = left, face: Face = "regular", size = 10.5) {
    for (const line of wrap(text, right - x, face, size)) {
      draw(line, x, y, face, size);
      y -= 13;
    }
  }

  function section(title: string) {
    y -= 7;
    draw(title, left, y, "regular", 12.5);
    commands.push(`0.45 w ${left} ${y - 4} m ${right} ${y - 4} l S`);
    y -= 20;
  }

  function pair(title: string, detail: string, face: Face) {
    const detailWidth = width(detail, "regular", 10.5);
    const baseline = y;
    for (const line of wrap(title, right - left - detailWidth - 16, face)) {
      draw(line, left, y, face);
      y -= 13;
    }
    draw(detail, right - detailWidth, baseline);
  }

  function bullet(text: string) {
    // A small filled square remains crisp when the source page is rasterized for redaction.
    commands.push(`${left + 7} ${y + 2} 2 2 re f`);
    paragraph(text, left + 18);
    y -= 2;
  }

  try {
    draw(student.name, (612 - width(student.name, "bold", 27)) / 2, y, "bold", 27);
    y -= 20;
    const contact = `${content.phone} | ${student.email} | ${content.portfolio}`;
    draw(contact, (612 - width(contact, "regular", 9.5)) / 2, y, "regular", 9.5);
    y -= 13;

    section("EDUCATION");
    pair(student.school, location, "bold");
    pair(content.degree, content.educationDates, "italic");
    paragraph(`Relevant coursework: ${content.courses}`);

    section("EXPERIENCE");
    for (const job of content.experience) {
      pair(job.title, job.dates, "bold");
      pair(job.org, job.location, "italic");
      for (const text of job.bullets) bullet(text);
      y -= 5;
    }

    section("PROJECTS");
    for (const project of content.projects) {
      pair(project.name, project.dates, "bold");
      paragraph(project.tools, left, "italic");
      for (const text of project.bullets) bullet(text);
      y -= 5;
    }

    section("TECHNICAL SKILLS");
    paragraph(student.profile.skills.join(", "));
    if (y < 55) throw new Error("Synthetic resume exceeds one page; shorten the fictional content.");

    // Keep invented candidates unmistakably labeled, without overwhelming the source layout.
    commands.push("0.4 g");
    const footer = `${SYNTHETIC_LABEL} - fictional education, experience, and projects`;
    draw(footer, (612 - width(footer, "regular", 7.5)) / 2, 29, "regular", 7.5);
    commands.push("0 g");

    document.setMetaData("info:Creator", TEMPLATE_VERSION);
    const resources = { Font: {
      F1: document.addSimpleFont(fonts.regular, "Latin"),
      F2: document.addSimpleFont(fonts.bold, "Latin"),
      F3: document.addSimpleFont(fonts.italic, "Latin"),
    } };
    const page = document.addPage([0, 0, 612, 792], 0, resources, commands.join("\n"));
    Object.values(resources.Font).forEach((font) => font.destroy());
    document.insertPage(-1, page);
    page.destroy();
    const buffer = document.saveToBuffer("compress");
    try {
      return new Uint8Array(buffer.asUint8Array());
    } finally {
      buffer.destroy();
    }
  } finally {
    Object.values(fonts).forEach((font) => font.destroy());
    document.destroy();
  }
}
