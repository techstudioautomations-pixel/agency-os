import type { ReportNumbers } from "./types";

export type FoundNumbers = Partial<ReportNumbers>;

const platformNames = ["LinkedIn", "Instagram", "Facebook", "TikTok", "YouTube", "Newsletter", "Twitter", "X"];
const toName = (name: string) => (/^twitter$/i.test(name) ? "X" : platformNames.find((item) => item.toLowerCase() === name.toLowerCase()) ?? name);

/** The platform named in a line, if one is. A lone "X" only counts when it is the whole line. */
const platformIn = (line: string) => {
  const found = /\b(LinkedIn|Instagram|Facebook|TikTok|YouTube|Newsletter|Twitter)\b/i.exec(line);
  if (found) return toName(found[1]);
  return /^\s*X\s*(\(Twitter\))?\s*:?\s*$/.test(line) ? "X" : undefined;
};
const isHeading = (line: string) => Boolean(platformIn(line)) && !/\d/.test(line) && line.trim().split(/\s+/).length <= 6;

const NUMBER = String.raw`([+\-−]?\d[\d.,]*(?:\s?[KkMm]\b)?)`;
const tidy = (value: string) => value.replace(/\s+/g, "").replace("−", "-");

/** The first number after a label on a line, or on the line below when the line is only a label. */
function after(lines: string[], index: number, label: RegExp, gap = 32) {
  const line = lines[index];
  const match = label.exec(line);
  if (!match) return undefined;
  const rest = line.slice(match.index + match[0].length);
  const same = new RegExp(`^[^\\d\\n+\\-−]{0,${gap}}?${NUMBER}`).exec(rest);
  if (same) return same[1];
  if (!/\d/.test(rest)) {
    const next = lines[index + 1]?.trim() ?? "";
    const alone = new RegExp(`^${NUMBER}\\s*%?$`).exec(next);
    if (alone) return alone[1];
  }
  return undefined;
}

const textAfter = (lines: string[], index: number, label: RegExp) => {
  const match = label.exec(lines[index]);
  if (!match) return "";
  const same = lines[index].slice(match.index + match[0].length).replace(/^[\s:–—-]+/, "").trim();
  if (same) return same;
  const next: string[] = [];
  for (let i = index + 1; i < Math.min(lines.length, index + 4); i++) {
    const text = lines[i].trim();
    if (!text) break;
    next.push(text);
  }
  return next.join(" ");
};

function readSection(lines: string[]): FoundNumbers {
  const out: FoundNumbers = {};
  const used = new Set<number>();
  const each = (run: (index: number) => string | undefined) => {
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      const value = run(i);
      if (value !== undefined) { used.add(i); return value; }
    }
    return undefined;
  };

  const change = each((i) => {
    const hit = after(lines, i, /\b(new followers?|followers? (?:growth|change|gained|gain)|follower (?:growth|change|gain)|net followers?)\b/i);
    if (hit === undefined) return undefined;
    const value = tidy(hit);
    return /^[+-]/.test(value) ? value : `+${value}`;
  });
  if (change) out.followerChange = change;

  const followers = each((i) => { const hit = after(lines, i, /\b(total followers?|followers?|subscribers?|fans)\b/i); return hit === undefined ? undefined : tidy(hit); });
  if (followers) out.followers = followers.replace(/^\+/, "");

  const reach = each((i) => { const hit = after(lines, i, /\b(reach|accounts reached|members reached)\b/i); return hit === undefined ? undefined : tidy(hit); });
  if (reach) out.reach = reach;

  const impressions = each((i) => { const hit = after(lines, i, /\b(impressions)\b/i); return hit === undefined ? undefined : tidy(hit); }) ?? each((i) => { const hit = after(lines, i, /\b(video views|views)\b/i); return hit === undefined ? undefined : tidy(hit); });
  if (impressions) out.impressions = impressions;

  const engagement = each((i) => {
    const match = /engagement(?: rate)?/i.exec(lines[i]);
    if (!match) return undefined;
    const rest = lines[i].slice(match.index + match[0].length);
    const hit = /^[^\d\n]{0,32}?(\d+(?:[.,]\d+)?)\s*%?/.exec(rest) ?? (!/\d/.test(rest) ? /^(\d+(?:[.,]\d+)?)\s*%?$/.exec(lines[i + 1]?.trim() ?? "") : null);
    return hit ? hit[1].replace(",", ".") : undefined;
  });
  if (engagement) out.engagementRate = engagement;

  const posts = each((i) => { const hit = after(lines, i, /\b(posts? published|published posts|number of posts|total posts|posts)\b/i, 24); return hit === undefined ? undefined : hit.replace(/[^\d]/g, "") || undefined; });
  if (posts) out.postsPublished = posts;

  for (let i = 0; i < lines.length; i++) {
    if (!out.topPost && /\b(top|best)[ -]?(?:performing )?post\b/i.test(lines[i])) out.topPost = textAfter(lines, i, /\b(top|best)[ -]?(?:performing )?post\b[^:\n–—-]*/i).slice(0, 300);
    if (!out.observations && /^\s*(observations?|insights?|what (?:we|i) noticed|key takeaways?|takeaways?)\b/i.test(lines[i])) out.observations = textAfter(lines, i, /^\s*(observations?|insights?|what (?:we|i) noticed|key takeaways?|takeaways?)\b/i).slice(0, 500);
  }
  return out;
}

/**
 * Finds the key numbers in the text of a report. A report with a heading per platform gives one set per platform.
 * Without headings, everything goes to `fallback`. Only fields it is fairly sure about are filled in.
 */
export function findNumbers(text: string, fallback: string): Record<string, FoundNumbers> {
  const lines = text.replace(/\r/g, "").split("\n").map((line) => line.replace(/\s+/g, " ").trim());
  const sections = new Map<string, string[]>();
  const add = (platform: string, line: string) => sections.set(platform, [...(sections.get(platform) ?? []), line]);
  let current = "";
  let headings = 0;
  for (const line of lines) {
    if (isHeading(line)) { current = platformIn(line)!; headings++; if (!sections.has(current)) sections.set(current, []); continue; }
    const named = platformIn(line);
    if (named && /\d/.test(line)) { add(named, line.replace(new RegExp(`\\b${named === "X" ? "X" : named}\\b`, "i"), "").trim()); continue; }
    add(current, line);
  }
  const unnamed = sections.get("") ?? [];
  sections.delete("");
  if (headings === 0 && !sections.size) sections.set(fallback, unnamed);

  const result: Record<string, FoundNumbers> = {};
  for (const [platform, body] of sections) {
    const found = readSection(body);
    if (Object.keys(found).length) result[platform] = found;
  }
  return result;
}
