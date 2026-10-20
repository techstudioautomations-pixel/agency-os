import { docxXml, splitIdeas } from "./logic";

/** One paragraph of a document, with what Word knew about it. */
export type Block = {
  text: string;
  style: string;
  list: boolean;
  /** Highlight and shading colours on the visible words. */
  colors: string[];
  /** Set when the paragraph sits inside a table cell. */
  cell?: { table: number; row: number; col: number };
};

export type ColorKind = "yellow" | "blue" | "red" | "green" | "other";
export type ResearchDecision = "New" | "Approved" | "Rejected" | "Done";
export type ParsedIdea = {
  title: string;
  /** The topic and why it matters. */
  notes: string;
  /** The drafted wording to start the caption from. */
  angle: string;
  format: string;
  decision: ResearchDecision;
  /** Where in the document it came from, for example "Priority 1". */
  group: string;
  /** The decision came from a highlight colour in the document. */
  coloured: boolean;
};
export type Research = {
  /** Facts about the business: target, offer, positioning and so on. */
  facts: { label: string; value: string }[];
  ctas: { text: string; group: string }[];
  /** What the content is for. */
  brief: string;
  ideas: ParsedIdea[];
  /** What each highlight colour meant in this document. */
  legend: Partial<Record<ColorKind, string>>;
};

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const kids = (parent: Element | null | undefined, name: string) => (parent ? Array.from(parent.children).filter((el) => el.localName === name) : []);
const first = (parent: Element | null | undefined, name: string) => kids(parent, name)[0];
const clean = (value: string) => value.replace(/[ ​]/g, " ").replace(/[ \t]+/g, " ").trim();

/** Turns a Word document into plain paragraphs, keeping lists, tables and highlight colours. */
export function blocksFromXml(xml: string): Block[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  const out: Block[] = [];
  let tables = -1;

  const paragraph = (p: Element, cell?: Block["cell"]) => {
    const pPr = first(p, "pPr");
    const colors = new Set<string>();
    let text = "";
    for (const run of Array.from(p.getElementsByTagNameNS(W, "r"))) {
      const rPr = first(run, "rPr");
      let piece = "";
      for (const node of Array.from(run.children)) {
        if (node.localName === "t") piece += node.textContent ?? "";
        else if (node.localName === "tab") piece += " ";
        else if (node.localName === "br") piece += "\n";
      }
      if (piece.trim()) {
        const highlight = first(rPr, "highlight")?.getAttributeNS(W, "val");
        const fill = first(rPr, "shd")?.getAttributeNS(W, "fill");
        if (highlight && highlight !== "none") colors.add(highlight);
        if (fill && fill !== "auto") colors.add(fill);
      }
      text += piece;
    }
    const paragraphFill = first(pPr, "shd")?.getAttributeNS(W, "fill");
    if (paragraphFill && paragraphFill !== "auto" && text.trim()) colors.add(paragraphFill);
    const value = clean(text);
    if (!value) return;
    out.push({ text: value, style: first(pPr, "pStyle")?.getAttributeNS(W, "val") ?? "", list: Boolean(first(pPr, "numPr")), colors: [...colors], cell });
  };

  const walk = (container: Element) => {
    for (const node of Array.from(container.children)) {
      if (node.localName === "p") paragraph(node);
      else if (node.localName === "tbl") {
        tables += 1;
        kids(node, "tr").forEach((tr, row) => kids(tr, "tc").forEach((tc, col) => kids(tc, "p").forEach((p) => paragraph(p, { table: tables, row, col }))));
      } else if (node.localName === "sdt") {
        const content = first(node, "sdtContent");
        if (content) walk(content);
      }
    }
  };
  if (body) walk(body);
  return out;
}

/** Plain text, one block per line. Bullets and numbers mark list items. */
export function blocksFromText(text: string): Block[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => ({ raw: line, text: clean(line.replace(/^\s*(?:[-•*▪●]|\d{1,2}[.)])\s+/, "")) }))
    .filter((item) => item.text)
    .map((item) => ({ text: item.text, style: "", list: /^\s*(?:[-•*▪●]|\d{1,2}[.)])\s+/.test(item.raw), colors: [] }));
}

/** Reads a pasted or typed text. There are no styles or colours, so structure is guessed from the wording. */
export function researchFromText(text: string): Research {
  return parseResearch(blocksFromText(text), true);
}

/** Reads an uploaded file: Word keeps its lists, tables and highlight colours; text files are guessed from the wording. */
export async function researchFromFile(file: File): Promise<Research> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) throw new Error("PDF files cannot be read yet. Save it as a Word document (.docx), or paste the text.");
  if (name.endsWith(".docx")) return parseResearch(blocksFromXml(await docxXml(file)));
  return researchFromText(await file.text());
}

