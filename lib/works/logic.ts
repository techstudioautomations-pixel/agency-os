import type { CheckItem, Client, Freelancer, Idea, Person, Post, PostStatus, Route, State } from "./types";
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

export const nextStatus: Partial<Record<PostStatus, PostStatus>> = {
  "Copy in progress": "Copy review",
  "Copy review": "Design in progress",
  "Design in progress": "Design review",
  "Ready to schedule": "Scheduled",
  Scheduled: "Published",
};

// ─── The one queue: everything waiting on someone ───
export type QueueItem = {
  id: string;
  who: string;
  severity: 0 | 1 | 2; // 2 = overdue
  kind: "Review" | "Fix" | "Client" | "Schedule" | "Checklist" | "Report" | "Invoice" | "Lead" | "Freelancer" | "Plan" | "Ideas";
  verb: string;
  detail: string;
  clientId?: string;
  route: Route;
};

export function buildQueue(state: State): QueueItem[] {
  const items: QueueItem[] = [];
  const { settings } = state;
  const lastMonth = shiftMonth(state.month, -1);
  const dayOfMonth = Number(todayIso().slice(8, 10));

  for (const post of state.posts) {
    const client = state.clients.find((item) => item.id === post.clientId);
    if (!client) continue;
    const turn = turnOf(state, post);
    if (!turn.who || turn.tone === "done") continue;
    const waited = daysSince(post.waitingSince);
    const route: Route = { view: "client", clientId: client.id, tab: "marketing", sub: "content", postId: post.id };
    const overdue = (turn.tone === "review" && waited >= settings.escalationDays) || (turn.tone === "client" && waited >= settings.clientApprovalDays);
    items.push({
      id: `post-${post.id}`,
      who: turn.who,
      severity: overdue ? 2 : turn.tone === "review" || turn.tone === "client" ? 1 : 0,
      kind: turn.tone === "review" ? "Review" : turn.tone === "client" ? "Client" : post.status === "Ready to schedule" ? "Schedule" : turn.verb.startsWith("Fix") ? "Fix" : "Review",
      verb: turn.verb,
      detail: `${post.title}${waited > 0 && turn.tone !== "freelancer" ? ` · waiting ${waited} day${waited === 1 ? "" : "s"}` : ""}`,
      clientId: client.id,
      route,
    });
    // Escalation: nothing reviewed after X days also lands with María.
    if (turn.tone === "review" && waited >= settings.escalationDays && turn.who !== "maria") {
      items.push({ id: `esc-${post.id}`, who: "maria", severity: 2, kind: "Review", verb: "Escalated: not reviewed", detail: `${post.title} · ${waited} days with ${nameOf(state, turn.who)}`, clientId: client.id, route });
    }
  }

  for (const client of state.clients) {
    const route: Route = { view: "client", clientId: client.id, tab: "checklist" };
    const g = gate(client.checklist);
    if (g.light !== "green") {
      items.push({ id: `gate-${client.id}`, who: client.stage === "Onboarding" ? client.ownerId === "gareth" ? "maria" : client.ownerId : client.opsId, severity: g.light === "red" ? 1 : 0, kind: "Checklist", verb: g.light === "red" ? "Checklist: not asked yet" : "Checklist: chase", detail: g.blocking.slice(0, 2).map((item) => item.label.split(":")[0]).join(" · ") + (g.blocking.length > 2 ? ` · +${g.blocking.length - 2}` : ""), clientId: client.id, route });
    }
    if (!client.freelancerId && client.stage !== "Paused") {
      items.push({ id: `fl-${client.id}`, who: "maria", severity: 1, kind: "Freelancer", verb: "Assign a freelancer", detail: "Nobody is producing this account", clientId: client.id, route: { view: "client", clientId: client.id, tab: "overview" } });
    }
    // Monthly plan: ideas need deciding before the plan date.
    const undecided = state.ideas.filter((idea) => idea.clientId === client.id && idea.decision === "New").length;
    if (undecided > 0) {
      items.push({ id: `ideas-${client.id}`, who: reviewerFor(state, client), severity: dayOfMonth > settings.dates.plan ? 1 : 0, kind: "Ideas", verb: `Decide ${undecided} idea${undecided === 1 ? "" : "s"}`, detail: "Approve, maybe or reject", clientId: client.id, route: { view: "client", clientId: client.id, tab: "marketing", sub: "ideas" } });
    }
    const plan = client.planApproval[state.month];
    if (client.approvalMode !== "C" && client.stage === "Live" && plan?.status !== "Approved" && dayOfMonth > settings.dates.plan) {
      items.push({ id: `plan-${client.id}`, who: client.opsId, severity: 1, kind: "Plan", verb: plan?.status === "Sent" ? "Chase plan approval" : "Send the month's plan", detail: `Plan was due by the ${settings.dates.plan}th`, clientId: client.id, route: { view: "client", clientId: client.id, tab: "marketing", sub: "ideas" } });
    }
    // Month-end report for last month.
    if (client.stage === "Live" && client.startDate.slice(0, 7) <= lastMonth) {
      const report = state.reports.find((item) => item.clientId === client.id && item.month === lastMonth);
      const reportRoute: Route = { view: "client", clientId: client.id, tab: "reporting" };
      if (!report?.numbers) items.push({ id: `nums-${client.id}`, who: client.freelancerId ?? client.opsId, severity: dayOfMonth > 5 ? 2 : 1, kind: "Report", verb: `Hand in ${monthName(lastMonth).split(" ")[0]} numbers`, detail: "Metrics, screenshots and observations", clientId: client.id, route: reportRoute });
      else if (!report.checked) items.push({ id: `check-${client.id}`, who: client.opsId, severity: 1, kind: "Report", verb: "Check the numbers", detail: `${monthName(lastMonth).split(" ")[0]} report`, clientId: client.id, route: reportRoute });
      else if (!report.approved) items.push({ id: `appr-${client.id}`, who: "maria", severity: 1, kind: "Report", verb: "Approve report", detail: `${monthName(lastMonth).split(" ")[0]} report`, clientId: client.id, route: reportRoute });
      else if (!report.sentAt) items.push({ id: `send-${client.id}`, who: client.opsId, severity: dayOfMonth > 7 ? 2 : 1, kind: "Report", verb: "Send report to client", detail: `${monthName(lastMonth).split(" ")[0]} report is approved`, clientId: client.id, route: reportRoute });
    }
  }

  for (const invoice of state.invoices.filter((item) => item.month === state.month)) {
    const client = state.clients.find((item) => item.id === invoice.clientId);
    if (!client || invoice.status === "Paid") continue;
    items.push({ id: `inv-${client.id}`, who: "maria", severity: invoice.status === "Not sent" ? 1 : daysSince(invoice.date) > 14 ? 2 : 0, kind: "Invoice", verb: invoice.status === "Not sent" ? "Send invoice" : "Chase payment", detail: invoice.status === "Sent" ? `Sent ${ago(invoice.date)}` : monthName(state.month), clientId: client.id, route: { view: "finance" } });
  }

  for (const lead of state.leads.filter((item) => !["Won", "Lost"].includes(item.stage) && item.followUp && item.followUp <= todayIso())) {
    items.push({ id: `lead-${lead.id}`, who: lead.ownerId, severity: lead.followUp < todayIso() ? 2 : 1, kind: "Lead", verb: "Follow up", detail: `${lead.company} · ${lead.stage}`, route: { view: "leads", leadId: lead.id } });
  }

  for (const person of state.freelancers.filter((item) => item.status === "Trial")) {
    const open = missing(person.checklist).filter((item) => !item.soft).length;
    if (open) items.push({ id: `flc-${person.id}`, who: "niamh", severity: 0, kind: "Freelancer", verb: "Finish freelancer setup", detail: `${person.name} · ${open} items, NDA first`, route: { view: "freelancers", freelancerId: person.id } });
  }

  return items.sort((a, b) => b.severity - a.severity);
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

export const ideaColors: Record<Idea["decision"], { bg: string; ink: string; ring: string }> = {
  New: { bg: "#FFFFFF", ink: "#3A3F47", ring: "#E3E0DA" },
  Approved: { bg: "#E6F5EA", ink: "#1D7A3A", ring: "#9FD7B0" },
  Maybe: { bg: "#FFF4D6", ink: "#8A5A00", ring: "#F2CF73" },
  Rejected: { bg: "#F3F2EF", ink: "#8C8780", ring: "#E3E0DA" },
};
