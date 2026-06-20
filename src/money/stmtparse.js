import workerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import { parseStatement } from "./stmtparse.core.js";

export { parseStatement } from "./stmtparse.core.js";

// Extract visual lines from a PDF (groups text items by y-position).
export async function extractLines(file, password) {
  const mod = await import("pdfjs-dist");
  const pdfjs = mod.getDocument ? mod : mod.default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, password }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const rows = {};
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 2) * 2;
      (rows[y] = rows[y] || []).push({ x: it.transform[4], s: it.str });
    }
    Object.keys(rows).map(Number).sort((a, b) => b - a).forEach((y) => {
      const line = rows[y].sort((a, b) => a.x - b.x).map((o) => o.s).join(" ").replace(/\s+/g, " ").trim();
      if (line) lines.push(line);
    });
  }
  if (doc.destroy) doc.destroy();
  return lines;
}

export async function parsePdf(file, password) {
  const lines = await extractLines(file, password);
  const txns = parseStatement(lines);
  return { txns, lineCount: lines.length, textFound: lines.join("").length };
}