/** Which family a highlight or shading colour belongs to. */
export function colorKind(value: string): ColorKind {
  const v = value.toLowerCase();
  const named: Record<string, ColorKind> = { yellow: "yellow", darkyellow: "yellow", green: "green", darkgreen: "green", cyan: "blue", darkcyan: "blue", blue: "blue", darkblue: "blue", red: "red", darkred: "red" };
  if (named[v]) return named[v];
  const hex = v.replace("#", "").match(/^([0-9a-f]{6})$/);
  if (!hex) return "other";
  const r = parseInt(hex[1].slice(0, 2), 16) / 255;
  const g = parseInt(hex[1].slice(2, 4), 16) / 255;
  const b = parseInt(hex[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  const d = max - min;
  if (d < 0.08 || light > 0.97) return "other";
  const sat = d / (1 - Math.abs(2 * light - 1));
  if (sat < 0.25) return "other";
  let hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue >= 340 || hue < 20) return "red";
  if (hue >= 40 && hue < 70) return "yellow";
  if (hue >= 80 && hue < 170) return "green";
  if (hue >= 180 && hue < 260) return "blue";
  return "other";
}

const emojiColor: Record<string, ColorKind> = { "🟨": "yellow", "🟦": "blue", "🟥": "red", "🟩": "green" };
type Meaning = { decision: ResearchDecision; format?: string };
const defaultMeaning: Record<ColorKind, Meaning | undefined> = {
  yellow: { decision: "Approved", format: "Carousel" },
  blue: { decision: "Approved", format: "Text post" },
  red: { decision: "Rejected" },
  green: { decision: "Done" },
  other: undefined,
};

const formatOf = (text: string) => {
  if (/carousel/i.test(text)) return "Carousel";
  if (/\b(reel|video|tiktok)\b/i.test(text)) return "Reel";
  if (/newsletter/i.test(text)) return "Newsletter";
  if (/text post|text only/i.test(text)) return "Text post";
  if (/single image|static/i.test(text)) return "Single image";
  return undefined;
};

const unquote = (value: string) => value.replace(/^[“"'‘”]+/, "").replace(/[”"'’“]+$/, "").trim();
const factPattern = /^([^:：]{2,40}?)\s*[:：]\s*(.{2,})$/;

/** Reads a research document and sorts it: facts about the business, calls to action, the brief, and ideas. */
export function parseResearch(blocks: Block[], plain = false): Research {
  const facts: Research["facts"] = [];
  const ctas: Research["ctas"] = [];
  const ideas: ParsedIdea[] = [];
  const legend: Research["legend"] = {};
  const meaning: Record<ColorKind, Meaning | undefined> = { ...defaultMeaning };
  let brief = "";
  let section: "start" | "profile" | "cta" | "brief" | "ideas" = "start";
  let group = "";
  let hadTable = false;
  let lastWasFact = false;
  const rows = new Map<string, { group: string; cells: string[] }>();
  const closing: string[] = [];
  const plainRows: { title: string; notes: string; group: string }[] = [];

  let current: { title: string; colors: string[]; topic: string; description: string[]; angle: string[]; seenAngle: boolean } | null = null;
  const finishIdea = () => {
    if (!current) return;
    const kinds = new Set(current.colors.map(colorKind));
    const notes = [current.topic, ...current.description].filter(Boolean).join("\n\n");
    const angle = current.angle.map(unquote).filter(Boolean).join("\n\n");
    let decision: ResearchDecision = "New";
    let format = formatOf(`${current.title} ${notes}`) ?? "Carousel";
    const marks = (["green", "red", "yellow", "blue"] as ColorKind[]).filter((kind) => kinds.has(kind));
    if (marks.length) {
      const pick = marks.includes("green") ? "green" : marks.includes("red") ? "red" : marks[0];
      decision = meaning[pick]?.decision ?? "New";
      const shaped = marks.map((kind) => meaning[kind]?.format).find(Boolean);
      if (shaped) format = shaped;
    }
    if (current.title && (notes || angle || decision !== "New")) ideas.push({ title: current.title, notes, angle, format, decision, group: "", coloured: marks.length > 0 });
    current = null;
  };

  for (const [index, block] of blocks.entries()) {
    const text = block.text;
    const lower = text.toLowerCase();

    // Table rows are collected and read once the table is complete.
    if (block.cell) {
      hadTable = true;
      const key = `${block.cell.table}:${block.cell.row}`;
      const row = rows.get(key) ?? { group, cells: [] };
      row.cells[block.cell.col] = [row.cells[block.cell.col], text].filter(Boolean).join("\n");
      rows.set(key, row);
      continue;
    }

    // A "Label : value" line near the top is a fact, even if the label mentions a CTA.
    const looksLikeFact = (section === "start" || section === "profile") && factPattern.test(text);
    const short = text.length < 140 && !block.list && !looksLikeFact;
    if (short && /\bcta\b|call[- ]to[- ]action/i.test(text)) { finishIdea(); section = "cta"; continue; }
    if (short && /content (angle )?brief|campaign brief/i.test(text)) { finishIdea(); section = "brief"; continue; }
    if (short && /^priority\s*\d/i.test(text)) { finishIdea(); section = "brief"; group = text.replace(/\s*[-–—]\s*/, " · "); continue; }
    if (short && (/ideas? ready for review|ideas for review/i.test(text) || /^content ideas\b/i.test(text))) { finishIdea(); section = "ideas"; group = ""; continue; }
    if (section === "start" && short && /direction|profile|positioning|strategy|about (the )?(client|business)/i.test(text)) { section = "profile"; continue; }

    if (section === "start" || section === "profile") {
      const match = block.list || plain ? text.match(factPattern) : null;
      if (match) { facts.push({ label: clean(match[1]), value: clean(match[2]) }); lastWasFact = true; section = "profile"; continue; }
      if (!block.list && lastWasFact && facts.length && text.length < 400) { facts[facts.length - 1].value += ` ${text}`; continue; }
      lastWasFact = false;
      continue;
    }

    if (section === "cta") {
      if (block.list || (plain && text.length < 400)) ctas.push({ text, group: "Calls to action" });
      continue;
    }

    if (section === "brief") {
      if (plain) {
        if (/^(content idea|main angle)/i.test(text)) continue;
        if (block.list) { plainRows.push({ title: text, notes: "", group }); continue; }
        const last = plainRows[plainRows.length - 1];
        if (last && !last.notes && !hadTable) { last.notes = text; continue; }
        if (plainRows.length && text.length > 25) { closing.push(text); continue; }
      }
      if (!brief && !block.list && text.length > 60 && !/^priority/i.test(text) && !hadTable) brief = text;
      else if (hadTable && !block.list && text.length > 25) closing.push(text);
      continue;
    }

    if (section === "ideas") {
      if (/^please\b/i.test(text)) continue;
      const mark = Array.from(text).find((char) => emojiColor[char]);
      if (mark && (block.list || plain)) {
        const kind = emojiColor[mark];
        const rest = text.split(/[:：]/).slice(1).join(":") || text;
        legend[kind] = clean(rest);
        const decision: ResearchDecision | undefined = /not relevant|remove|reject/i.test(rest) ? "Rejected" : /already|scheduled|created|done|published/i.test(rest) ? "Done" : formatOf(rest) ? "Approved" : undefined;
        if (decision) meaning[kind] = { decision, format: formatOf(rest) };
        continue;
      }
      const isTitle = block.list || (plain && /^topic\s*[:：]/i.test(blocks[index + 1]?.text ?? "") && !/^(topic|content angle)\s*[:：]/i.test(text));
      if (isTitle) { finishIdea(); current = { title: text, colors: block.colors, topic: "", description: [], angle: [], seenAngle: false }; continue; }
      if (!current) continue;
      const topic = text.match(/^topic\s*[:：]\s*(.*)$/i);
      const angle = text.match(/^content angle\s*[:：]\s*(.*)$/i);
      if (topic) { if (topic[1].trim()) current.topic = topic[1].trim(); continue; }
      if (angle) { current.seenAngle = true; if (unquote(angle[1])) current.angle.push(angle[1].trim()); continue; }
      if (current.seenAngle) { if (unquote(text)) current.angle.push(text); } else current.description.push(text);
    }
  }
  finishIdea();

  // Ideas that were listed in a table, such as "Priority 1" and "Priority 2".
  const fromTables: ParsedIdea[] = [];
  for (const row of rows.values()) {
    const [title, angle] = row.cells;
    if (!title || /content idea|key question|main angle/i.test(title)) continue;
    if (!/^\d+[.)]\s/.test(title) && !angle) continue;
    const name = title.replace(/^\d+[.)]\s*/, "").replace(/\s+/g, " ").trim();
    fromTables.push({ title: name, notes: angle ?? "", angle: "", format: formatOf(`${name} ${angle ?? ""}`) ?? "Carousel", decision: "New", group: row.group, coloured: false });
  }

  for (const row of plainRows) fromTables.push({ title: row.title.replace(/\s+/g, " ").trim(), notes: row.notes, angle: "", format: formatOf(`${row.title} ${row.notes}`) ?? "Carousel", decision: "New", group: row.group, coloured: false });

  if (closing.length) for (const line of closing) ctas.push({ text: line, group: "Closing lines" });

  const all = [...fromTables, ...ideas];
  const seen = new Set<string>();
  const unique = all.filter((idea) => { const key = idea.title.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });

  // A document that is only a list of ideas, with none of the sections above.
  if (unique.length === 0 && facts.length === 0 && ctas.length === 0) {
    const plain = blocks.map((block) => `${block.list ? "- " : ""}${block.text}`).join("\n");
    for (const item of splitIdeas(plain)) unique.push({ title: item.title, notes: item.notes, angle: "", format: item.format, decision: "New", group: "", coloured: false });
  }
  return { facts, ctas, brief, ideas: unique, legend };
}
