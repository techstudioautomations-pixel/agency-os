import type { CheckItem, Client, Freelancer, Person, Post, PostStatus, State } from "./types";
import { freelancerGateLabels } from "./seed";

// ─── Dates ───
export const todayIso = () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/El_Salvador", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};
export const daysSince = (iso: string) => (iso ? Math.floor((Date.parse(`${todayIso()}T12:00:00`) - Date.parse(`${iso.slice(0, 10)}T12:00:00`)) / 86400000) : 0);
export const shortDate = (iso: string) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-IE", { day: "numeric", month: "short" }) : "");
export const monthName = (month: string) => new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IE", { month: "long", year: "numeric" });
export const shiftMonth = (month: string, delta: number) => {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + delta);
  return date.toISOString().slice(0, 7);
};
export const ago = (iso: string) => {
  const days = daysSince(iso);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};
export const money = (value: number, currency = "USD") => value.toLocaleString(currency === "USD" ? "en-US" : "en-IE", { style: "currency", currency, maximumFractionDigits: 0 });

// ─── People ───
export const everyone = (state: State): (Person | Freelancer)[] => [...state.people, ...state.freelancers];
export const personById = (state: State, id?: string) => everyone(state).find((person) => person.id === id);
export const nameOf = (state: State, id?: string) => (id === "client" ? "Client" : personById(state, id)?.name ?? "Unassigned");
export const me = (state: State) => personById(state, state.me) ?? state.people[0];
export const isOwner = (state: State) => me(state).role === "owner";
export const isFreelancer = (state: State) => me(state).role === "freelancer";
export const myClients = (state: State) => (isFreelancer(state) ? state.clients.filter((client) => client.freelancerId === state.me) : state.clients);

/** Who reviews copy and design for a client. */
export const reviewerFor = (state: State, client?: Client) => (state.settings.reviewer === "maria-all" ? "maria" : client?.opsId ?? "niamh");

// ─── Checklists ───
const done = (item: CheckItem) => item.status === "Received" || item.status === "N/A";
export const progress = (items: CheckItem[]) => {
  const total = items.length;
  const complete = items.filter(done).length;
  return { complete, total, percent: total ? Math.round((complete / total) * 100) : 0 };
};
export const missing = (items: CheckItem[]) => items.filter((item) => !done(item));

/** Green: every hard item is in. Amber: everything hard has at least been asked for. Red: something hard has not even been asked for. */
export function gate(items: CheckItem[]) {
  const hard = items.filter((item) => !item.soft && !done(item));
  if (hard.length === 0) return { light: "green" as const, label: "Ready for production", blocking: hard };
  if (hard.every((item) => item.status === "Requested")) return { light: "amber" as const, label: `Waiting on ${hard.length}`, blocking: hard };
  return { light: "red" as const, label: `${hard.length} missing`, blocking: hard };
}

export const canBeAssigned = (freelancer: Freelancer) =>
  freelancer.status !== "Offboarded" && freelancerGateLabels.every((label) => freelancer.checklist.find((item) => item.label === label)?.status === "Received");

/** Friendly labels: internal tasks read To do / In progress / Done; client items read Not asked / Requested / Received. */
export const statusLabel = (item: CheckItem, status = item.status) =>
  item.owner === "client" ? status : ({ "Not asked": "To do", Requested: "In progress", Received: "Done", "N/A": "N/A" } as const)[status];

// ─── Posts: whose turn is it? ───
export const stageOf = (status: PostStatus) =>
  status.startsWith("Copy") ? 0 : status.startsWith("Design") ? 1 : status === "Client approval" ? 2 : status === "Ready to schedule" || status === "Scheduled" ? 3 : 4;
export const stages = ["Copy", "Design", "Client", "Schedule", "Live"];

export type Turn = { who: string; verb: string; tone: "you" | "freelancer" | "review" | "client" | "done" };

