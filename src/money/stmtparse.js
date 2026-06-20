import workerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import { parseStatement } from "./stmtparse.core.js";

export { parseStatement } from "./stmtparse.core.js";

// Extract rows from a PDF, keeping each text item's x-position so the parser
// can read the Withdrawal / Deposit / Balance columns.
export async function extractRows(file, password) {
  const mod = await import("pdfjs-dist");
  const pdfjs = mod.getDocument ? mod : mod.default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, password }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const byY = {};
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 2) * 2;
      (byY[y] = byY[y] || []).push({ x: it.transform[4], s: it.str });
    }
    Object.keys(byY).map(Number).sort((a, b) => b - a).forEach((y) => {
      const tokens = byY[y].sort((a, b) => a.x - b.x);
      const text = tokens.map((t) => t.s).join(" ").replace(/\s+/g, " ").trim();
      if (text) out.push({ text, tokens });
    });
  }
  if (doc.destroy) doc.destroy();
  return out;
}

export async function parsePdf(file, password) {
  const rows = await extractRows(file, password);
  const { txns, opening } = parseStatement(rows);
  const textFound = rows.reduce((n, r) => n + r.text.length, 0);
  return { txns, opening, rowCount: rows.length, textFound };
}
