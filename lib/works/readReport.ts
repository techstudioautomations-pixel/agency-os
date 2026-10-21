import { docxText, zipEntry } from "./logic";
import { pdfText } from "./pdf";

const decode = (text: string) => text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const cellText = (xml: string) => decode([...xml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((match) => match[1]).join(""));

/** The cells of a spreadsheet, one line per row, so "Followers" and its number end up on the same line. */
async function xlsxText(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const shared = await zipEntry(buffer, "xl/sharedStrings.xml");
  const strings = shared ? [...new TextDecoder().decode(shared).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => cellText(match[1])) : [];
  const lines: string[] = [];
  for (let sheet = 1; sheet <= 6; sheet++) {
    const data = await zipEntry(buffer, `xl/worksheets/sheet${sheet}.xml`);
    if (!data) break;
    for (const row of new TextDecoder().decode(data).matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = [...row[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map((cell) => {
        const body = cell[2] ?? "";
        const value = /<v>([^<]*)<\/v>/.exec(body)?.[1] ?? "";
        if (/t="s"/.test(cell[1])) return strings[Number(value)] ?? "";
        if (/t="inlineStr"/.test(cell[1])) return cellText(body);
        return decode(value);
      });
      const line = cells.filter((cell) => cell !== "").join(" ");
      if (line) lines.push(line);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** The text inside an uploaded report, if it is a kind we can read. */
export async function reportText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return pdfText(await file.arrayBuffer());
  if (name.endsWith(".docx")) return docxText(file);
  if (name.endsWith(".xlsx")) return xlsxText(file);
  if (file.type.startsWith("text/") || /\.(txt|csv|tsv|md)$/.test(name)) return file.text();
  if (file.type.startsWith("image/")) throw new Error("This is a picture, and pictures cannot be read yet.");
  throw new Error("This kind of file cannot be read. Use a PDF, Word, Excel or CSV file.");
}