export function turnOf(state: State, post: Post): Turn {
  const client = state.clients.find((item) => item.id === post.clientId);
  const freelancer = client?.freelancerId ?? "unassigned";
  const openChanges = post.comments.filter((comment) => comment.kind === "change" && !comment.resolved).length;
  const fix = openChanges ? ` · ${openChanges} change${openChanges === 1 ? "" : "s"}` : "";
  switch (post.status) {
    case "Copy in progress":
      return { who: freelancer, verb: openChanges ? `Fix copy${fix}` : "Write copy", tone: "freelancer" };
    case "Copy review":
      return { who: reviewerFor(state, client), verb: "Review copy", tone: "review" };
    case "Design in progress":
      return { who: freelancer, verb: openChanges ? `Fix design${fix}` : "Make design", tone: "freelancer" };
    case "Design review":
      return { who: reviewerFor(state, client), verb: post.needsExpert && !post.expertOk ? "Review design · expert check" : "Review design", tone: "review" };
    case "Client approval":
      return { who: client?.opsId ?? "niamh", verb: "Log client decision", tone: "client" };
    case "Ready to schedule":
      return { who: freelancer, verb: "Schedule in Publer", tone: "freelancer" };
    case "Scheduled":
      return post.date < todayIso() ? { who: freelancer, verb: "Confirm it went live", tone: "freelancer" } : { who: "", verb: `Goes live ${shortDate(post.date)}`, tone: "done" };
    default:
      return { who: "", verb: "Live", tone: "done" };
  }
}


// ─── Ideas: split one document into cards ───
const formatWords: [RegExp, string][] = [
  [/carousel/i, "Carousel"],
  [/\b(reel|video|tiktok)\b/i, "Reel"],
  [/newsletter/i, "Newsletter"],
  [/text post|text only/i, "Text post"],
  [/single image|static/i, "Single image"],
];

export function splitIdeas(text: string): { title: string; notes: string; format: string }[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const marker = /^\s*(?:(?:idea\s*)?\d{1,2}\s*[.):\-–]|[-•*]\s+|#{1,4}\s+|idea\s*\d+)/i;
  const blocks: string[][] = [];
  const hasMarkers = lines.filter((line) => marker.test(line)).length >= 2;
  if (hasMarkers) {
    for (const line of lines) {
      if (marker.test(line)) blocks.push([line.replace(marker, "").trim()]);
      else if (blocks.length && line.trim()) blocks[blocks.length - 1].push(line.trim());
    }
  } else {
    let current: string[] = [];
    for (const line of lines) {
      if (!line.trim()) {
        if (current.length) blocks.push(current);
        current = [];
      } else current.push(line.trim());
    }
    if (current.length) blocks.push(current);
  }
  return blocks
    .filter((block) => block.join("").trim().length > 3)
    .map((block) => {
      const [first, ...rest] = block;
      const [titlePart, inlineNotes] = first.split(/\s[–—-]\s|:\s/, 2);
      const title = (titlePart || first).replace(/^\*\*|\*\*$/g, "").trim().slice(0, 120);
      const notes = [inlineNotes, ...rest].filter(Boolean).join("\n").trim();
      const format = formatWords.find(([pattern]) => pattern.test(`${first} ${notes}`))?.[1] ?? "Carousel";
      return { title, notes, format };
    });
}

/** Reads the text of a .docx in the browser (a .docx is a zip; we inflate word/document.xml). */
export async function docxText(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(buffer.buffer);
  let offset = 0;
  while (offset < buffer.length - 30 && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    let size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(buffer.slice(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    const flags = view.getUint16(offset + 6, true);
    if (flags & 8 && size === 0) {
      // Size is in a trailing descriptor: scan for the next header.
      let next = start;
      while (next < buffer.length - 4 && view.getUint32(next, true) !== 0x04034b50 && view.getUint32(next, true) !== 0x02014b50) next++;
      size = next - start - (view.getUint32(next - 16, true) === 0x08074b50 ? 16 : 12);
    }
    if (name === "word/document.xml") {
      const data = buffer.slice(start, start + size);
      let xml: string;
      if (method === 0) xml = new TextDecoder().decode(data);
      else {
        const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        xml = await new Response(stream).text();
      }
      return xml
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }
    offset = start + size;
  }
  throw new Error("Could not read this Word file. Copy the text and paste it instead.");
}

