/** Short lines without a full stop are usually headings. */
const isHeading = (line: string) => line.length >= 3 && line.length <= 70 && !/[.!?,;:]$/.test(line) && /^[A-Z0-9“"(]/.test(line) && line.split(/\s+/).length <= 9;
const firstSentence = (text: string) => {
  const cut = text.slice(0, 220);
  const end = cut.search(/[.!?](\s|$)/);
  return (end > 25 ? cut.slice(0, end + 1) : cut).trim();
};

/**
 * Picks out the main points of a document: each heading with the first sentence under it.
 * This is a plain read of the text, not an AI summary. It saves typing the points in by hand.
 */
export function mainPoints(text: string, max = 14): string {
  const lines = text.replace(/\r/g, "").split("\n").map((line) => line.replace(/\s+/g, " ").trim());
  const points: string[] = [];
  for (let i = 0; i < lines.length && points.length < max; i++) {
    if (!isHeading(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j]) j++;
    const body = lines[j];
    if (body && !isHeading(body) && body.length > 25) points.push(`${lines[i].replace(/^[\d.)\s-]+/, "")}: ${firstSentence(body)}`);
  }
  if (points.length < 3) {
    // No headings to go by: the opening sentence of each paragraph.
    const paragraphs = text.replace(/\r/g, "").split(/\n\s*\n/).map((part) => part.replace(/\s+/g, " ").trim()).filter((part) => part.length > 60);
    for (const part of paragraphs) { if (points.length >= max) break; points.push(firstSentence(part)); }
  }
  return points.map((point) => `• ${point}`).join("\n");
}
