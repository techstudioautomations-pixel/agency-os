import type { CheckItem, Client, ClientAsset, Freelancer, FreelancerFee, MonthReport, MonthlyStep, PackageDef, Person, Post, PostStatus, Route, State } from "./types";

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

// ─── Currencies: clients and freelancers can each use their own. Everything adds up in the main currency in Settings. ───
export const currencies = ["EUR", "USD"];
export const symbolOf = (currency: string) => (currency === "USD" ? "$" : currency === "EUR" ? "€" : currency);
export const defaultRates: Record<string, number> = { USD: 0.86 };
/** An amount in another currency, in the main currency. */
export const toBase = (state: State, amount: number, currency?: string) => (!currency || currency === state.settings.currency ? amount : amount * (state.settings.rates?.[currency] ?? defaultRates[currency] ?? 1));
/** An amount in the main currency, in another currency. */
export const fromBase = (state: State, amount: number, currency?: string) => (!currency || currency === state.settings.currency ? amount : amount / (state.settings.rates?.[currency] ?? defaultRates[currency] ?? 1));
export const clientCurrency = (state: State, client: Client) => client.currency ?? state.settings.currency;
export const freelancerCurrency = (state: State, client: Client) => client.freelancerCurrency ?? state.freelancers.find((person) => person.id === client.freelancerId)?.currency ?? state.settings.currency;
/** What the client pays each month, in the main currency. */
export const incomeBase = (state: State, client: Client) => toBase(state, client.fee + client.addOnFee, clientCurrency(state, client));
/** What the freelancer costs each month for this client, in the main currency. */
export const freelancerCostBase = (state: State, client: Client, month = state.month) => {
  const hasPayments = state.freelancers.some((person) => person.fees.some((fee) => fee.clientId === client.id));
  // When payments are set up for this client, they are the cost. Otherwise the single figure on the client page is.
  if (hasPayments) return clientOccurrences(state, client, month).reduce((sum, item) => sum + occurrenceBase(state, item), 0);
  return client.freelancerId ? toBase(state, client.freelancerFee, freelancerCurrency(state, client)) : 0;
};
/** Has this client any payments set up, and are all of this month's paid? */
export const clientPayStatus = (state: State, client: Client, month = state.month) => {
  const has = state.freelancers.some((person) => person.fees.some((fee) => fee.clientId === client.id));
  const due = clientOccurrences(state, client, month);
  return { has, due, open: due.filter((item) => !item.paid) };
};
/** "≈ €645" when an amount is not in the main currency, otherwise nothing. */
export const approx = (state: State, amount: number, currency: string) => (currency === state.settings.currency ? "" : `≈ ${money(toBase(state, amount, currency), state.settings.currency)}`);

// ─── People ───
export const everyone = (state: State): (Person | Freelancer)[] => [...state.people, ...state.freelancers];
export const personById = (state: State, id?: string) => everyone(state).find((person) => person.id === id);
export const nameOf = (state: State, id?: string) => (id === "client" ? "Client" : personById(state, id)?.name ?? "Unassigned");
export const me = (state: State) => personById(state, state.me) ?? state.people[0];
export const isOwner = (state: State) => me(state).role === "owner";
export const isFreelancer = (state: State) => me(state).role === "freelancer";
/** Everyone assigned to a client: the lead first, then the rest. */
export const clientTeam = (client: Client) => [...new Set([client.freelancerId, ...(client.team ?? []).map((member) => member.id)].filter((id): id is string => Boolean(id)))];
export const worksOn = (client: Client, personId: string) => clientTeam(client).includes(personId);
export const myClients = (state: State) => (isFreelancer(state) ? state.clients.filter((client) => worksOn(client, state.me)) : state.clients);

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
/** On the team, including someone paused for a while. */
export const isOnTeam = (freelancer: Freelancer) => isHired(freelancer) || freelancer.status === "Paused";

export const specialityOptions = ["Social media management", "Digital marketing", "SEO", "Copywriting", "Graphic design", "Video editing", "Web design", "Analytics and reporting"];
export const payChannels = ["Revolut", "Bank transfer", "PayPal", "Wise", "Fiverr", "Upwork", "Other"];
export const fileLabels = ["CV", "Portfolio", "NDA", "Contract", "Other"];
export const toolChoices = ["OS login", "Google Chat", "Drive folder", "Canva seat", "Publishing tool"];
export const defaultToolNames = ["OS login", "Google Chat", "Drive folder", "Canva seat", "Publishing tool"];

/** Services are kept one per line as "Service | amount | currency". */
export const serviceList = (text: string) => text.split("\n").map((line) => line.split("|").map((part) => part.trim())).filter(([name]) => name).map(([name, price = "", currency = ""]) => ({ name, price, currency }));

export type SetupStep = { id: string; label: string; done: boolean; /** Not needed to start. */ optional?: boolean; /** Must be done before they can be given a client. */ gate?: boolean; hint?: string };

