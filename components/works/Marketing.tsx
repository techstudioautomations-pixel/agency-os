"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, ChevronDown, ClipboardCopy, ExternalLink, FileUp, LayoutGrid, MessageCircle, Plus, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { agreedFor, areaItems, isDraft, monthlyAreas, docxText, inReview, needsMe, progress, stageOf, isFreelancer, isMarketing, monthName, myClients, nameOf, personById, shortDate, splitIdeas, todayIso, turnOf } from "@/lib/works/logic";
import type { Client, Idea, IdeaDecision, Persona, Pillar, Post, ReportNumbers, Strategy } from "@/lib/works/types";
import { Shell } from "./Shell";
import { PostArt } from "./PostArt";
import { PostReview } from "./PostView";
import { MonthChecklist } from "./Monthly";
import { ReviewMode } from "./ReviewMode";
import { PackPane, packDocs, type DocKey } from "./StarterPack";
import { ExtraWork } from "./ExtraWork";
import { UpdatesList } from "./Updates";
import { ChannelIcon } from "./ChannelIcon";
import { extrasFor } from "@/lib/works/logic";
import { researchFromFile, researchFromText, type Research } from "@/lib/works/research";
import { AttachField, Avatar, Button, Card, CardHead, Chip, ClientMark, Empty, Field, Segmented, fieldClass, tone } from "./kit";

const formats = ["Carousel", "Single image", "Reel", "Text post", "Newsletter"];
const pillarPalette = ["#2F6FDB", "#1D9E5A", "#E08A1E", "#8E5CD9", "#E0567A", "#0F8F8F"];

export const statusTone = (post: Post) => {
  const stage = stageOf(post.status);
  if (post.status === "Published") return { label: "Live", t: "green" as const };
  if (post.status === "Scheduled") return { label: `Scheduled ${shortDate(post.date)}`, t: "blue" as const };
  if (post.status === "Ready to schedule") return { label: "Approved", t: "green" as const };
  if (stage === 2) return { label: "With client", t: "amber" as const };
  if (post.status.endsWith("review")) return { label: post.status, t: "purple" as const };
  const changes = post.comments.some((comment) => comment.kind === "change" && !comment.resolved);
  return { label: changes ? "Changes requested" : post.status, t: changes ? ("red" as const) : ("grey" as const) };
};

// ─── Page ───
const packTabs: Record<string, DocKey> = { "pack-brand": "brand", "pack-brain": "brain", "pack-templates": "templates" };

export function MarketingPage({ clientId, tab, postId, filter }: { clientId?: string; tab?: string; postId?: string; filter?: string }) {
  const { state, go } = useStore();
  const [packOpen, setPackOpen] = useState(false);
  const clients = myClients(state).filter(isMarketing);
  // Someone with only one client has nothing to switch between, so open that client straight away.
  const client = clients.find((item) => item.id === clientId) ?? (clients.length === 1 ? clients[0] : undefined);
  const scope = client ? client.id : "all";
  const post = postId ? state.posts.find((item) => item.id === postId) : undefined;
  if (post) {
    const postClient = state.clients.find((item) => item.id === post.clientId)!;
    return <PostReview key={post.id} post={post} client={postClient} backScope={scope} />;
  }

  const requested = tab ?? "posts";
  const current = !client && (requested in packTabs || requested === "month") ? "posts" : requested === "strategy" || requested === "results" ? "posts" : requested;
  const inScope = (item: { clientId: string }) => (client ? item.clientId === client.id : clients.some((c) => c.id === item.clientId));
  const mineCount = (id?: string) => state.posts.filter((item) => (id ? item.clientId === id : inScope(item)) && item.date.startsWith(state.month) && needsMe(state, item)).length;
  const monthAreas = client ? monthlyAreas(state, client).filter((area) => !isFreelancer(state) || area.id === "freelancer") : [];
  const extraCount = isFreelancer(state) ? extrasFor(state, state.me).filter((item) => !client || item.client.id === client.id).length : 0;
  const monthOpen = monthAreas.reduce((sum, area) => sum + area.steps.filter((step) => !step.done).length, 0);
  const to = (patch: { clientId?: string; tab?: string }) => go({ view: "marketing", clientId: patch.clientId ?? scope, tab: patch.tab ?? current });
  const packProgress = client ? progress(["brain", "brand", "templates", "handoff"].flatMap((id) => areaItems(client.checklist, id))) : undefined;

  const railItem = (value: string, label: string, count?: number, sub?: { color: string; ready: boolean }) => (
    <button key={value} onClick={() => to({ tab: value })} aria-current={current === value} className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-[14px] font-semibold transition lg:w-full ${sub ? "lg:ml-3 lg:w-[calc(100%-0.75rem)]" : ""} ${current === value ? "bg-[#1E2430] text-white" : "text-[#3D4450] hover:bg-white"}`}>
      {sub && <span className="h-4 w-1 shrink-0 rounded-full" style={{ background: sub.color }} />}
      <span className="flex-1 whitespace-nowrap lg:whitespace-normal">{label}</span>
      {sub?.ready && <Check size={14} className={current === value ? "text-white" : "text-[#17804A]"} />}
      {!!count && <span className={`rounded-full px-1.5 text-[11px] font-bold ${current === value ? "bg-white/20 text-white" : "bg-[#E9E6E0] text-[#55514B]"}`}>{count}</span>}
    </button>
  );

  return (
    <Shell
      title="Marketing"
      sub={`${monthName(state.month)} · ${mineCount() ? `${mineCount()} post${mineCount() === 1 ? "" : "s"} waiting on you` : "nothing waiting on you"}`}
      actions={<ClientPicker clients={clients} scope={scope} onPick={(id) => to({ clientId: id, tab: id !== "all" ? current : current in packTabs || current === "month" ? "posts" : current })} count={mineCount} />}
    >
      <div className="grid gap-5 lg:grid-cols-[232px_minmax(0,1fr)]">
        <nav aria-label="Marketing sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-4 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:px-0 lg:pb-0">
          {client && (
            <>
              <button onClick={() => setPackOpen(!packOpen)} aria-expanded={packOpen || current in packTabs} className="flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-[14px] font-bold text-[#1E2430] hover:bg-white lg:w-full">
                <span className="flex-1 whitespace-nowrap lg:whitespace-normal">{isFreelancer(state) ? "Your starter pack" : "Freelancer starter pack"}</span>
                {packProgress && packProgress.percent < 100 && <span className="text-[11px] font-semibold text-[#B7864B]">{packProgress.percent}%</span>}
                <ChevronDown size={15} className={`text-[#8B867E] transition ${packOpen || current in packTabs ? "" : "-rotate-90"}`} />
              </button>
              {(packOpen || current in packTabs) && packDocs(client).map((doc) => {
                const items = areaItems(client.checklist, doc.key);
                return railItem(`pack-${doc.key}`, doc.label, undefined, { color: doc.color, ready: items.length > 0 && items.every((item) => item.status === "Received" || item.status === "N/A") });
              })}
              <div className="mx-2 my-1 hidden border-t border-[#E9E6E0] lg:block" />
            </>
          )}
          {railItem("posts", "Posts", state.posts.filter((item) => inScope(item) && item.date.startsWith(state.month)).length)}
          {railItem("updates", "Updates", state.updates.filter((item) => (client ? item.clientId === client.id : clients.some((entry) => entry.id === item.clientId)) && item.date.startsWith(state.month)).length)}
          {railItem("ideas", "Ideas", state.ideas.filter((idea) => inScope(idea) && idea.month === state.month && idea.decision === "New").length)}
          {railItem("calendar", "Calendar")}
          {client && monthAreas.length > 0 && railItem("month", isFreelancer(state) ? "My checklist" : "This month", monthOpen)}
          {(extraCount > 0 || current === "extra") && isFreelancer(state) && railItem("extra", "Extra work", extraCount)}
        </nav>

        <div className="min-w-0">
          {client && current in packTabs && <PackPane key={`${client.id}-${current}`} client={client} docKey={packTabs[current]} />}
          {current === "posts" && <PostBoard key={scope} client={client} scope={scope} initial={filter} />}
          {current === "calendar" && <PlanCalendar client={client} scope={scope} />}
          {current === "updates" && <UpdatesList client={client} />}
          {current === "ideas" && <IdeasView client={client} />}
          {client && current === "month" && (
            <div className="space-y-5">
              {monthAreas.map((area) => <div key={area.id} className="rounded-2xl border border-[#E9E6E0] bg-white p-5"><MonthChecklist client={client} area={area} month={state.month} /></div>)}
            </div>
          )}
          {current === "extra" && isFreelancer(state) && <ExtraWork personId={state.me} clientId={client?.id} />}
        </div>
      </div>
    </Shell>
  );
}

