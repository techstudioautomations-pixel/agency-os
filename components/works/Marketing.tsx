"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, ExternalLink, FileUp, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { areaItems, docxText, isFreelancer, monthName, myClients, nameOf, personById, progress, shortDate, splitIdeas, stageOf, todayIso, turnOf } from "@/lib/works/logic";
import type { Client, Idea, IdeaDecision, Persona, Pillar, Post, ReportNumbers, Strategy } from "@/lib/works/types";
import { Shell } from "./Shell";
import { PostArt } from "./PostArt";
import { PostReview } from "./PostView";
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
export function MarketingPage({ clientId, tab, postId }: { clientId?: string; tab?: string; postId?: string }) {
  const { state, go } = useStore();
  const clients = myClients(state);
  const client = clients.find((item) => item.id === clientId);
  const scope = client ? client.id : "all";
  const post = postId ? state.posts.find((item) => item.id === postId) : undefined;
  if (post) {
    const postClient = state.clients.find((item) => item.id === post.clientId)!;
    return <PostReview post={post} client={postClient} backScope={scope} />;
  }

  const current = tab ?? "posts";
  const inScope = (item: { clientId: string }) => (client ? item.clientId === client.id : clients.some((c) => c.id === item.clientId));
  const mineCount = (id?: string) => state.posts.filter((item) => (id ? item.clientId === id : inScope(item)) && item.date.startsWith(state.month) && turnOf(state, item).who === state.me).length;
  const tabs = [
    { value: "posts", label: "Posts", count: state.posts.filter((item) => inScope(item) && item.date.startsWith(state.month)).length },
    { value: "calendar", label: "Calendar" },
    { value: "ideas", label: "Ideas", count: state.ideas.filter((idea) => inScope(idea) && idea.month === state.month && idea.decision === "New").length },
    { value: "strategy", label: "Strategy" },
    { value: "results", label: "Results" },
  ];
  const to = (patch: { clientId?: string; tab?: string }) => go({ view: "marketing", clientId: patch.clientId ?? scope, tab: patch.tab ?? current });

  return (
    <Shell title="Marketing" sub={`${monthName(state.month)} · ${mineCount() ? `${mineCount()} post${mineCount() === 1 ? "" : "s"} waiting on you` : "nothing waiting on you"}`}>
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        <button onClick={() => to({ clientId: "all" })} className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-[13px] font-bold ${scope === "all" ? "border-[#1E2430] bg-[#1E2430] text-white" : "border-[#E2DED7] bg-white"}`}>
          All clients{mineCount() > 0 && <span className="rounded-full bg-[#D64545] px-1.5 text-[11px] text-white">{mineCount()}</span>}
        </button>
        {clients.map((item) => (
          <button key={item.id} onClick={() => to({ clientId: item.id })} className={`flex shrink-0 items-center gap-2 rounded-2xl border py-1.5 pl-1.5 pr-3.5 text-[13px] font-bold ${scope === item.id ? "border-[#1E2430] bg-white shadow-[0_0_0_1px_#1E2430]" : "border-[#E2DED7] bg-white hover:border-[#C9C3B8]"}`}>
            <ClientMark client={item} size={28} />
            {item.name}
            {mineCount(item.id) > 0 && <span className="rounded-full bg-[#D64545] px-1.5 text-[11px] text-white">{mineCount(item.id)}</span>}
          </button>
        ))}
      </div>
      {client && <StarterPack client={client} />}
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-[#E9E6E0]">
        {tabs.map((item) => (
          <button key={item.value} onClick={() => to({ tab: item.value })} className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-[14px] font-semibold ${current === item.value ? "border-[#1E2430] text-[#1E2430]" : "border-transparent text-[#8B867E] hover:text-[#1E2430]"}`}>
            {item.label}{!!item.count && <span className="ml-1.5 text-[12px] opacity-60">{item.count}</span>}
          </button>
        ))}
      </div>
      {current === "posts" && <PostBoard client={client} scope={scope} />}
      {current === "calendar" && <PlanCalendar client={client} scope={scope} />}
      {current === "ideas" && <IdeasView client={client} />}
      {current === "strategy" && (client ? <StrategyView client={client} /> : <PickClient what="the strategy" />)}
      {current === "results" && <Results client={client} />}
    </Shell>
  );
}