/** What is done and what is not, worked out from what is on the profile. Nothing here is ticked by hand, except the trial. */
export function setupSteps(state: State | undefined, person: Freelancer): SetupStep[] {
  const hasFile = (pattern: RegExp) => person.files.some((file) => pattern.test(file.label));
  const paid = person.fees.some((fee) => fee.amount > 0 && fee.channel);
  const tools = person.tools.length > 0 && person.tools.every((tool) => tool.done);
  return [
    { id: "profile", label: "Contact, role and speciality", done: Boolean(person.email.trim() || person.phone.trim()) && person.specialities.length > 0 },
    { id: "pay", label: "Rate, currency and payment method", done: paid, hint: "Add a payment below." },
    { id: "availability", label: "Capacity and availability", done: person.availability.amount > 0 },
    { id: "services", label: "Service list", done: serviceList(person.services).length > 0, hint: "Add them under Services and prices." },
    { id: "portfolio", label: "Portfolio", done: Boolean(person.portfolio.trim()) || hasFile(/portfolio/i), hint: "A link, or a file named Portfolio." },
    { id: "trial", label: "Trial", done: person.trialDone, optional: true },
    { id: "nda", label: "NDA signed", done: Boolean(person.ndaDate) || hasFile(/nda/i), gate: true },
    { id: "contract", label: "Contract and payment agreement signed", done: Boolean(person.contractDate) || hasFile(/contract/i), gate: true },
    { id: "tools", label: "Tools and access", done: tools },
    { id: "accounts", label: "A client assigned", done: Boolean(state?.clients.some((client) => client.freelancerId === person.id)), hint: "Assign from the client page." },
  ];
}
/** Done out of what is needed. The trial is not needed. */
export const setupProgress = (state: State | undefined, person: Freelancer) => {
  const needed = setupSteps(state, person).filter((step) => !step.optional);
  const complete = needed.filter((step) => step.done).length;
  return { complete, total: needed.length, percent: needed.length ? Math.round((complete / needed.length) * 100) : 0 };
};

/** The next day a payment falls due, or nothing if a one-time payment has passed. */
export function nextPayment(fee: FreelancerFee, today: string) {
  if (!fee.date) return "";
  if (fee.frequency === "one-time") return fee.date >= today ? fee.date : "";
  const day = Number(fee.date.slice(8, 10)) || 1;
  const month = today.slice(0, 7);
  const dayOf = (m: string) => `${m}-${String(Math.min(day, new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate())).padStart(2, "0")}`;
  const first = fee.date;
  const thisMonth = dayOf(month);
  const candidate = thisMonth >= today ? thisMonth : dayOf(shiftMonth(month, 1));
  return candidate < first ? first : candidate;
}
/** Does a payment fall in this month? Monthly ones from their first month on, one-time ones in their own month. */
export const feeApplies = (fee: FreelancerFee, month: string) => (fee.frequency === "monthly" ? fee.date.slice(0, 7) <= month : fee.date.startsWith(month));
/** The day a payment falls due in a month. */
export const dueDate = (fee: FreelancerFee, month: string) => {
  if (fee.frequency === "one-time") return fee.date;
  const day = Number(fee.date.slice(8, 10)) || 1;
  const last = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
};

export type Occurrence = { person: Freelancer; fee: FreelancerFee; month: string; date: string; paid?: { date: string; amount: number; currency: string } };
/** Every payment due in a month, for everyone, newest rules first: this is the one list Finance, the client page and the freelancer page all read. */
export function occurrencesIn(state: State, month: string): Occurrence[] {
  return state.freelancers
    .flatMap((person) => person.fees.filter((fee) => feeApplies(fee, month)).map((fee) => ({ person, fee, month, date: dueDate(fee, month), paid: fee.paid?.[month] })))
    .sort((a, b) => a.date.localeCompare(b.date));
}
export const clientOccurrences = (state: State, client: Client, month: string) => occurrencesIn(state, month).filter((item) => item.fee.clientId === client.id);
/** Payments to freelancers that are not for a client. They count as a company cost. */
export const otherOccurrences = (state: State, month: string) => occurrencesIn(state, month).filter((item) => !item.fee.clientId);
const occurrenceBase = (state: State, item: Occurrence) => toBase(state, item.paid?.amount ?? item.fee.amount, item.paid?.currency ?? item.fee.currency);
export const otherFreelancerCostBase = (state: State, month = state.month) => otherOccurrences(state, month).reduce((sum, item) => sum + occurrenceBase(state, item), 0);
export const canBeAssigned = (state: State | undefined, freelancer: Freelancer) => {
  if (!isHired(freelancer)) return false;
  const steps = setupSteps(state, freelancer);
  return steps.filter((step) => step.gate).every((step) => step.done);
};

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
  if (report.freelancerReport || report.numbers || report.freelancerReports?.length) return true;
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
/** Part of the monthly plan: from a package or set for this client, and not an add-on. */
export const isPlanAsset = (asset: ClientAsset) => asset.kind === "piece" && asset.source !== "add-on";

export function planSlot(client: Client, posts: Post[], month: string, format: string) {
  const usage = assetUsage(client, posts.filter((post) => !post.extra), month);
  const matches = usage.filter((item) => isPlanAsset(item.asset) && item.asset.period === "month" && formatGroup(item.asset.format) === formatGroup(format));
  const pick = matches.find((item) => item.used < item.asset.qty) ?? matches[0];
  return pick ? { asset: pick.asset, used: pick.used, qty: pick.asset.qty, over: pick.used >= pick.asset.qty } : undefined;
}

/** A post saved by the freelancer that has not been sent for review yet. */
export const isDraft = (post: Post) => post.status === "Copy in progress" && !post.history.some((entry) => /Submitted|Sent /.test(entry.text));

export const periodLabel = (asset: Pick<ClientAsset, "qty" | "period">) => `${asset.qty} a ${asset.period}`;

// ─── Reviews: the team and freelancers only, unless a client asked to see something ───
export const inReview = (post: Post) => post.status === "Copy review" || post.status === "Design review";