/** The client switcher: a pill at the top right that opens a list with logos. */
function ClientPicker({ clients, scope, onPick, count }: { clients: Client[]; scope: string; onPick: (id: string) => void; count: (id?: string) => number }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const selected = clients.find((item) => item.id === scope);
  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => { if (box.current && !box.current.contains(event.target as Node)) setOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const choose = (id: string) => { setOpen(false); onPick(id); };
  const badge = (n: number) => n > 0 && <span className="rounded-full bg-[#D64545] px-1.5 text-[11px] font-bold text-white">{n}</span>;

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} className="flex min-w-[210px] items-center gap-2.5 rounded-xl border border-[#E2DED7] bg-white py-1.5 pl-1.5 pr-3 text-left shadow-sm hover:border-[#C9C3B8]">
        {selected ? <ClientMark client={selected} size={32} /> : <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1E2430] text-white"><LayoutGrid size={16} /></span>}
        <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{selected ? selected.name : "All clients"}</span>
        <ChevronDown size={16} className={`shrink-0 text-[#8B867E] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="listbox" aria-label="Choose a client" className="absolute left-0 top-full z-30 mt-2 max-h-[62vh] sm:left-auto sm:right-0 w-[290px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-[#E9E6E0] bg-white p-1.5 shadow-[0_18px_44px_rgba(30,36,48,.16)]">
          <button role="option" aria-selected={scope === "all"} onClick={() => choose("all")} className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-[#F6F5F2] ${scope === "all" ? "bg-[#F6F5F2]" : ""}`}>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1E2430] text-white"><LayoutGrid size={16} /></span>
            <span className="flex-1 text-[14px] font-bold">All clients</span>
            {badge(count())}
            {scope === "all" && <Check size={15} className="text-[#2F6FDB]" />}
          </button>
          <div className="mx-2 my-1 border-t border-[#F0EEE9]" />
          {clients.map((item) => (
            <button key={item.id} role="option" aria-selected={scope === item.id} onClick={() => choose(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-[#F6F5F2] ${scope === item.id ? "bg-[#F6F5F2]" : ""}`}>
              <ClientMark client={item} size={32} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold">{item.name}</span><span className="block truncate text-[12px] text-[#8B867E]">{item.sector}</span></span>
              {badge(count(item.id))}
              {scope === item.id && <Check size={15} className="text-[#2F6FDB]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Posts ───
export function PostTile({ post, showClient, scope, onOpen }: { post: Post; showClient: boolean; scope: string; onOpen?: () => void }) {
  const { state, go } = useStore();
  const client = state.clients.find((item) => item.id === post.clientId)!;
  const turn = turnOf(state, post);
  const mine = turn.who === state.me;
  const status = statusTone(post);
  const comments = post.comments.filter((comment) => comment.kind !== "system").length;
  const person = personById(state, turn.who);
  return (
    <button onClick={() => (onOpen ? onOpen() : go({ view: "marketing", clientId: scope, postId: post.id }))} className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(30,36,48,.10)] ${mine ? "border-[#2F6FDB] shadow-[0_0_0_2px_rgba(47,111,219,.18)]" : "border-[#E9E6E0]"}`}>
      <div className="relative">
        <PostArt post={post} client={client} rounded="rounded-none" />
        <span className="absolute bottom-2 left-2"><Chip t={isDraft(post) ? "grey" : status.t} className="shadow-sm">{isDraft(post) ? "Draft" : status.label}</Chip></span>
        <span className="absolute bottom-2 right-2 flex -space-x-1">{post.platforms.map((name) => <span key={name} className="rounded-md ring-2 ring-white"><ChannelIcon name={name} size={20} /></span>)}</span>
        {post.extra && <span className="absolute right-2 top-2 rounded-full bg-[#1E2430] px-2.5 py-1 text-[11px] font-bold text-white shadow">{post.extraType ?? "Extra"}</span>}
      </div>
      <div className="flex flex-1 flex-col p-3">
        {showClient && <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-[#55514B]"><ClientMark client={client} size={16} />{client.name}</div>}
        <div className="line-clamp-2 text-[13px] font-bold leading-snug">{post.title}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#8B867E]">
          <span>{post.format}</span>·<span>{post.platforms.join(", ")}</span>
          {comments > 0 && <span className="ml-auto inline-flex items-center gap-0.5"><MessageCircle size={11} />{comments}</span>}
        </div>
        {turn.who && (
          <div className={`mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold ${mine ? "bg-[#2F6FDB] text-white" : "bg-[#F6F5F2] text-[#55514B]"}`}>
            {!mine && person && <Avatar name={person.name} color={person.color} size={16} />}
            <span className="truncate">{mine ? turn.verb : `${person?.name ?? "Unassigned"} · ${turn.verb}`}</span>
          </div>
        )}
      </div>
    </button>
  );
}

function PostBoard({ client, scope, initial }: { client?: Client; scope: string; initial?: string }) {
  const { state, go, openPostWizard } = useStore();
  const freelancer = isFreelancer(state);
  const clients = myClients(state).filter(isMarketing);
  const posts = state.posts
    .filter((post) => (client ? post.clientId === client.id : clients.some((c) => c.id === post.clientId)) && post.date.startsWith(state.month))
    .sort((a, b) => a.date.localeCompare(b.date));
  const inList = (statuses: string[]) => (post: Post) => statuses.includes(post.status);
  // One group per step of the journey, so every post is in exactly one place.
  const groups: Record<string, (post: Post) => boolean> = {
    approval: inList(["Copy review", "Design review"]),
    freelancer: inList(["Copy in progress", "Design in progress"]),
    ...(clients.some((c) => c.approvalMode !== "C") ? { client: inList(["Client approval"]) } : {}),
    approved: inList(["Ready to schedule"]),
    posted: inList(["Scheduled", "Published"]),
    all: () => true,
  };
  const order = (freelancer ? ["freelancer", "approval", "approved", "posted", "client", "all"] : ["approval", "freelancer", "client", "approved", "posted", "all"]).filter((key) => key in groups);
  const labels: Record<string, string> = freelancer
    ? { freelancer: "Needs me", approval: "In review", client: "With client", approved: "Approved · schedule", posted: "Scheduled & posted", all: "All" }
    : { approval: "Needs approval", freelancer: "With freelancer", client: "With client", approved: "Approved", posted: "Scheduled & posted", all: "All" };
  const wanted = initial === "review" || initial === "mine" ? undefined : initial;
  const [filter, setFilter] = useState(wanted && wanted in groups ? wanted : order[0]);
  const [reviewing, setReviewing] = useState<{ ids: string[]; start: number } | null>(null);
  const shown = posts.filter(groups[filter] ?? groups.all);
  const reviewIds = posts.filter(groups.approval).map((post) => post.id);
  const open = (post: Post) => (!freelancer && groups.approval(post) ? () => setReviewing({ ids: reviewIds, start: reviewIds.indexOf(post.id) }) : undefined);
  const agreed = client ? agreedFor(client, state.month) : clients.filter((c) => c.stage === "Live").reduce((sum, c) => sum + agreedFor(c, state.month), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={filter} onChange={setFilter} options={order.map((key) => ({ value: key, label: labels[key], count: posts.filter(groups[key]).length }))} />
        <div className="flex items-center gap-3 text-[13px]">
          <span className="font-semibold text-[#55514B]">{posts.filter((post) => !post.extra).length} of {agreed} agreed posts planned{posts.some((post) => post.extra) ? ` · ${posts.filter((post) => post.extra).length} extra` : ""}</span>
          <Button kind="primary" onClick={() => openPostWizard({ clientId: client?.id })}><Plus size={15} />Create post</Button>
        </div>
      </div>
      {reviewing && <ReviewMode ids={reviewing.ids} start={reviewing.start} onClose={() => setReviewing(null)} />}
      {filter === order[0] && shown.length === 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#CFE8D9] bg-[#EAF6EF] px-5 py-4 text-[14px] font-semibold text-[#17804A]"><Check size={18} />{freelancer ? "Nothing needs you right now." : "Nothing is waiting for your approval."}</div>
      )}
      {filter === order[0] && shown.length === 0 && posts.filter((post) => !groups.posted(post) && !groups.approved(post)).length > 0 && (
        <div>
          <h3 className="mb-2 text-[15px] font-bold">Still moving</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{posts.filter((post) => !groups.posted(post) && !groups.approved(post)).map((post) => <PostTile key={post.id} post={post} showClient={!client} scope={scope} onOpen={open(post)} />)}</div>
        </div>
      )}
      {filter !== order[0] && shown.length === 0 && <Empty title="No posts here">Try another filter or month.</Empty>}
      {shown.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {shown.map((post) => <PostTile key={post.id} post={post} showClient={!client} scope={scope} onOpen={open(post)} />)}
        </div>
      )}
    </div>
  );
}

// ─── Calendar with agreed slots and drag-and-drop ───
function suggestedDays(year: number, month: number, count: number, fromDay = 1) {
  const days = new Date(year, month, 0).getDate();
  const weekdays = Array.from({ length: days }, (_, index) => index + 1).filter((day) => day >= fromDay).filter((day) => { const weekday = new Date(year, month - 1, day).getDay(); return weekday >= 2 && weekday <= 4; });
  if (!count || !weekdays.length) return [];
  const step = weekdays.length / count;
  return Array.from({ length: count }, (_, index) => weekdays[Math.min(weekdays.length - 1, Math.floor(index * step + step / 2))]);
}

function PlanCalendar({ client, scope }: { client?: Client; scope: string }) {
  const { state, go, movePost, openPostWizard } = useStore();
  const clients = myClients(state).filter(isMarketing);
  const [dragging, setDragging] = useState("");
  const [over, setOver] = useState("");
  const [year, month] = state.month.split("-").map(Number);
  const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const days = new Date(year, month, 0).getDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  const posts = state.posts.filter((post) => (client ? post.clientId === client.id : clients.some((c) => c.id === post.clientId)) && post.date.startsWith(state.month));
  const today = todayIso();
  const fromDay = state.month === today.slice(0, 7) ? Number(today.slice(8, 10)) + 1 : state.month < today.slice(0, 7) ? 99 : 1;
  const planned = posts.filter((post) => !post.extra).length;
  const missingCount = client ? Math.max(0, agreedFor(client, state.month) - planned) : 0;
  const freeSlots = client ? suggestedDays(year, month, missingCount, fromDay).filter((day) => !posts.some((post) => post.date === `${state.month}-${String(day).padStart(2, "0")}`)) : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#55514B]">
        <span className="font-semibold">Drag a post to another day to move it. Click one to open it.</span>
        {client && <span>{planned} of {agreedFor(client, state.month)} agreed posts have a date{freeSlots.length ? ` · ${freeSlots.length} open slot${freeSlots.length === 1 ? "" : "s"} suggested` : ""}</span>}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#E9E6E0] bg-white">
        <div className="grid min-w-[1000px] grid-cols-7">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => <div key={name} className="border-b border-[#F0EEE9] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#8B867E]">{name}</div>)}
          {Array.from({ length: cells }, (_, index) => {
            const day = index - offset + 1;
            const valid = day > 0 && day <= days;
            const iso = valid ? `${state.month}-${String(day).padStart(2, "0")}` : "";
            const items = posts.filter((post) => post.date === iso);
            const slot = valid && freeSlots.includes(day);
            return (
              <div
                key={index}
                onDragOver={(event) => { if (valid) { event.preventDefault(); setOver(iso); } }}
                onDragLeave={() => setOver("")}
                onDrop={() => { if (dragging && iso) movePost(dragging, iso); setDragging(""); setOver(""); }}
                className={`relative flex min-h-[230px] flex-col gap-1.5 border-b border-r border-[#F0EEE9] p-2 transition ${over && over === iso ? "bg-[#EAF1FD]" : iso === today ? "bg-[#FBFCFF]" : !valid ? "bg-[#FBFAF8]" : ""}`}
              >
                {valid && <div className={`text-[12px] font-extrabold ${iso === today ? "text-[#1F5BC4]" : "text-[#A8A39B]"}`}>{day}</div>}
                {items.map((post) => {
                  const postClient = state.clients.find((item) => item.id === post.clientId)!;
                  const status = statusTone(post);
                  const draft = isDraft(post);
                  return (
                    <button key={post.id} draggable={post.status !== "Published"} onDragStart={() => setDragging(post.id)} onDragEnd={() => setDragging("")} onClick={() => go({ view: "marketing", clientId: scope, postId: post.id })} className={`group relative min-h-[150px] flex-1 overflow-hidden rounded-xl text-left shadow-sm ring-1 ring-black/5 transition hover:shadow-md ${post.status === "Published" ? "" : "cursor-grab active:cursor-grabbing"}`}>
                      <div className="absolute inset-0"><PostArt post={post} client={postClient} fill rounded="rounded-none" className="transition duration-300 group-hover:scale-[1.03]" /></div>
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-2.5 pb-2 pt-10 text-white">
                        <span className="line-clamp-2 block text-[12px] font-bold leading-tight">{post.title}</span>
                        <span className="mt-1.5 flex items-center gap-1.5">
                          <span className="flex -space-x-1">{post.platforms.map((name) => <span key={name} className="rounded-[5px] ring-1 ring-white"><ChannelIcon name={name} size={16} /></span>)}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-[#1E2430]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: draft ? "#8B867E" : tone[status.t].dot }} />{draft ? "Draft" : status.label}</span>
                        </span>
                        {!client && <span className="mt-1 block text-[10px] font-semibold text-white/85">{postClient.name}</span>}
                      </span>
                      {post.extra && <span className="absolute right-1.5 top-1.5 rounded-full bg-[#1E2430] px-2 py-0.5 text-[10px] font-bold text-white">{post.extraType ?? "Extra"}</span>}
                    </button>
                  );
                })}
                {slot && client && (
                  <button onClick={() => openPostWizard({ clientId: client.id, date: iso })} className="grid min-h-[150px] flex-1 place-items-center rounded-xl border-2 border-dashed border-[#D6D1C8] text-center text-[12px] font-semibold text-[#8B867E] hover:border-[#2F6FDB] hover:text-[#1F5BC4]">
                    <span><Plus size={16} className="mx-auto mb-1" />Open slot</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-[12px] text-[#6B6760]">
        {([["Draft or being made", tone.grey.dot], ["In review", tone.purple.dot], ["With client", tone.amber.dot], ["Scheduled", tone.blue.dot], ["Approved / live", tone.green.dot]] as const).map(([label, dot]) => (
          <span key={label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />{label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Ideas ───
/** Colours follow the document legend: yellow is a carousel to make, blue a text post to make, red is rejected, green is already made. */
const decisionStyle: Record<IdeaDecision, { bar: string; label: string; hint: string }> = {
  New: { bar: "#B9B3A8", label: "To decide", hint: "Waiting for a yes or no." },
  Approved: { bar: "#E8B923", label: "Use", hint: "Approved. Press Create post to turn it into a post. Yellow is a carousel, blue is a text post." },
  Maybe: { bar: "#8E5CD9", label: "Maybe later", hint: "Kept for another month." },
  Rejected: { bar: "#D64545", label: "Rejected", hint: "Not relevant. Nothing to do." },
  Done: { bar: "#1D9E5A", label: "Already made", hint: "Already created or scheduled before it was added here. Nothing to do." },
};
const ideaBar = (idea: Idea) => (idea.decision === "Approved" && idea.format === "Text post" ? "#4A86E8" : decisionStyle[idea.decision].bar);

function IdeasView({ client }: { client?: Client }) {
  const { state, importResearch, updateIdea, openPostWizard, go, ping } = useStore();
  const freelancer = isFreelancer(state);
  const clients = myClients(state).filter(isMarketing);
  const [filter, setFilter] = useState<IdeaDecision | "All">(freelancer ? "Approved" : "New");
  const [allMonths, setAllMonths] = useState(false);
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState("");
  const [source, setSource] = useState("Pasted text");
  const [fileResearch, setFileResearch] = useState<Research | null>(null);
  const [include, setInclude] = useState({ facts: true, ctas: true, ideas: true });
  const [dragging, setDragging] = useState(false);
  const [openId, setOpenId] = useState("");
  const [filed, setFiled] = useState<{ source: string; clientId: string; counts: Record<IdeaDecision, number>; facts: number; ctas: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const ideas = state.ideas.filter((idea) => (client ? idea.clientId === client.id : clients.some((c) => c.id === idea.clientId)) && (allMonths || idea.month === state.month));
  const shown = ideas.filter((idea) => filter === "All" || idea.decision === filter);
  const parsed: Research | null = text.trim() ? researchFromText(text) : fileResearch;
  const counts = (decision: string) => parsed?.ideas.filter((idea) => idea.decision === decision).length ?? 0;
  const importable = (include.ideas ? parsed?.ideas.length ?? 0 : 0) + (include.facts ? parsed?.facts.length ?? 0 : 0) + (include.ctas ? parsed?.ctas.length ?? 0 : 0);

  async function readFile(file: File) {
    try {
      const research = await researchFromFile(file);
      setText("");
      setFileResearch(research);
      setSource(file.name);
      setInclude({ facts: true, ctas: true, ideas: true });
      setImporting(true);
    } catch (error) {
      ping(error instanceof Error ? error.message : "Could not read that file");
    }
  }
  function closeImport() { setImporting(false); setText(""); setFileResearch(null); }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={filter} onChange={setFilter} options={(["New", "Approved", "Maybe", "Rejected", "Done", "All"] as const).filter((value) => value !== "Done" || ideas.some((idea) => idea.decision === "Done")).map((value) => ({ value, label: value === "All" ? "All" : <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full not-italic" style={{ background: decisionStyle[value].bar }} />{decisionStyle[value].label}</span>, count: value === "All" ? ideas.length : ideas.filter((idea) => idea.decision === value).length }))} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[13px] font-semibold text-[#55514B]"><input type="checkbox" checked={allMonths} onChange={(event) => setAllMonths(event.target.checked)} />All months</label>
          {client && (
            <>
              <Button onClick={() => fileInput.current?.click()}><FileUp size={15} />Upload document</Button>
              <Button kind="primary" onClick={() => { if (importing) closeImport(); else { setImporting(true); setSource("Pasted text"); } }}><Plus size={15} />Add ideas</Button>
            </>
          )}
          <input ref={fileInput} type="file" accept=".docx,.txt,.md,.csv,.pdf" className="sr-only" aria-label="Upload ideas document" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFile(file); event.target.value = ""; }} />
        </div>
      </div>

      {filed && (
        <Card>
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">Filed {filed.source}</div>
              <p className="mt-0.5 text-[13px] text-[#55514B]">Everything from the document is now in the app. Tap a number to see those ideas.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["New", "Approved", "Maybe", "Rejected", "Done"] as const).filter((decision) => filed.counts[decision] > 0).map((decision) => (
                  <button key={decision} onClick={() => { setAllMonths(true); setFilter(decision); }} className="inline-flex items-center gap-2 rounded-full border border-[#E2DED7] bg-white px-3.5 py-1.5 text-[13px] font-semibold hover:border-[#C9C3B8]"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: decisionStyle[decision].bar }} />{filed.counts[decision]} {decisionStyle[decision].label.toLowerCase()}</button>
                ))}
                {filed.facts > 0 && <button onClick={() => go({ view: "client", clientId: filed.clientId, tab: "strategy" })} className="rounded-full bg-[#EAF1FD] px-3.5 py-1.5 text-[13px] font-semibold text-[#1F5BC4]">{filed.facts} facts on the Strategy tab →</button>}
                {filed.ctas > 0 && <button onClick={() => go({ view: "client", clientId: filed.clientId, tab: "strategy" })} className="rounded-full bg-[#EAF1FD] px-3.5 py-1.5 text-[13px] font-semibold text-[#1F5BC4]">{filed.ctas} calls to action →</button>}
              </div>
            </div>
            <button onClick={() => setFiled(null)} aria-label="Dismiss" className="rounded-lg p-1.5 text-[#8B867E] hover:bg-[#F1F0ED]"><X size={16} /></button>
          </div>
        </Card>
      )}
      {freelancer && client && (
        <p className="rounded-xl bg-[#F1F6FE] px-4 py-2.5 text-[13px] text-[#1F5BC4]">Add your ideas here. Operations decides on each one: use, maybe later or reject. Press Create post on a “Use” idea to turn it into a post.</p>
      )}
      {filter !== "All" && <p className="flex items-center gap-2 text-[13px] text-[#6B6760]"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: decisionStyle[filter].bar }} />{decisionStyle[filter].hint}</p>}
      {importing && client && (
        <Card>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
            <div
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files?.[0]; if (file) readFile(file); }}
              className={`rounded-2xl border-2 border-dashed p-4 transition ${dragging ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#D6D1C8]"}`}
            >
              <div className="text-[14px] font-bold">{fileResearch && !text.trim() ? source : "Drop a document here, or paste the text"}</div>
              <p className="mt-0.5 text-[12px] text-[#6B6760]">Word (.docx), .txt and .md are read. PDFs are not read yet: save it as Word, or paste the text. A Word file also brings its highlight colours.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => fileInput.current?.click()}><FileUp size={14} />Choose a file</Button>
                {(fileResearch || text) && <Button size="sm" kind="ghost" onClick={() => { setText(""); setFileResearch(null); setSource("Pasted text"); }}>Clear</Button>}
              </div>
              <textarea value={text} onChange={(event) => { setText(event.target.value); setSource("Pasted text"); }} rows={7} aria-label="Paste the text" className={`${fieldClass} mt-3`} placeholder={"Paste a list of ideas, or a whole research document.\n\n1. Timber span: 4 things decide it – carousel\n2. Myth: you can always remove an internal wall – reel"} />
            </div>

            <div className="min-w-0">
              {!parsed || (!parsed.ideas.length && !parsed.facts.length && !parsed.ctas.length) ? (
                <p className="rounded-xl bg-[#F8F7F4] p-4 text-[13px] text-[#8B867E]">Add a document to see how it will be filed. Facts about the business go to the Strategy tab, calls to action go to a library, and ideas become cards.</p>
              ) : (
                <div className="space-y-3">
                  {parsed.facts.length > 0 && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E9E6E0] p-3">
                      <input type="checkbox" checked={include.facts} onChange={(event) => setInclude({ ...include, facts: event.target.checked })} className="mt-1 h-4 w-4" />
                      <span className="min-w-0 flex-1"><b className="text-[14px]">Business profile · {parsed.facts.length} facts</b><span className="block text-[12px] text-[#6B6760]">Go to {client.name}&apos;s Strategy tab: {parsed.facts.slice(0, 4).map((fact) => fact.label).join(", ")}{parsed.facts.length > 4 ? "…" : ""}</span></span>
                    </label>
                  )}
                  {parsed.ctas.length > 0 && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E9E6E0] p-3">
                      <input type="checkbox" checked={include.ctas} onChange={(event) => setInclude({ ...include, ctas: event.target.checked })} className="mt-1 h-4 w-4" />
                      <span className="min-w-0 flex-1"><b className="text-[14px]">Calls to action · {parsed.ctas.length}</b><span className="block text-[12px] text-[#6B6760]">Kept in a library to add to any caption: “{parsed.ctas[0].text.slice(0, 70)}{parsed.ctas[0].text.length > 70 ? "…" : ""}”</span></span>
                    </label>
                  )}
                  {parsed.ideas.length > 0 && (
                    <div className="rounded-xl border border-[#E9E6E0] p-3">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input type="checkbox" checked={include.ideas} onChange={(event) => setInclude({ ...include, ideas: event.target.checked })} className="mt-1 h-4 w-4" />
                        <span className="min-w-0 flex-1"><b className="text-[14px]">Ideas · {parsed.ideas.length} cards</b><span className="block text-[12px] text-[#6B6760]">{[counts("Approved") && `${counts("Approved")} to use`, counts("Done") && `${counts("Done")} already made`, counts("Rejected") && `${counts("Rejected")} rejected`, counts("New") && `${counts("New")} to decide`].filter(Boolean).join(" · ")}{parsed.ideas.some((idea) => idea.angle || idea.topic) ? `. ${parsed.ideas.filter((idea) => idea.angle || idea.topic).length} have a topic and content angle.` : ""}{parsed.ideas.some((idea) => idea.coloured) ? " Decisions come from the highlight colours." : ""}</span></span>
                      </label>
                      <div className="mt-2 max-h-[210px] space-y-1 overflow-y-auto rounded-lg bg-[#F8F7F4] p-1.5">
                        {parsed.ideas.map((idea, index) => (
                          <div key={index} className="flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-[12px]">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: decisionStyle[idea.decision].bar }} title={decisionStyle[idea.decision].label} />
                            <span className="min-w-0 flex-1 truncate font-semibold">{idea.title}</span>
                            <span className="shrink-0 text-[#8B867E]">{idea.format}{idea.group ? ` · ${idea.group.split(" · ")[0]}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button kind="primary" disabled={!importable} onClick={() => { const chosen = include.ideas ? parsed.ideas : []; importResearch(client.id, { facts: include.facts ? parsed.facts : [], ctas: include.ctas ? parsed.ctas : [], brief: include.facts ? parsed.brief : "", ideas: chosen, source }); setFiled({ source, clientId: client.id, counts: { New: chosen.filter((idea) => idea.decision === "New").length, Approved: chosen.filter((idea) => idea.decision === "Approved").length, Maybe: 0, Rejected: chosen.filter((idea) => idea.decision === "Rejected").length, Done: chosen.filter((idea) => idea.decision === "Done").length }, facts: include.facts ? parsed.facts.length : 0, ctas: include.ctas ? parsed.ctas.length : 0 }); closeImport(); setAllMonths(true); setFilter("All"); }}>File it all</Button>
                    <Button kind="ghost" onClick={closeImport}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {shown.length === 0 ? (
        <Empty title={filter === "New" ? "No ideas waiting for a decision" : "No ideas here"}>{client ? "Upload the freelancer's ideas document or add ideas by hand." : "Choose a client above to add ideas."}</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((idea) => {
            const ideaClient = state.clients.find((item) => item.id === idea.clientId)!;
            return <IdeaCard key={idea.id} idea={idea} client={ideaClient} showClient={!client} canDecide={!freelancer} onOpen={() => setOpenId(idea.id)} onChange={(patch) => updateIdea(idea.id, patch)} onMakePost={() => openPostWizard({ clientId: idea.clientId, ideaId: idea.id })} onOpenPost={() => go({ view: "marketing", clientId: client?.id ?? "all", postId: idea.postId })} />;
          })}
        </div>
      )}
      {(() => {
        const open = state.ideas.find((item) => item.id === openId);
        const openClient = open && state.clients.find((item) => item.id === open.clientId);
        return open && openClient ? <IdeaDetail idea={open} client={openClient} canDecide={!freelancer} onClose={() => setOpenId("")} onChange={(patch) => updateIdea(open.id, patch)} onMakePost={() => { setOpenId(""); openPostWizard({ clientId: open.clientId, ideaId: open.id }); }} onOpenPost={() => { setOpenId(""); go({ view: "marketing", clientId: open.clientId, postId: open.postId }); }} /> : null;
      })()}
    </div>
  );
}

function IdeaCard({ idea, client, showClient, canDecide, onOpen, onChange, onMakePost, onOpenPost }: { idea: Idea; client: Client; showClient: boolean; canDecide: boolean; onOpen: () => void; onChange: (patch: Partial<Idea>) => void; onMakePost: () => void; onOpenPost: () => void }) {
  const [note, setNote] = useState(false);
  const style = decisionStyle[idea.decision];
  const more = Boolean(idea.topic || idea.notes || idea.angle);
  return (
    <article className={`flex min-w-0 flex-col rounded-2xl border border-[#E9E6E0] bg-white p-4 ${idea.decision === "Rejected" ? "opacity-70" : ""}`} style={{ borderLeft: `5px solid ${ideaBar(idea)}` }}>
      <div className="flex flex-wrap items-center gap-1.5">
        {showClient && <span className="flex items-center gap-1.5 text-[12px] font-bold"><ClientMark client={client} size={18} />{client.name}</span>}
        {idea.group && <span className="rounded-full bg-[#F1ECFC] px-2.5 py-1 text-[11px] font-bold text-[#4A3596]">{idea.group.split(" · ")[0]}</span>}
        <select value={idea.format} onChange={(event) => onChange({ format: event.target.value })} aria-label="Format" className="rounded-full border border-[#E2DED7] bg-white px-2.5 py-1 text-[12px] font-semibold outline-none">
          {formats.map((format) => <option key={format}>{format}</option>)}
        </select>
      </div>
      <button onClick={onOpen} className="mt-2.5 text-left text-[15px] font-bold leading-snug hover:text-[#1F5BC4]">{idea.title}</button>
      {idea.topic && <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-[#3D4450]">{idea.topic}</p>}
      {idea.notes && <p className="mt-1 line-clamp-2 text-[13px] text-[#55514B]">{idea.notes}</p>}
      {more && <button onClick={onOpen} className="mt-1.5 self-start text-[12px] font-bold text-[#1F5BC4]">{idea.angle ? "See the topic and content angle →" : "See more →"}</button>}
      {idea.comment && !note && <p className="mt-2 rounded-lg bg-[#F6F5F2] px-2.5 py-1.5 text-[12px] italic text-[#55514B]">“{idea.comment}”</p>}
      {note && <textarea autoFocus value={idea.comment} onChange={(event) => onChange({ comment: event.target.value })} onBlur={() => setNote(false)} rows={2} placeholder="Why? Any direction for the freelancer?" className="mt-2 w-full rounded-lg border border-[#E2DED7] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#2F6FDB]" />}
      <div className="mt-auto pt-3">
        {idea.postId ? (
          <Button size="sm" className="w-full" onClick={onOpenPost}>Open the post <ArrowRight size={13} /></Button>
        ) : idea.decision === "Done" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F5EC] px-3 py-1 text-[12px] font-bold text-[#17804A]"><Check size={13} />Already made</span>
        ) : idea.decision === "Approved" ? (
          <Button size="sm" kind="primary" className="w-full" onClick={onMakePost}>Create post <ArrowRight size={13} /></Button>
        ) : canDecide ? (
          <div className="flex gap-1.5">
            {(["Approved", "Maybe", "Rejected"] as const).map((decision) => {
              const active = idea.decision === decision;
              const color = decisionStyle[decision].bar;
              return (
                <button key={decision} onClick={() => onChange({ decision: active ? "New" : decision })} aria-pressed={active} className="flex-1 rounded-lg px-2 py-1.5 text-[12px] font-bold transition" style={active ? { background: color, color: "#fff" } : { background: `${color}22`, color: "#3D4450" }}>
                  {decision === "Approved" ? "Use" : decision === "Maybe" ? "Maybe" : "Reject"}
                </button>
              );
            })}
            <button onClick={() => setNote(true)} aria-label="Comment" className="rounded-lg px-2 text-[#55514B] hover:bg-[#F1F0ED]"><MessageCircle size={15} /></button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: `${style.bar}22`, color: "#3D4450" }}><i className="inline-block h-2 w-2 rounded-full" style={{ background: style.bar }} />{style.label}</span>
        )}
      </div>
    </article>
  );
}

/** Everything the document said about one idea: the topic, why it matters and the draft copy. */
function IdeaDetail({ idea, client, canDecide, onClose, onChange, onMakePost, onOpenPost }: { idea: Idea; client: Client; canDecide: boolean; onClose: () => void; onChange: (patch: Partial<Idea>) => void; onMakePost: () => void; onOpenPost: () => void }) {
  const { ping } = useStore();
  const style = decisionStyle[idea.decision];
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); ping("Copied"); } catch { ping("Copy was blocked by the browser"); } };
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  const section = (label: string, text?: string, withCopy = false) => text ? (
    <section>
      <div className="mb-1 flex items-center gap-2"><h4 className="text-[11px] font-bold uppercase tracking-wide text-[#8B867E]">{label}</h4>{withCopy && <button onClick={() => copy(text)} className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-[#1F5BC4]"><ClipboardCopy size={13} />Copy</button>}</div>
      <p className="whitespace-pre-wrap rounded-xl bg-[#F8F7F4] px-4 py-3 text-[14px] leading-relaxed">{text}</p>
    </section>
  ) : null;
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-end bg-[#1E2430]/50 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={idea.title} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex max-h-[94vh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" style={{ borderTop: `6px solid ${ideaBar(idea)}` }}>
        <div className="flex items-start gap-3 px-6 pb-3 pt-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-[#55514B]">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold" style={{ background: `${style.bar}22` }}><i className="inline-block h-2 w-2 rounded-full" style={{ background: ideaBar(idea) }} />{style.label}</span>
              {idea.group && <span className="rounded-full bg-[#F1ECFC] px-2.5 py-1 font-bold text-[#4A3596]">{idea.group}</span>}
              <span>{client.name}</span>
            </div>
            <h2 className="mt-2 text-[21px] font-extrabold leading-tight">{idea.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-[#8B867E] hover:bg-[#F1F0ED]"><X size={18} /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-5">
          {section("Topic", idea.topic)}
          {section("Why it matters", idea.notes)}
          {section("Content angle · draft copy", idea.angle, true)}
          {!idea.topic && !idea.notes && !idea.angle && <p className="rounded-xl bg-[#F8F7F4] px-4 py-3 text-[13px] text-[#8B867E]">The document only had the title for this one.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] font-semibold text-[#55514B]">Type of post
              <select value={idea.format} onChange={(event) => onChange({ format: event.target.value })} className="mt-1 w-full rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[14px]">{formats.map((format) => <option key={format}>{format}</option>)}</select>
            </label>
            <div className="text-[12px] text-[#8B867E]"><div className="font-semibold text-[#55514B]">From</div><div className="mt-1 text-[13px]">{idea.source ?? "Added by hand"} · {idea.createdAt}</div></div>
          </div>
          {canDecide && !idea.postId && (
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">Decision</div>
              <div className="flex flex-wrap gap-1.5">
                {(["New", "Approved", "Maybe", "Rejected", "Done"] as const).map((decision) => (
                  <button key={decision} onClick={() => onChange({ decision })} aria-pressed={idea.decision === decision} className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold" style={idea.decision === decision ? { background: decisionStyle[decision].bar, borderColor: decisionStyle[decision].bar, color: "#fff" } : { borderColor: "#E2DED7" }}><i className="inline-block h-2 w-2 rounded-full" style={{ background: idea.decision === decision ? "#fff" : decisionStyle[decision].bar }} />{decisionStyle[decision].label}</button>
                ))}
              </div>
            </div>
          )}
          <label className="block text-[12px] font-semibold text-[#55514B]">Note for the freelancer
            <textarea value={idea.comment} onChange={(event) => onChange({ comment: event.target.value })} rows={2} placeholder="Any direction on how to make it" className="mt-1 w-full rounded-xl border border-[#E2DED7] px-3 py-2 text-[14px] outline-none focus:border-[#2F6FDB]" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-[#F0EEE9] bg-[#FBFAF8] px-6 py-4">
          <Button kind="ghost" onClick={onClose}>Close</Button>
          {idea.postId ? <Button className="ml-auto" kind="primary" onClick={onOpenPost}>Open the post <ArrowRight size={14} /></Button> : idea.decision === "Approved" ? <Button className="ml-auto" kind="primary" onClick={onMakePost}>Create post <ArrowRight size={14} /></Button> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Strategy: the client's marketing profile ───
export function StrategyView({ client }: { client: Client }) {
  const { state, updateClient, ping } = useStore();
  const readOnly = isFreelancer(state);
  const s = client.strategy;
  const facts = s.facts ?? [];
  const ctas = s.ctas ?? [];
  const [newCta, setNewCta] = useState("");
  const copyText = async (value: string) => { try { await navigator.clipboard.writeText(value); ping("Copied"); } catch { ping("Copy was blocked by the browser"); } };
  const set = (patch: Partial<Strategy>) => updateClient(client.id, { strategy: { ...s, ...patch } });
  const setPersona = (id: string, patch: Partial<Persona>) => set({ personas: s.personas.map((persona) => (persona.id === id ? { ...persona, ...patch } : persona)) });
  const [pillarName, setPillarName] = useState("");
  const answers = client.checklist.filter((item) => item.group.includes("Questionnaire"));
  const usage = (pillar: Pillar) => state.posts.filter((post) => post.clientId === client.id && post.pillarId === pillar.id && post.date.startsWith(state.month)).length;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <div className="space-y-5">
        <div className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${client.color}, #1E2430)` }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-[12px] font-bold uppercase tracking-[.14em] text-white/70">What {client.name} sells</div>
            {!readOnly && <button onClick={() => set({ approved: !s.approved })} className={`rounded-full px-3 py-1 text-[12px] font-bold ${s.approved ? "bg-white text-[#17804A]" : "bg-white/15 text-white"}`}>{s.approved ? "✓ Strategy approved" : "Mark approved"}</button>}
          </div>
          <textarea readOnly={readOnly} value={s.offer} onChange={(event) => set({ offer: event.target.value })} rows={2} placeholder="The offer in one or two sentences" className="mt-2 w-full resize-none bg-transparent text-[20px] font-extrabold leading-snug text-white outline-none placeholder:text-white/50" />
          <input readOnly={readOnly} value={s.services} onChange={(event) => set({ services: event.target.value })} placeholder="Services to promote" className="mt-1 w-full bg-transparent text-[14px] font-semibold text-white/85 outline-none placeholder:text-white/50" />
        </div>

        <Card>
          <CardHead title="Business profile" sub="Facts about the business, such as the target, the offer and what we never claim. Filled in when you upload a research document." right={!readOnly && <Button size="sm" onClick={() => set({ facts: [...facts, { id: `fact-${Date.now()}`, label: "New fact", value: "" }] })}><Plus size={13} />Add a fact</Button>} />
          {facts.length === 0 ? <Empty title="Nothing here yet">Upload the research document in Ideas and the target, offer and positioning are filed here.</Empty> : (
            <dl className="divide-y divide-[#F3F1ED]">
              {facts.map((fact) => (
                <div key={fact.id} className="grid gap-1 py-2.5 sm:grid-cols-[150px_1fr_auto] sm:items-start sm:gap-3">
                  <input readOnly={readOnly} value={fact.label} onChange={(event) => set({ facts: facts.map((item) => (item.id === fact.id ? { ...item, label: event.target.value } : item)) })} aria-label="Label" className="w-full rounded-lg bg-transparent px-1 py-1 text-[12px] font-bold uppercase tracking-wide text-[#8B867E] outline-none focus:bg-[#F6F5F2]" />
                  <textarea readOnly={readOnly} value={fact.value} onChange={(event) => set({ facts: facts.map((item) => (item.id === fact.id ? { ...item, value: event.target.value } : item)) })} aria-label={fact.label} rows={Math.max(1, Math.ceil(fact.value.length / 70))} className="w-full resize-none rounded-lg bg-transparent px-1 py-1 text-[14px] outline-none focus:bg-[#F6F5F2]" />
                  {!readOnly && <button onClick={() => set({ facts: facts.filter((item) => item.id !== fact.id) })} aria-label={`Remove ${fact.label}`} className="p-1 text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>}
                </div>
              ))}
            </dl>
          )}
          {(s.brief || !readOnly) && (
            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-[#8B867E]">What the content is for
              <textarea readOnly={readOnly} value={s.brief ?? ""} onChange={(event) => set({ brief: event.target.value })} rows={3} placeholder="The goal of the content in a few sentences" className="mt-1 w-full resize-none rounded-xl border border-[#E9E6E0] px-3 py-2 text-[14px] font-normal normal-case tracking-normal outline-none focus:border-[#2F6FDB]" />
            </label>
          )}
        </Card>

        <Card>
          <CardHead title="Calls to action" sub="Ready-made endings to add to a caption. In a post, pick one from the list under the caption." />
          {ctas.length === 0 && <p className="text-[13px] text-[#8B867E]">None yet. They are filed here when a research document has a CTA list.</p>}
          {[...new Set(ctas.map((cta) => cta.group))].map((group) => (
            <div key={group} className="mb-3 last:mb-0">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#8B867E]">{group} · {ctas.filter((cta) => cta.group === group).length}</div>
              <ul className="divide-y divide-[#F3F1ED] rounded-xl border border-[#F0EEE9]">
                {ctas.filter((cta) => cta.group === group).map((cta) => (
                  <li key={cta.id} className="flex items-start gap-2 px-3 py-2">
                    <span className="min-w-0 flex-1 text-[13px] leading-snug">{cta.text}</span>
                    <button onClick={() => copyText(cta.text)} aria-label="Copy" className="rounded-lg p-1.5 text-[#1F5BC4] hover:bg-[#EEF2FA]"><ClipboardCopy size={14} /></button>
                    {!readOnly && <button onClick={() => set({ ctas: ctas.filter((item) => item.id !== cta.id) })} aria-label="Remove" className="rounded-lg p-1.5 text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!readOnly && (
            <form onSubmit={(event) => { event.preventDefault(); if (!newCta.trim()) return; set({ ctas: [...ctas, { id: `cta-${Date.now()}`, text: newCta.trim(), group: "Calls to action" }] }); setNewCta(""); }} className="mt-3 flex gap-2">
              <input value={newCta} onChange={(event) => setNewCta(event.target.value)} placeholder="Add a call to action" aria-label="New call to action" className="min-w-0 flex-1 rounded-xl border border-[#E2DED7] px-3 py-2 text-[14px] outline-none focus:border-[#2F6FDB]" />
              <Button type="submit" kind="primary" disabled={!newCta.trim()}>Add</Button>
            </form>
          )}
        </Card>

        <Card>
          <CardHead title="Who we talk to" sub="One card per persona." right={!readOnly && <Button size="sm" onClick={() => set({ personas: [...s.personas, { id: `p-${Date.now()}`, name: "New persona", cares: "", pains: "", wants: "" }] })}><Plus size={13} />Persona</Button>} />
          {s.personas.length === 0 && <Empty title="No personas yet">Start with the main buyer: architects, engineers, facilities managers, homeowners…</Empty>}
          <div className="grid gap-3 md:grid-cols-2">
            {s.personas.map((persona, index) => (
              <div key={persona.id} className="rounded-2xl p-4" style={{ background: `${pillarPalette[index % pillarPalette.length]}10` }}>
                <div className="flex items-center gap-2">
                  <Avatar name={persona.name} color={pillarPalette[index % pillarPalette.length]} size={30} />
                  <input readOnly={readOnly} value={persona.name} onChange={(event) => setPersona(persona.id, { name: event.target.value })} aria-label="Persona name" className="min-w-0 flex-1 bg-transparent text-[15px] font-bold outline-none" />
                  {!readOnly && <button onClick={() => set({ personas: s.personas.filter((item) => item.id !== persona.id) })} aria-label={`Remove ${persona.name}`} className="p-1 text-[#A8A39B] hover:text-[#B83232]"><Trash2 size={14} /></button>}
                </div>
                {([["cares", "Cares about"], ["pains", "Pains"], ["wants", "Wants to see"]] as const).map(([key, label]) => (
                  <label key={key} className="mt-2.5 block text-[11px] font-bold uppercase tracking-wide text-[#8B867E]">
                    {label}
                    <textarea readOnly={readOnly} value={persona[key]} onChange={(event) => setPersona(persona.id, { [key]: event.target.value })} rows={2} className="mt-1 w-full resize-none rounded-lg bg-white px-2.5 py-2 text-[13px] font-normal normal-case tracking-normal text-[#1E2430] outline-none" />
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Content pillars" sub={`The number is how many ${monthName(state.month).split(" ")[0]} posts use each pillar.`} />
          <div className="flex flex-wrap gap-2">
            {s.pillars.map((pillar) => (
              <span key={pillar.id} className="inline-flex items-center gap-2 rounded-full py-1.5 pl-3 pr-2 text-[13px] font-semibold text-white" style={{ background: pillar.color }}>
                {pillar.name}<span className="rounded-full bg-white/25 px-1.5 text-[11px]">{usage(pillar)}</span>
                {!readOnly && <button onClick={() => set({ pillars: s.pillars.filter((item) => item.id !== pillar.id) })} aria-label={`Remove ${pillar.name}`} className="rounded-full px-1 hover:bg-white/20">×</button>}
              </span>
            ))}
            {!readOnly && (
              <form onSubmit={(event) => { event.preventDefault(); if (!pillarName.trim()) return; set({ pillars: [...s.pillars, { id: `pl-${Date.now()}`, name: pillarName.trim(), color: pillarPalette[s.pillars.length % pillarPalette.length] }] }); setPillarName(""); }} className="inline-flex gap-1.5">
                <input value={pillarName} onChange={(event) => setPillarName(event.target.value)} placeholder="New pillar" aria-label="New pillar" className="w-36 rounded-full border border-[#E2DED7] px-3 py-1.5 text-[13px] outline-none" />
                <Button size="sm" type="submit"><Plus size={13} /></Button>
              </form>
            )}
          </div>
        </Card>

        <div className="grid gap-3 md:grid-cols-3">
          {([["tone", "Tone", "#2F6FDB"], ["avoid", "Never talk about", "#D64545"], ["claims", "Expert must confirm", "#7C5CD6"]] as const).map(([key, label, color]) => (
            <div key={key} className="rounded-2xl border border-[#E9E6E0] bg-white p-4" style={{ borderTop: `4px solid ${color}` }}>
              <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color }}>{label}</div>
              <textarea readOnly={readOnly} value={s[key]} onChange={(event) => set({ [key]: event.target.value })} rows={3} className="mt-1.5 w-full resize-none text-[13px] outline-none" />
            </div>
          ))}
        </div>
        {client.expertReviewer && <p className="text-[13px] text-[#55514B]">Expert who checks technical copy: <b>{client.expertReviewer}</b></p>}
      </div>

      <Card className="h-fit">
        <CardHead title="What the client told us" sub="From the onboarding questionnaire." />
        <ul className="space-y-2.5">
          {answers.map((item) => (
            <li key={item.id} className="rounded-xl bg-[#F8F7F4] p-3">
              <div className="text-[12px] font-bold text-[#55514B]">{item.label.split(":")[0]}</div>
              <div className={`mt-1 text-[13px] ${item.note ? "" : "italic text-[#A8A39B]"}`}>{item.note || (item.status === "Received" ? "Answered on the call" : "Not answered yet")}</div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ─── Results: the freelancer's month-end hand-in ───
const emptyNumbers: ReportNumbers = { followers: "", followerChange: "", reach: "", impressions: "", engagementRate: "", postsPublished: "", topPost: "", observations: "", screenshots: "" };
