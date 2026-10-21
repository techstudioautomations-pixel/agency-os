import type { CheckItem, Client, ClientAsset, Freelancer, MonthReport, MonthlyStep, PackageDef, Person, Post, PostStatus, Route, State } from "./types";
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
export const reviewerFor = (state: State, client?: Client, post?: Post) => post?.reviewerId || (state.settings.reviewer === "maria-all" ? "maria" : client?.opsId ?? "niamh");

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

/** Hired people work for us. The rest of the directory is for reference. */
export const isHired = (freelancer: Freelancer) => freelancer.status === "Active" || freelancer.status === "Trial";

export const canBeAssigned = (freelancer: Freelancer) =>
  isHired(freelancer) && freelancerGateLabels.every((label) => freelancer.checklist.find((item) => item.label === label)?.status === "Received");

/** Friendly labels: internal tasks read To do / In progress / Done; client items read Not asked / Requested / Received. */
export const statusLabel = (item: CheckItem, status = item.status) =>
  item.owner === "client" ? status : ({ "Not asked": "To do", Requested: "In progress", Received: "Done", "N/A": "N/A" } as const)[status];

// ─── Posts: whose turn is it? ───
export const stageOf = (status: PostStatus) =>
  status.startsWith("Copy") ? 0 : status.startsWith("Design") ? 1 : status === "Client approval" ? 2 : status === "Ready to schedule" || status === "Scheduled" ? 3 : 4;
export const stages = ["Copy", "Design", "Client", "Schedule", "Live"];

/** Owners and operations can approve anything in review, so it counts as waiting on them. Freelancers only see their own turn. */
export const needsMe = (state: State, post: Post) => turnOf(state, post).who === state.me || (!isFreelancer(state) && inReview(post));

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
      return { who: reviewerFor(state, client, post), verb: "Review copy", tone: "review" };
    case "Design in progress":
      return { who: freelancer, verb: openChanges ? `Fix design${fix}` : "Make design", tone: "freelancer" };
    case "Design review":
      return { who: reviewerFor(state, client, post), verb: post.needsExpert && !post.expertOk ? "Review design · expert check" : "Review design", tone: "review" };
    case "Client approval":
      return { who: client?.opsId ?? "niamh", verb: "Log client decision", tone: "client" };
    case "Ready to schedule":
      return { who: freelancer, verb: "Schedule it", tone: "freelancer" };
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
      // Only a dash splits the title from a note. Colons stay in the title, as in "Myth: you can always remove a wall".
      const [titlePart, inlineNotes] = first.split(/\s[–—-]\s/, 2);
      const title = (titlePart || first).replace(/^\*\*|\*\*$/g, "").trim().slice(0, 120);
      // A dash followed by just a format ("– carousel") is the format, not a note.
      const onlyFormat = inlineNotes !== undefined && inlineNotes.trim().split(/\s+/).length <= 3 && formatWords.some(([pattern]) => pattern.test(inlineNotes));
      const notes = [onlyFormat ? "" : inlineNotes, ...rest].filter(Boolean).join("\n").trim();
      const format = formatWords.find(([pattern]) => pattern.test(`${first} ${notes}`))?.[1] ?? "Carousel";
      return { title, notes, format };
    });
}

