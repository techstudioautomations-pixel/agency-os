export type ImportedIdea = { title: string; hook: string; source: string; angle: string; notes: string };

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim()); cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else cell += character;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function importIdeas(input: string, filename: string): ImportedIdea[] {
  const text = input.trim();
  if (!text) return [];
  if (filename.toLowerCase().endsWith(".csv")) {
    const [headings = [], ...rows] = parseCsv(text);
    const headers = headings.map(value => value.toLowerCase().trim());
    const read = (row: string[], names: string[]) => {
      const index = headers.findIndex(header => names.includes(header));
      return index >= 0 ? row[index] ?? "" : "";
    };
    const hasTitle = headers.some(header => ["title", "topic", "idea", "name"].includes(header));
    return (hasTitle ? rows : [headings, ...rows]).map(row => ({
      title: hasTitle ? read(row, ["title", "topic", "idea", "name"]) : row[0] ?? "",
      hook: hasTitle ? read(row, ["hook", "question"]) : "",
      source: hasTitle ? read(row, ["source", "reference", "url", "link"]) : "",
      angle: hasTitle ? read(row, ["angle", "content angle", "description"]) : "",
      notes: hasTitle ? read(row, ["notes", "context"]) : "",
    })).filter(idea => idea.title);
  }
  if (filename.toLowerCase().endsWith(".json")) {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("JSON must contain a list of ideas.");
    return parsed.map(item => typeof item === "string" ? { title: item, hook: "", source: "", angle: "", notes: "" } : {
      title: String(item?.title ?? item?.topic ?? item?.idea ?? ""),
      hook: String(item?.hook ?? ""), source: String(item?.source ?? ""),
      angle: String(item?.angle ?? ""), notes: String(item?.notes ?? ""),
    }).filter(idea => idea.title);
  }
  return text.split(/\r?\n/).map(line => ({
    title: line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim(), hook: "", source: "", angle: "", notes: "",
  })).filter(idea => idea.title && !/^#{1,6}\s*$/.test(idea.title));
}

export function extractReportText(input: string) {
  const number = (labels: string[]) => {
    const expression = new RegExp(`(?:^|\\n)\\s*(?:${labels.join("|")})\\s*[:–-]\\s*([+\\-]?[\\d,]+(?:\\.\\d+)?)`, "im");
    return input.match(expression)?.[1]?.replace(/,/g, "") ?? "";
  };
  const section = (labels: string[]) => {
    const expression = new RegExp(`(?:^|\\n)\\s*(?:${labels.join("|")})\\s*[:–-]\\s*([\\s\\S]*?)(?=\\n\\s*(?:next week|summary|overview|followers|reach|mentions|reposts|engagement|posts published)\\s*[:–-]|$)`, "im");
    return input.match(expression)?.[1]?.trim() ?? "";
  };
  return {
    followers: number(["followers"]), followerChange: number(["follower change", "new followers"]),
    reach: number(["reach", "impressions"]), mentions: number(["mentions"]),
    reposts: number(["reposts", "shares"]), engagementRate: number(["engagement(?: rate)?\\s*%?"]),
    postsPublished: number(["posts published", "published posts"]),
    summary: section(["summary", "overview", "this week"]), nextWeek: section(["next week"]),
  };
}
