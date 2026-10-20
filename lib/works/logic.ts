import type { CheckItem, Client, ClientAsset, Freelancer, PackageDef, Person, Post, PostStatus, Route, State } from "./types";
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
  const hard = items.filter((item) => !item.soft && !item.detail && !done(item));
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



// ─── Checklist areas ───
export const areaOf = (item: CheckItem): string => item.area ?? "onboarding";
export const areaItems = (items: CheckItem[], areaId: string) => items.filter((item) => areaOf(item) === areaId);

/** Areas that fill themselves in from the work. Nothing to tick by hand. */
export type AutoStep = { label: string; done: boolean; go: Route };
export function autoAreas(state: State, client: Client): { id: "content" | "report"; label: string; color: string; blurb: string; steps: AutoStep[] }[] {
  const month = state.month;
  const lastMonth = shiftMonth(month, -1);
  const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(month));
  const ideas = state.ideas.filter((idea) => idea.clientId === client.id && idea.month === month);
  const approved = posts.filter((post) => ["Ready to schedule", "Scheduled", "Published"].includes(post.status)).length;
  const scheduled = posts.filter((post) => ["Scheduled", "Published"].includes(post.status)).length;
  const plan = client.planApproval[month];
  const report = state.reports.find((item) => item.clientId === client.id && item.month === lastMonth);
  const invoice = state.invoices.find((item) => item.clientId === client.id && item.month === month);
  const marketing = (tab: string): Route => ({ view: "marketing", clientId: client.id, tab });
  const reporting: Route = { view: "client", clientId: client.id, tab: "reporting" };
  const content: AutoStep[] = [
    { label: "Ideas for the month decided", done: ideas.length > 0 && !ideas.some((idea) => idea.decision === "New"), go: marketing("ideas") },
    ...(client.approvalMode !== "C" ? [{ label: "Month plan agreed with the client", done: plan?.status === "Approved", go: marketing("ideas") }] : []),
    { label: `All ${client.agreedPosts} agreed posts started`, done: posts.length >= client.agreedPosts, go: marketing("posts") },
    { label: "All posts approved", done: approved >= client.agreedPosts, go: marketing("posts") },
    { label: `All scheduled by the ${state.settings.dates.schedule}th`, done: scheduled >= client.agreedPosts, go: marketing("calendar") },
  ];
  const money: AutoStep[] = [
    { label: `${monthName(lastMonth).split(" ")[0]}: freelancer report in`, done: Boolean(report?.freelancerReport || report?.numbers), go: reporting },
    { label: `${monthName(lastMonth).split(" ")[0]}: client report sent`, done: Boolean(report?.sentAt), go: reporting },
    { label: `${monthName(lastMonth).split(" ")[0]}: finance statement sent`, done: Boolean(report?.financeSentAt), go: reporting },
    { label: `${monthName(month).split(" ")[0]}: invoice paid`, done: invoice?.status === "Paid", go: { view: "client", clientId: client.id, tab: "finance" } },
    { label: `${monthName(month).split(" ")[0]}: freelancer paid`, done: state.payouts.some((item) => item.clientId === client.id && item.month === month), go: { view: "client", clientId: client.id, tab: "finance" } },
  ];
  return [
    { id: "content", label: "Content this month", color: "#E08A1E", blurb: "Fills itself in from the posts.", steps: content },
    { id: "report", label: "Reports & money", color: "#1E2430", blurb: "Fills itself in from reports and finance.", steps: money },
  ];
}

// ─── Quality checklist on every post (from the freelancer quality checklist in the brand guide) ───
export type QaItem = { id: string; text: string; technical?: boolean; carousel?: boolean };
export const qaGroups: { title: string; items: QaItem[] }[] = [
  {
    title: "Before you start",
    items: [
      { id: "q1", text: "Brand assets loaded: logo, fonts, colour values" },
      { id: "q2", text: "Brief names the buyer, the one message, the template and the format" },
      { id: "q3", text: "Image and drawing rights, and the client's real involvement, confirmed" },
      { id: "q4", text: "Technical notes and credentials sent for checking", technical: true },
    ],
  },
  {
    title: "Design check",
    items: [
      { id: "q5", text: "Headline is clear and readable at phone size" },
      { id: "q6", text: "Right approved treatment and template used" },
      { id: "q7", text: "Original logo with clear space; accent colour kept restrained" },
      { id: "q8", text: "Portrait (1080×1350) and square (1080×1080) both exported and checked on a phone" },
      { id: "q9", text: "Carousel: one point per slide, clear cover and close", carousel: true },
    ],
  },
  {
    title: "Content and publishing gate",
    items: [
      { id: "q10", text: "Services, names and claimed outcomes fact-checked" },
      { id: "q11", text: "Regulatory or dimensional advice reviewed by the client's expert", technical: true },
      { id: "q12", text: "No generated imagery shown as real evidence" },
      { id: "q13", text: "Permissions in place for photos, quotes and client logos" },
      { id: "q14", text: "Our review done, and the client's approval recorded if they review" },
      { id: "q15", text: "Final files saved with template ID, date, topic, format and version" },
    ],
  },
];
export const qaItemsFor = (post: Post) => qaGroups.flatMap((group) => group.items).filter((item) => (!item.technical || post.needsExpert) && (!item.carousel || post.format === "Carousel"));
export const qaProgress = (post: Post) => {
  const items = qaItemsFor(post);
  const ticked = items.filter((item) => (post.qa ?? []).includes(item.id)).length;
  return { ticked, total: items.length, missing: items.length - ticked };
};


// ─── Packages and assets ───
export const packageOf = (state: State, client: Client): PackageDef | undefined => state.settings.packages.find((item) => item.id === client.packageId);
/** The fuller monthly report with recommendations, for packages that include it. */
export const isFullReport = (state: State, client: Client) => packageOf(state, client)?.fullReport ?? false;

const formatGroup = (format: string) => (format === "Reel" ? "Video" : format);

/** How many of each asset has been started this month. Posts without an asset are matched by their format. */
export function assetUsage(client: Client, posts: Post[], month: string): { asset: ClientAsset; used: number }[] {
  const list = posts.filter((post) => post.clientId === client.id && post.date.startsWith(month));
  const monthly = client.assets.filter((asset) => asset.period === "month");
  const used: Record<string, number> = {};
  for (const post of list) {
    const asset = monthly.find((item) => item.id === post.assetId) ?? monthly.find((item) => formatGroup(item.format) === formatGroup(post.format));
    if (asset) used[asset.id] = (used[asset.id] ?? 0) + 1;
  }
  return client.assets.map((asset) => ({ asset, used: asset.period === "month" ? used[asset.id] ?? 0 : 0 }));
}

export const periodLabel = (asset: Pick<ClientAsset, "qty" | "period">) => `${asset.qty} a ${asset.period}`;

// ─── Reviews: the team and freelancers only, unless a client asked to see something ───
export const inReview = (post: Post) => post.status === "Copy review" || post.status === "Design review";