/** Finds one file inside a zip using the central directory, so files saved with data descriptors (Google Docs exports) work too. */
export async function zipEntry(buffer: Uint8Array, wanted: string): Promise<Uint8Array | null> {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error("This does not look like a Word file. Save it as .docx, or paste the text.");
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  for (let n = 0; n < count; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) break;
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(buffer.slice(at + 46, at + 46 + nameLength));
    if (name === wanted) {
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = buffer.slice(start, start + size);
      if (method === 0) return data;
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    at += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

/** The raw document.xml of a .docx. */
export async function docxXml(file: File): Promise<string> {
  const data = await zipEntry(new Uint8Array(await file.arrayBuffer()), "word/document.xml");
  if (!data) throw new Error("Could not read this Word file. Save it as .docx, or paste the text.");
  return new TextDecoder().decode(data);
}

/** Reads the text of a .docx in the browser. */
export async function docxText(file: File): Promise<string> {
  const xml = await docxXml(file);
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



// ─── Report periods: a week, weeks in a row, or the full month ───
export const periodKey = (from: number, to: number) => (from === to ? `w${from}` : `w${from}-${to}`);
export const periodWeeks = (period: string): [number, number] | undefined => {
  const match = /^w(\d)(?:-(\d))?$/.exec(period);
  return match ? [Number(match[1]), Number(match[2] ?? match[1])] : undefined;
};
/** First and last day of a report week: 1-7, 8-14, 15-21, then 22 to the end of the month. */
export const weekDays = (month: string, week: number): [number, number] => {
  const [year, number] = month.split("-").map(Number);
  const last = new Date(year, number, 0).getDate();
  return week >= 4 ? [22, last] : [(week - 1) * 7 + 1, week * 7];
};
export const periodName = (period: string, month: string) => {
  const weeks = periodWeeks(period);
  if (!weeks) return monthName(month);
  const [from, to] = weeks;
  const short = new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IE", { month: "short" });
  return `${from === to ? `Week ${from}` : `Weeks ${from}-${to}`} (${weekDays(month, from)[0]}-${weekDays(month, to)[1]} ${short})`;
};
export const partHasContent = (part?: { byPlatform?: object; freelancerReport?: object }) => Boolean(part && (part.freelancerReport || Object.keys(part.byPlatform ?? {}).length));
/** Which weeks of a month are covered by a saved report. */
export const coveredWeeks = (report?: MonthReport) => {
  const covered = new Set<number>();
  for (const [key, part] of Object.entries(report?.weekly ?? {})) {
    const weeks = periodWeeks(key);
    if (weeks && partHasContent(part)) for (let n = weeks[0]; n <= weeks[1]; n++) covered.add(n);
  }
  return covered;
};
/** The reports saved for a month, one chip each: the full month and any weeks. */
export const reportParts = (report?: MonthReport) => {
  const parts: { key: string; label: string; submitted: boolean }[] = [];
  if (report && (report.freelancerReport || report.numbers || Object.keys(report.byPlatform ?? {}).length)) parts.push({ key: "month", label: "Full month", submitted: Boolean(report.submittedAt) });
  for (const [key, part] of Object.entries(report?.weekly ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const weeks = periodWeeks(key);
    if (weeks && partHasContent(part)) parts.push({ key, label: weeks[0] === weeks[1] ? `Week ${weeks[0]}` : `Weeks ${weeks[0]}-${weeks[1]}`, submitted: Boolean(part.submittedAt) });
  }
  return parts;
};
/** The report as the client report should see it. With no full-month report, the numbers come from the weekly report that reaches furthest into the month. */
export const monthView = (report: MonthReport): MonthReport => {
  if (report.numbers || Object.keys(report.byPlatform ?? {}).length) return report;
  const latest = Object.entries(report.weekly ?? {})
    .map(([key, part]) => ({ end: periodWeeks(key)?.[1] ?? 0, by: part.byPlatform ?? {} }))
    .filter((item) => item.end && Object.keys(item.by).length)
    .sort((a, b) => b.end - a.end)[0];
  return latest ? { ...report, byPlatform: latest.by, numbers: { ...latest.by[Object.keys(latest.by)[0]] } } : report;
};
/** Has the freelancer's report for the month come in? Either the full month, or every week covered. */
export const reportIn = (report?: MonthReport) => {
  if (!report) return false;
  if (report.freelancerReport || report.numbers) return true;
  const covered = coveredWeeks(report);
  return [1, 2, 3, 4].every((week) => covered.has(week));
};

// ─── Checklist areas ───
export const areaOf = (item: CheckItem): string => item.area ?? "onboarding";
export const areaItems = (items: CheckItem[], areaId: string) => items.filter((item) => areaOf(item) === areaId);

// ─── Monthly checklists: one for operations, one for the freelancer ───
export const isMarketing = (client: Client) => client.area === "marketing";
export const firstMonthOf = (client: Client) => client.startDate.slice(0, 7);
export const isFirstMonth = (client: Client, month: string) => firstMonthOf(client) === month;
/** Posts promised in a month. The first month is set-up, so it is usually fewer. */
export const agreedFor = (client: Client, month: string) => (isFirstMonth(client, month) ? Math.min(client.setupPosts, client.agreedPosts) : client.agreedPosts);
export const areaLabel = (client: Client) => (client.area === "marketing" ? "Marketing" : client.area === "web" ? "Web design" : client.areaName || "Custom");

/** Extra work assigned to a person that is not made yet. */
export function extrasFor(state: State, personId: string) {
  const approved = ["Ready to schedule", "Scheduled", "Published"];
  return state.clients
    .filter((client) => client.stage !== "Paused")
    .flatMap((client) =>
      client.assets
        .filter((asset) => asset.kind === "extra" && asset.assignedTo === personId && asset.active !== false)
        .map((asset) => ({ client, asset, made: state.posts.filter((post) => post.assetId === asset.id && approved.includes(post.status)).length, started: state.posts.filter((post) => post.assetId === asset.id).length })),
    )
    .filter((item) => item.made < item.asset.qty);
}

export type MonthStep = { id: string; label: string; done: boolean; manual: boolean; hint?: string; go?: Route; /** Which piece of work this step follows, when it ticks itself. */ key?: string };
export type MonthArea = { id: "ops" | "freelancer"; label: string; color: string; blurb: string; steps: MonthStep[] };

export function monthlyAreas(state: State, client: Client, month = state.month): MonthArea[] {
  const last = shiftMonth(month, -1);
  const lastName = monthName(last).split(" ")[0];
  const target = agreedFor(client, month);
  const first = isFirstMonth(client, month);
  const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(month) && !post.extra);
  const ideas = state.ideas.filter((idea) => idea.clientId === client.id && idea.month === month);
  const count = (list: string[]) => posts.filter((post) => list.includes(post.status)).length;
  const approved = count(["Ready to schedule", "Scheduled", "Published"]);
  const scheduled = count(["Scheduled", "Published"]);
  const report = state.reports.find((item) => item.clientId === client.id && item.month === last);
  const invoice = state.invoices.find((item) => item.clientId === client.id && item.month === month);
  const marketing = (tab: string): Route => ({ view: "marketing", clientId: client.id, tab });
  const reporting: Route = { view: "client", clientId: client.id, tab: "reporting" };
  const finance: Route = { view: "client", clientId: client.id, tab: "finance" };
  const auto: Record<string, { done: boolean; go: Route }> = {
    "pack-ready": { done: client.checklist.some((item) => item.label.startsWith("Pack handed") && item.status === "Received"), go: { view: "client", clientId: client.id, tab: "checklists", sub: "handoff" } },
    "ideas-decided": { done: ideas.length > 0 && !ideas.some((idea) => idea.decision === "New"), go: marketing("ideas") },
    "ideas-uploaded": { done: ideas.length > 0, go: marketing("ideas") },
    "plan-agreed": { done: client.planApproval[month]?.status === "Approved", go: marketing("ideas") },
    "posts-started": { done: posts.length >= target, go: marketing("posts") },
    "posts-approved": { done: approved >= target, go: marketing("posts") },
    "posts-scheduled": { done: scheduled >= target && target > 0, go: marketing("calendar") },
    submitted: { done: posts.length >= target && !posts.some((post) => post.status === "Copy in progress" || post.status === "Design in progress"), go: marketing("posts") },
    "report-in": { done: reportIn(report), go: reporting },
    "report-sent": { done: Boolean(report?.sentAt), go: reporting },
    "finance-sent": { done: Boolean(report?.financeSentAt), go: reporting },
    "invoice-paid": { done: invoice?.status === "Paid", go: finance },
    "freelancer-paid": { done: state.payouts.some((item) => item.clientId === client.id && item.month === month), go: finance },
  };
  const ticks = client.monthDone[month] ?? {};
  const hasNewsletter = client.assets.some((asset) => asset.format === "Newsletter");
  const applies = (step: MonthlyStep) =>
    (step.when === "always" || step.when === (first ? "first" : "regular")) &&
    (step.needs === "marketing" ? isMarketing(client) : step.needs === "client-review" ? isMarketing(client) && client.approvalMode !== "C" : step.needs === "newsletter" ? hasNewsletter : true);
  const text = (label: string) => label.replace("{n}", String(target)).replace("{last}", lastName).replace("{month}", monthName(month).split(" ")[0]);
  const build = (role: "ops" | "freelancer"): MonthStep[] =>
    state.settings.monthly.filter((step) => step.role === role && applies(step)).map((step) => {
      const hit = step.auto ? auto[step.auto] : undefined;
      return { id: step.id, label: text(step.label), done: hit ? hit.done : Boolean(ticks[step.id]), manual: !hit, hint: step.hint, go: hit?.go, key: step.auto };
    });
  const name = monthName(month).split(" ")[0];
  return [
    { id: "ops", label: `Operations · ${name}`, color: "#1E2430", blurb: first ? "Set-up month: the strategy and the pack come first." : "What operations does this month.", steps: build("ops") },
    { id: "freelancer", label: `Freelancer · ${name}`, color: "#E08A1E", blurb: "What the freelancer does. It reports back to operations here.", steps: build("freelancer") },
  ].filter((area) => area.steps.length > 0) as MonthArea[];
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
/** While the copy is being written only the "before you start" checks matter. The design checks come with the design. */
export const qaItemsFor = (post: Post) => qaGroups.filter((group) => !post.status.startsWith("Copy") || group.title === "Before you start").flatMap((group) => group.items).filter((item) => (!item.technical || post.needsExpert) && (!item.carousel || post.format === "Carousel"));
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

/** Which monthly item a post of this type counts towards for this client, and how much of it is already used. */
export function planSlot(client: Client, posts: Post[], month: string, format: string) {
  const usage = assetUsage(client, posts.filter((post) => !post.extra), month);
  const matches = usage.filter((item) => item.asset.source === "package" && item.asset.period === "month" && formatGroup(item.asset.format) === formatGroup(format));
  const pick = matches.find((item) => item.used < item.asset.qty) ?? matches[0];
  return pick ? { asset: pick.asset, used: pick.used, qty: pick.asset.qty, over: pick.used >= pick.asset.qty } : undefined;
}

/** A post saved by the freelancer that has not been sent for review yet. */
export const isDraft = (post: Post) => post.status === "Copy in progress" && !post.history.some((entry) => /Submitted|Sent /.test(entry.text));

export const periodLabel = (asset: Pick<ClientAsset, "qty" | "period">) => `${asset.qty} a ${asset.period}`;

// ─── Reviews: the team and freelancers only, unless a client asked to see something ───
export const inReview = (post: Post) => post.status === "Copy review" || post.status === "Design review";