/** The three documents a freelancer starts from, so they do not have to reinterpret the strategy. */
function StarterPack({ client }: { client: Client }) {
  const { state, go } = useStore();
  const freelancer = isFreelancer(state);
  const handed = client.checklist.some((item) => item.label.startsWith("Pack handed") && item.status === "Received");
  const packItems = ["brain", "brand", "templates", "handoff"].flatMap((id) => areaItems(client.checklist, id));
  const p = progress(packItems);
  const tiles = [
    { label: "Brand & creative guide", note: "Positioning, tone, visual rules", url: client.links.guide ?? "", area: "brand", color: "#D6457A" },
    { label: "Strategy brain", note: "Research, audiences, claims", url: client.links.brain ?? "", area: "brain", color: "#7C5CD6" },
    { label: "Canva templates", note: "Editable masters, both sizes", url: client.links.canva, area: "templates", color: "#E08A1E" },
  ];
  return (
    <div className="mb-5 rounded-2xl border border-[#E9E6E0] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-[15px] font-bold">{freelancer ? "Your starter pack" : "Freelancer starter pack"}</h3>
        {handed ? <Chip t="green" dot>Handed over</Chip> : <Chip t="amber" dot>Being prepared · {p.percent}%</Chip>}
        {!freelancer && <button onClick={() => go({ view: "client", clientId: client.id, tab: "checklists" })} className="ml-auto text-[13px] font-semibold text-[#1F5BC4]">Checklists <ArrowRight size={12} className="inline" /></button>}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {tiles.map((tile) => {
          const ready = /^https?:/.test(tile.url);
          const inner = (
            <>
              <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: tile.color }} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold">{tile.label}</span><span className="block truncate text-[12px] text-[#8B867E]">{ready ? tile.note : freelancer ? "Not added yet" : "Add the link"}</span></span>
              {ready ? <ExternalLink size={15} className="shrink-0 text-[#1F5BC4]" /> : !freelancer && <Plus size={15} className="shrink-0 text-[#8B867E]" />}
            </>
          );
          return ready ? (
            <a key={tile.label} href={tile.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-[#EEEBE5] px-3 py-2.5 hover:border-[#C9C3B8]">{inner}</a>
          ) : freelancer ? (
            <div key={tile.label} className="flex items-center gap-3 rounded-xl border border-dashed border-[#E2DED7] bg-[#FBFAF8] px-3 py-2.5 opacity-70">{inner}</div>
          ) : (
            <button key={tile.label} onClick={() => go({ view: "client", clientId: client.id, tab: "checklists", sub: tile.area })} className="flex items-center gap-3 rounded-xl border border-dashed border-[#D6D1C8] bg-[#FBFAF8] px-3 py-2.5 text-left hover:border-[#2F6FDB]">{inner}</button>
          );
        })}
      </div>
    </div>
  );
}

function PickClient({ what }: { what: string }) {
  return <Empty title="Choose a client above">Each client has its own {what}.</Empty>;
}

// ─── Posts ───
export function PostTile({ post, showClient, scope }: { post: Post; showClient: boolean; scope: string }) {
  const { state, go } = useStore();
  const client = state.clients.find((item) => item.id === post.clientId)!;
  const turn = turnOf(state, post);
  const mine = turn.who === state.me;
  const status = statusTone(post);
  const comments = post.comments.filter((comment) => comment.kind !== "system").length;
  const person = personById(state, turn.who);
  return (
    <button onClick={() => go({ view: "marketing", clientId: scope, postId: post.id })} className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(30,36,48,.10)] ${mine ? "border-[#2F6FDB] shadow-[0_0_0_2px_rgba(47,111,219,.18)]" : "border-[#E9E6E0]"}`}>
      <div className="relative">
        <PostArt post={post} client={client} rounded="rounded-none" />
        <span className="absolute bottom-2 left-2"><Chip t={status.t} className="shadow-sm">{status.label}</Chip></span>
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

function PostBoard({ client, scope }: { client?: Client; scope: string }) {
  const { state, go, addPost } = useStore();
  const freelancer = isFreelancer(state);
  const clients = myClients(state);
  const [filter, setFilter] = useState(() => (state.posts.some((post) => (client ? post.clientId === client.id : clients.some((c) => c.id === post.clientId)) && post.date.startsWith(state.month) && turnOf(state, post).who === state.me) ? "mine" : "all"));
  const posts = state.posts
    .filter((post) => (client ? post.clientId === client.id : clients.some((c) => c.id === post.clientId)) && post.date.startsWith(state.month))
    .sort((a, b) => a.date.localeCompare(b.date));
  const groups: Record<string, (post: Post) => boolean> = {
    mine: (post) => turnOf(state, post).who === state.me,
    progress: (post) => stageOf(post.status) < 2 && turnOf(state, post).who !== state.me,
    client: (post) => post.status === "Client approval",
    approved: (post) => ["Ready to schedule", "Scheduled", "Published"].includes(post.status),
    all: () => true,
  };
  const labels: Record<string, string> = freelancer
    ? { mine: "My to-do", progress: "In review", client: "With client", approved: "Approved & live", all: "All" }
    : { mine: "Needs me", progress: "In progress", client: "With client", approved: "Approved & live", all: "All" };
  const shown = posts.filter(groups[filter]);
  const agreed = client ? client.agreedPosts : clients.filter((c) => c.stage === "Live").reduce((sum, c) => sum + c.agreedPosts, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={filter} onChange={setFilter} options={Object.keys(groups).map((key) => ({ value: key, label: labels[key], count: posts.filter(groups[key]).length }))} />
        <div className="flex items-center gap-3 text-[13px]">
          <span className="font-semibold text-[#55514B]">{posts.length} of {agreed} agreed posts planned</span>
          {client && <Button kind="primary" onClick={() => { const id = addPost(client.id, "New post"); go({ view: "marketing", clientId: scope, postId: id }); }}><Plus size={15} />New post</Button>}
        </div>
      </div>
      {shown.length === 0 ? (
        <Empty title={filter === "mine" ? "Nothing waiting on you" : "No posts here"}>{filter === "mine" ? "You are up to date for this month. Try another filter or month." : ""}</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((post) => <PostTile key={post.id} post={post} showClient={!client} scope={scope} />)}
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
  const { state, go, movePost, addPost } = useStore();
  const clients = myClients(state);
  const [dragging, setDragging] = useState("");
  const [over, setOver] = useState("");
  const [year, month] = state.month.split("-").map(Number);
  const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const days = new Date(year, month, 0).getDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  const posts = state.posts.filter((post) => (client ? post.clientId === client.id : clients.some((c) => c.id === post.clientId)) && post.date.startsWith(state.month));
  const today = todayIso();
  const fromDay = state.month === today.slice(0, 7) ? Number(today.slice(8, 10)) + 1 : state.month < today.slice(0, 7) ? 99 : 1;
  const missingCount = client ? Math.max(0, client.agreedPosts - posts.length) : 0;
  const freeSlots = client ? suggestedDays(year, month, missingCount, fromDay).filter((day) => !posts.some((post) => post.date === `${state.month}-${String(day).padStart(2, "0")}`)) : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#55514B]">
        <span className="font-semibold">Drag a post to another day to move it.</span>
        {client && <span>{posts.length} of {client.agreedPosts} agreed posts have a date{freeSlots.length ? ` · ${freeSlots.length} open slot${freeSlots.length === 1 ? "" : "s"} suggested` : ""}</span>}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#E9E6E0] bg-white">
        <div className="grid min-w-[880px] grid-cols-7">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => <div key={name} className="border-b border-[#F0EEE9] px-2.5 py-2 text-[11px] font-bold uppercase text-[#8B867E]">{name}</div>)}
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
                className={`min-h-[132px] border-b border-r border-[#F5F3EF] p-1.5 transition ${over === iso ? "bg-[#EAF1FD]" : iso === today ? "bg-[#FBFCFF]" : ""}`}
              >
                {valid && <div className={`mb-1 text-[11px] font-bold ${iso === today ? "text-[#1F5BC4]" : "text-[#A8A39B]"}`}>{day}</div>}
                <div className="space-y-1.5">
                  {items.map((post) => {
                    const postClient = state.clients.find((item) => item.id === post.clientId)!;
                    const status = statusTone(post);
                    return (
                      <button key={post.id} draggable={post.status !== "Published"} onDragStart={() => setDragging(post.id)} onDragEnd={() => setDragging("")} onClick={() => go({ view: "marketing", clientId: scope, postId: post.id })} className="flex w-full items-center gap-1.5 rounded-lg border border-[#EEEBE5] bg-white p-1 text-left hover:border-[#C9C3B8]">
                        <span className="w-9 shrink-0"><PostArt post={post} client={postClient} rounded="rounded-md" /></span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{post.title}</span>
                          <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: tone[status.t].dot }} /> <span className="text-[10px] text-[#8B867E]">{!client ? postClient.name : status.label}</span>
                        </span>
                      </button>
                    );
                  })}
                  {slot && client && (
                    <button onClick={() => { const id = addPost(client.id, "New post", iso); go({ view: "marketing", clientId: scope, postId: id }); }} className="w-full rounded-lg border-2 border-dashed border-[#D6D1C8] p-2 text-center text-[11px] font-semibold text-[#8B867E] hover:border-[#2F6FDB] hover:text-[#1F5BC4]">
                      + Open slot
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-[12px] text-[#6B6760]">
        {([["In progress", tone.grey.dot], ["In review", tone.purple.dot], ["With client", tone.amber.dot], ["Scheduled", tone.blue.dot], ["Approved / live", tone.green.dot]] as const).map(([label, dot]) => (
          <span key={label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />{label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Ideas ───
const decisionStyle: Record<IdeaDecision, { bar: string; label: string }> = {
  New: { bar: "#C9C3B8", label: "To decide" },
  Approved: { bar: "#1D9E5A", label: "Approved" },
  Maybe: { bar: "#E0A325", label: "Maybe later" },
  Rejected: { bar: "#D9D5CE", label: "Rejected" },
};

function IdeasView({ client }: { client?: Client }) {
  const { state, addIdeas, updateIdea, ideaToPost, go, ping } = useStore();
  const freelancer = isFreelancer(state);
  const clients = myClients(state);
  const [filter, setFilter] = useState<IdeaDecision | "All">("New");
  const [allMonths, setAllMonths] = useState(false);
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState("");
  const [source, setSource] = useState("Pasted text");
  const fileInput = useRef<HTMLInputElement>(null);
  const ideas = state.ideas.filter((idea) => (client ? idea.clientId === client.id : clients.some((c) => c.id === idea.clientId)) && (allMonths || idea.month === state.month));
  const shown = ideas.filter((idea) => filter === "All" || idea.decision === filter);
  const preview = text.trim() ? splitIdeas(text) : [];

  async function readFile(file: File) {
    try {
      setText(file.name.toLowerCase().endsWith(".docx") ? await docxText(file) : await file.text());
      setSource(file.name);
      setImporting(true);
    } catch (error) {
      ping(error instanceof Error ? error.message : "Could not read that file");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={filter} onChange={setFilter} options={(["New", "Approved", "Maybe", "Rejected", "All"] as const).map((value) => ({ value, label: value === "All" ? "All" : decisionStyle[value].label, count: value === "All" ? ideas.length : ideas.filter((idea) => idea.decision === value).length }))} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[13px] font-semibold text-[#55514B]"><input type="checkbox" checked={allMonths} onChange={(event) => setAllMonths(event.target.checked)} />All months</label>
          {client && (
            <>
              <Button onClick={() => fileInput.current?.click()}><FileUp size={15} />Upload document</Button>
              <Button kind="primary" onClick={() => { setImporting(!importing); setSource("Pasted text"); }}><Plus size={15} />Add ideas</Button>
            </>
          )}
          <input ref={fileInput} type="file" accept=".docx,.txt,.md,.csv" className="sr-only" aria-label="Upload ideas document" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFile(file); event.target.value = ""; }} />
        </div>
      </div>

      {importing && client && (
        <Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label={`Ideas for ${monthName(state.month)} · ${source}`} hint="A numbered or bulleted list becomes one card per idea. Without a list, each paragraph becomes a card. Word (.docx), .txt and .md work; for Google Docs, copy and paste.">
              <textarea value={text} onChange={(event) => setText(event.target.value)} rows={9} className={fieldClass} placeholder={"1. Timber span: 4 things decide it – carousel\n2. Myth: you can always remove an internal wall – reel\n3. …"} />
            </Field>
            <div>
              <div className="mb-1 text-[12px] font-semibold text-[#55514B]">{preview.length} card{preview.length === 1 ? "" : "s"}</div>
              <div className="max-h-[230px] space-y-1.5 overflow-y-auto rounded-xl bg-[#F8F7F4] p-2">
                {preview.map((item, index) => <div key={index} className="rounded-lg bg-white px-3 py-2 text-[13px]"><b>{item.title}</b> <span className="text-[#8B867E]">· {item.format}</span></div>)}
                {preview.length === 0 && <p className="p-3 text-[13px] text-[#8B867E]">Paste or upload to see the cards.</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <Button kind="primary" disabled={!preview.length} onClick={() => { addIdeas(client.id, preview, source); setText(""); setImporting(false); setFilter("New"); }}>Add {preview.length} cards</Button>
                <Button kind="ghost" onClick={() => setImporting(false)}>Cancel</Button>
              </div>
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
            return <IdeaCard key={idea.id} idea={idea} client={ideaClient} showClient={!client} canDecide={!freelancer} onChange={(patch) => updateIdea(idea.id, patch)} onMakePost={() => ideaToPost(idea.id)} onOpenPost={() => go({ view: "marketing", clientId: client?.id ?? "all", postId: idea.postId })} />;
          })}
        </div>
      )}
    </div>
  );
}

function IdeaCard({ idea, client, showClient, canDecide, onChange, onMakePost, onOpenPost }: { idea: Idea; client: Client; showClient: boolean; canDecide: boolean; onChange: (patch: Partial<Idea>) => void; onMakePost: () => void; onOpenPost: () => void }) {
  const pillars: Pillar[] = client.strategy.pillars;
  const pillar = pillars.find((item) => item.id === idea.pillarId);
  const [note, setNote] = useState(false);
  const style = decisionStyle[idea.decision];
  return (
    <article className={`flex min-w-0 flex-col rounded-2xl border border-[#E9E6E0] bg-white p-4 ${idea.decision === "Rejected" ? "opacity-60" : ""}`} style={{ borderLeft: `5px solid ${style.bar}` }}>
      <div className="flex flex-wrap items-center gap-1.5">
        {showClient && <span className="flex items-center gap-1.5 text-[12px] font-bold"><ClientMark client={client} size={18} />{client.name}</span>}
        <select value={idea.pillarId ?? ""} onChange={(event) => onChange({ pillarId: event.target.value || undefined })} aria-label="Pillar" className="rounded-full border-0 px-2.5 py-1 text-[12px] font-semibold text-white outline-none" style={{ background: pillar?.color ?? "#A8A39B" }}>
          <option value="">Pick a pillar</option>
          {pillars.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select value={idea.format} onChange={(event) => onChange({ format: event.target.value })} aria-label="Format" className="rounded-full border border-[#E2DED7] bg-white px-2.5 py-1 text-[12px] font-semibold outline-none">
          {formats.map((format) => <option key={format}>{format}</option>)}
        </select>
      </div>
      <h4 className="mt-2.5 text-[15px] font-bold leading-snug">{idea.title}</h4>
      {idea.notes && <p className="mt-1 line-clamp-3 text-[13px] text-[#55514B]">{idea.notes}</p>}
      {idea.comment && !note && <p className="mt-2 rounded-lg bg-[#F6F5F2] px-2.5 py-1.5 text-[12px] italic text-[#55514B]">“{idea.comment}”</p>}
      {note && <textarea autoFocus value={idea.comment} onChange={(event) => onChange({ comment: event.target.value })} onBlur={() => setNote(false)} rows={2} placeholder="Why? Any direction for the freelancer?" className="mt-2 w-full rounded-lg border border-[#E2DED7] px-2.5 py-2 text-[13px] outline-none" />}
      <div className="mt-auto pt-3">
        {idea.postId ? (
          <Button size="sm" className="w-full" onClick={onOpenPost}>Open the post <ArrowRight size={13} /></Button>
        ) : canDecide ? (
          <>
            <div className="flex gap-1.5">
              {(["Approved", "Maybe", "Rejected"] as const).map((decision) => {
                const active = idea.decision === decision;
                const colors = decision === "Approved" ? tone.green : decision === "Maybe" ? tone.amber : tone.grey;
                return (
                  <button key={decision} onClick={() => onChange({ decision: active ? "New" : decision })} aria-pressed={active} className="flex-1 rounded-lg px-2 py-1.5 text-[12px] font-bold transition" style={active ? { background: colors.dot, color: "#fff" } : { background: colors.bg, color: colors.ink }}>
                    {decision === "Approved" ? "Approve" : decision === "Maybe" ? "Maybe" : "Reject"}
                  </button>
                );
              })}
              <button onClick={() => setNote(true)} aria-label="Comment" className="rounded-lg px-2 text-[#55514B] hover:bg-[#F1F0ED]"><MessageCircle size={15} /></button>
            </div>
            {idea.decision === "Approved" && <Button size="sm" kind="primary" className="mt-2 w-full" onClick={onMakePost}>Turn into a post <ArrowRight size={13} /></Button>}
          </>
        ) : (
          <Chip t={idea.decision === "Approved" ? "green" : idea.decision === "Maybe" ? "amber" : idea.decision === "Rejected" ? "grey" : "purple"}>{style.label}</Chip>
        )}
      </div>
    </article>
  );
}

// ─── Strategy: the client's marketing profile ───
function StrategyView({ client }: { client: Client }) {
  const { state, updateClient } = useStore();
  const readOnly = isFreelancer(state);
  const s = client.strategy;
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

function Results({ client }: { client?: Client }) {
  const { state, go } = useStore();
  const clients = myClients(state);
  if (!client) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {clients.map((item) => {
          const report = state.reports.find((entry) => entry.clientId === item.id && entry.month === state.month);
          return (
            <button key={item.id} onClick={() => go({ view: "marketing", clientId: item.id, tab: "results" })} className="flex items-center gap-3 rounded-2xl border border-[#E9E6E0] bg-white p-4 text-left hover:border-[#C9C3B8]">
              <ClientMark client={item} size={38} />
              <span className="flex-1"><b className="text-[14px]">{item.name}</b><span className="block text-[12px] text-[#8B867E]">{monthName(state.month)}</span></span>
              <Chip t={report?.freelancerReport || report?.numbers ? "green" : "grey"} dot>{report?.freelancerReport || report?.numbers ? "Handed in" : "Not yet"}</Chip>
            </button>
          );
        })}
      </div>
    );
  }
  return <ResultsForm key={`${client.id}-${state.month}`} client={client} />;
}

function ResultsForm({ client }: { client: Client }) {
  const { state, saveNumbers, attachReport } = useStore();
  const report = state.reports.find((item) => item.clientId === client.id && item.month === state.month);
  const [numbers, setNumbers] = useState<ReportNumbers>(report?.numbers ?? emptyNumbers);
  const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(state.month));
  const live = posts.filter((post) => post.status === "Published").length;
  return (
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-4">
        <Card>
          <CardHead title={`${monthName(state.month)} at a glance`} />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#E7F6EE] p-3"><div className="text-[24px] font-extrabold text-[#17804A]">{live}</div><div className="text-[12px] font-semibold">Live</div></div>
            <div className="rounded-xl bg-[#F6F5F2] p-3"><div className="text-[24px] font-extrabold">{client.agreedPosts}</div><div className="text-[12px] font-semibold">Agreed</div></div>
          </div>
        </Card>
        <Card>
          <CardHead title="Monthly report" sub="The freelancer's report for the month, as a file or a link." />
          <AttachField value={report?.freelancerReport} onChange={(file) => attachReport(client.id, state.month, "freelancerReport", file)} label="Upload report" />
          <p className="mt-3 text-[12px] text-[#8B867E]">Operations is notified when it is attached. The client report is sent from the client&apos;s Reporting tab.</p>
        </Card>
      </div>
      <Card>
        <CardHead title="Key numbers (optional)" sub="From LinkedIn / Instagram analytics or Publer." />
        <form onSubmit={(event) => { event.preventDefault(); saveNumbers(client.id, state.month, numbers); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([["followers", "Followers"], ["followerChange", "Change"], ["reach", "Reach"], ["impressions", "Impressions"], ["engagementRate", "Engagement %"], ["postsPublished", "Posts published"]] as [keyof ReportNumbers, string][]).map(([key, label]) => (
              <Field key={key} label={label}><input value={numbers[key]} onChange={(event) => setNumbers({ ...numbers, [key]: event.target.value })} className={fieldClass} /></Field>
            ))}
          </div>
          <Field label="Best post and why"><input value={numbers.topPost} onChange={(event) => setNumbers({ ...numbers, topPost: event.target.value })} className={fieldClass} /></Field>
          <Field label="What you noticed"><textarea value={numbers.observations} onChange={(event) => setNumbers({ ...numbers, observations: event.target.value })} rows={3} className={fieldClass} /></Field>
          <div className="flex items-center gap-3">
            <Button kind="primary" type="submit"><Check size={14} />Save numbers</Button>
            {report?.numbersAt && <span className="text-[12px] text-[#8B867E]">Last saved by {nameOf(state, report.numbersBy)} on {shortDate(report.numbersAt)}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
