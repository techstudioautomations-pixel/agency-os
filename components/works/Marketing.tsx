"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, FileUp, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { docxText, ideaColors, isFreelancer, monthName, nameOf, personById, shortDate, splitIdeas, stageOf, stages, todayIso, turnOf } from "@/lib/works/logic";
import type { Client, Idea, IdeaDecision, Persona, Pillar, Post, Strategy } from "@/lib/works/types";
import { PostView } from "./PostView";
import { asset, Avatar, Button, Card, CardHead, Chip, Empty, Field, Segmented, fieldClass, tone } from "./kit";

const formats = ["Carousel", "Single image", "Reel", "Text post", "Newsletter"];
const pillarPalette = ["#2F6FDB", "#1D9E5A", "#E08A1E", "#8E5CD9", "#E0567A", "#0F8F8F"];

export function ClientMarketing({ client, sub, postId }: { client: Client; sub?: string; postId?: string }) {
  const { state, go } = useStore();
  const post = postId ? state.posts.find((item) => item.id === postId) : undefined;
  if (post) return <PostView post={post} client={client} />;

  const ideas = state.ideas.filter((idea) => idea.clientId === client.id);
  const posts = state.posts.filter((item) => item.clientId === client.id && item.date.startsWith(state.month));
  const current = sub ?? (client.strategy.approved ? "content" : "strategy");
  const steps = [
    { id: "strategy", n: 1, label: "Strategy", note: client.strategy.approved ? "Approved" : "Draft", t: client.strategy.approved ? ("green" as const) : ("amber" as const) },
    { id: "ideas", n: 2, label: "Ideas", note: `${ideas.filter((idea) => idea.decision === "New").length} to decide`, t: ideas.some((idea) => idea.decision === "New") ? ("purple" as const) : ("grey" as const) },
    { id: "content", n: 3, label: "Content", note: `${posts.length} / ${client.agreedPosts} this month`, t: posts.length < client.agreedPosts ? ("amber" as const) : ("green" as const) },
    { id: "calendar", n: 4, label: "Calendar", note: `${posts.filter((item) => ["Scheduled", "Published"].includes(item.status)).length} scheduled or live`, t: "grey" as const },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-4">
        {steps.map((step, index) => (
          <button key={step.id} onClick={() => go({ view: "client", clientId: client.id, tab: "marketing", sub: step.id })} className={`relative flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${current === step.id ? "border-[#1E2430] bg-white shadow-sm" : "border-[#E9E6E0] bg-white/60 hover:bg-white"}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-bold ${current === step.id ? "bg-[#1E2430] text-white" : "bg-[#F1F0ED] text-[#55514B]"}`}>{step.n}</span>
            <span className="min-w-0">
              <span className="block text-[14px] font-bold">{step.label}</span>
              <span className="block truncate text-[12px] font-semibold" style={{ color: tone[step.t].ink }}>{step.note}</span>
            </span>
            {index < steps.length - 1 && <ArrowRight size={14} className="absolute -right-[11px] top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-[#F6F5F2] text-[#B5B0A8] sm:block" />}
          </button>
        ))}
      </div>
      {current === "strategy" && <StrategyView client={client} />}
      {current === "ideas" && <IdeasView client={client} />}
      {current === "content" && <ContentBoard client={client} />}
      {current === "calendar" && <CalendarView client={client} />}
    </div>
  );
}

// ─── 1. Strategy ───
function StrategyView({ client }: { client: Client }) {
  const { state, updateClient } = useStore();
  const readOnly = isFreelancer(state);
  const s = client.strategy;
  const set = (patch: Partial<Strategy>) => updateClient(client.id, { strategy: { ...s, ...patch } });
  const setPersona = (id: string, patch: Partial<Persona>) => set({ personas: s.personas.map((persona) => (persona.id === id ? { ...persona, ...patch } : persona)) });
  const [pillarName, setPillarName] = useState("");
  const answers = client.checklist.filter((item) => item.group === "Questionnaire");
  const usage = (pillar: Pillar) => state.ideas.filter((idea) => idea.clientId === client.id && idea.pillarId === pillar.id && idea.decision !== "Rejected").length;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
      <div className="space-y-5">
        <Card>
          <CardHead title="What this account is selling" sub="Everything else follows from this." right={!readOnly && <Button size="sm" kind={s.approved ? "good" : "secondary"} onClick={() => set({ approved: !s.approved })}>{s.approved ? <><Check size={13} />Strategy approved</> : "Mark strategy approved"}</Button>} />
          <Field label="The offer, in one or two sentences"><textarea readOnly={readOnly} value={s.offer} onChange={(event) => set({ offer: event.target.value })} rows={2} className={fieldClass} placeholder="What do they sell, and to whom?" /></Field>
          <div className="mt-3"><Field label="Services to promote"><input readOnly={readOnly} value={s.services} onChange={(event) => set({ services: event.target.value })} className={fieldClass} placeholder="Separate with ·" /></Field></div>
        </Card>

        <Card>
          <CardHead title="Who we are talking to" sub="One card per persona: what they care about, what hurts, what they want to see." right={!readOnly && <Button size="sm" onClick={() => set({ personas: [...s.personas, { id: `p-${Date.now()}`, name: "New persona", cares: "", pains: "", wants: "" }] })}><Plus size={13} />Add persona</Button>} />
          {s.personas.length === 0 && <Empty title="No personas yet">Start with the main buyer: architects, engineers, facilities managers, homeowners…</Empty>}
          <div className="grid gap-3 md:grid-cols-2">
            {s.personas.map((persona) => (
              <div key={persona.id} className="rounded-xl border border-[#EEEBE5] bg-[#FBFAF8] p-4">
                <div className="flex items-center gap-2">
                  <input readOnly={readOnly} value={persona.name} onChange={(event) => setPersona(persona.id, { name: event.target.value })} aria-label="Persona name" className="min-w-0 flex-1 bg-transparent text-[15px] font-bold outline-none" />
                  {!readOnly && <button onClick={() => set({ personas: s.personas.filter((item) => item.id !== persona.id) })} aria-label={`Remove ${persona.name}`} className="rounded-lg p-1 text-[#A8A39B] hover:text-[#B83232]"><Trash2 size={14} /></button>}
                </div>
                {([["cares", "Cares about"], ["pains", "Pains"], ["wants", "Wants to see"]] as const).map(([key, label]) => (
                  <label key={key} className="mt-2.5 block text-[11px] font-bold uppercase tracking-wide text-[#8B867E]">
                    {label}
                    <textarea readOnly={readOnly} value={persona[key]} onChange={(event) => setPersona(persona.id, { [key]: event.target.value })} rows={2} className="mt-1 w-full resize-none rounded-lg border border-[#E7E4DE] bg-white px-2.5 py-2 text-[13px] font-normal normal-case tracking-normal text-[#1E2430] outline-none focus:border-[#2F6FDB]" />
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Content pillars" sub="Every idea gets one. The number shows how many live ideas use it." />
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

        <Card>
          <CardHead title="Guardrails" />
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Tone"><textarea readOnly={readOnly} value={s.tone} onChange={(event) => set({ tone: event.target.value })} rows={3} className={fieldClass} /></Field>
            <Field label="Topics to avoid"><textarea readOnly={readOnly} value={s.avoid} onChange={(event) => set({ avoid: event.target.value })} rows={3} className={fieldClass} /></Field>
            <Field label="Claims the client's expert must confirm"><textarea readOnly={readOnly} value={s.claims} onChange={(event) => set({ claims: event.target.value })} rows={3} className={fieldClass} /></Field>
          </div>
          {client.expertReviewer && <p className="mt-3 text-[13px] text-[#55514B]">Expert reviewer: <b>{client.expertReviewer}</b></p>}
        </Card>
      </div>

      <Card className="h-fit">
        <CardHead title="From the questionnaire" sub="What the client told us. Use it to fill the strategy." />
        <ul className="space-y-3">
          {answers.map((item) => (
            <li key={item.id} className="rounded-xl bg-[#F8F7F4] p-3">
              <div className="text-[12px] font-bold text-[#55514B]">{item.label.split(":")[0]}</div>
              <div className={`mt-1 text-[13px] ${item.note ? "text-[#1E2430]" : "italic text-[#A8A39B]"}`}>{item.note || (item.status === "Requested" ? "Asked, waiting for the answer" : "Not answered yet")}</div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ─── 2. Ideas ───
function IdeasView({ client }: { client: Client }) {
  const { state, addIdeas, updateIdea, ideaToPost, setPlan, go, ping } = useStore();
  const freelancer = isFreelancer(state);
  const canDecide = !freelancer;
  const [filter, setFilter] = useState<IdeaDecision | "All">("New");
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState("");
  const [source, setSource] = useState("Pasted text");
  const fileInput = useRef<HTMLInputElement>(null);
  const ideas = state.ideas.filter((idea) => idea.clientId === client.id);
  const shown = ideas.filter((idea) => filter === "All" || idea.decision === filter);
  const preview = text.trim() ? splitIdeas(text) : [];
  const plan = client.planApproval[state.month];
  const pillars = client.strategy.pillars;

  async function readFile(file: File) {
    try {
      const content = file.name.toLowerCase().endsWith(".docx") ? await docxText(file) : await file.text();
      setText(content);
      setSource(file.name);
      setImporting(true);
    } catch (error) {
      ping(error instanceof Error ? error.message : "Could not read that file");
    }
  }

  return (
    <div className="space-y-5">
      {client.approvalMode !== "C" && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E9E6E0] bg-white p-4">
          <div className="min-w-[200px] flex-1">
            <div className="text-[14px] font-bold">{monthName(state.month)} plan · client sign-off</div>
            <div className="text-[13px] text-[#6B6760]">{plan?.status === "Approved" ? `Approved ${shortDate(plan.date)} via ${plan.via}` : plan?.status === "Sent" ? `Sent ${shortDate(plan.date)}. Waiting for the client.` : `Send the approved ideas to the client by the ${state.settings.dates.plan}th.`}</div>
          </div>
          {canDecide && plan?.status !== "Approved" && (
            <>
              {plan?.status !== "Sent" && <Button size="sm" onClick={() => setPlan(client.id, "Sent")}>Mark plan sent</Button>}
              <Button size="sm" kind="good" onClick={() => setPlan(client.id, "Approved", "Email")}>Log client approval</Button>
            </>
          )}
          {plan?.status === "Approved" && <Chip t="green" dot>Plan approved</Chip>}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-bold">Idea bank</h3>
            <p className="text-[13px] text-[#6B6760]">Upload a document with a list of ideas: each one becomes a card to approve, park or reject.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => fileInput.current?.click()}><FileUp size={15} />Upload document</Button>
            <Button kind="primary" onClick={() => { setImporting(!importing); setSource("Pasted text"); }}><Plus size={15} />Paste ideas</Button>
            <input ref={fileInput} type="file" accept=".docx,.txt,.md,.csv" className="sr-only" aria-label="Upload ideas document" onChange={(event) => { const file = event.target.files?.[0]; if (file) readFile(file); event.target.value = ""; }} />
          </div>
        </div>
        {importing && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <Field label={`Ideas text · ${source}`} hint="Numbered or bulleted lists split into one idea each. Without a list, each paragraph becomes an idea. Word (.docx), .txt and .md files work. For Google Docs, copy and paste.">
                <textarea value={text} onChange={(event) => setText(event.target.value)} rows={10} className={fieldClass} placeholder={"1. Timber span: 4 things decide it – carousel for architects\n2. Myth: you can always remove an internal wall – reel\n3. …"} />
              </Field>
            </div>
            <div>
              <div className="mb-1 text-[12px] font-semibold text-[#55514B]">Preview · {preview.length} idea card{preview.length === 1 ? "" : "s"}</div>
              <div className="max-h-[260px] space-y-1.5 overflow-y-auto rounded-xl bg-[#F8F7F4] p-2">
                {preview.map((item, index) => (
                  <div key={index} className="rounded-lg bg-white px-3 py-2 text-[13px]"><b>{item.title}</b> <span className="text-[#8B867E]">· {item.format}</span>{item.notes && <div className="truncate text-[12px] text-[#6B6760]">{item.notes}</div>}</div>
                ))}
                {preview.length === 0 && <p className="p-3 text-[13px] text-[#8B867E]">Paste or upload to see the cards.</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <Button kind="primary" disabled={!preview.length} onClick={() => { addIdeas(client.id, preview, source); setText(""); setImporting(false); setFilter("New"); }}>Add {preview.length} cards</Button>
                <Button kind="ghost" onClick={() => setImporting(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={filter} onChange={setFilter} options={(["New", "Approved", "Maybe", "Rejected", "All"] as const).map((value) => ({ value, label: value === "New" ? "To decide" : value === "Maybe" ? "Maybe later" : value, count: value === "All" ? ideas.length : ideas.filter((idea) => idea.decision === value).length }))} />
        {!canDecide && <span className="text-[13px] text-[#6B6760]">The reviewer decides. You will be notified.</span>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((idea) => <IdeaCard key={idea.id} idea={idea} pillars={pillars} canDecide={canDecide} onChange={(patch) => updateIdea(idea.id, patch)} onMakePost={() => ideaToPost(idea.id)} onOpenPost={() => go({ view: "client", clientId: client.id, tab: "marketing", sub: "content", postId: idea.postId })} />)}
      </div>
      {shown.length === 0 && <Empty title={filter === "New" ? "No ideas waiting for a decision" : "No ideas here"}>{filter === "New" ? "Upload or paste the freelancer's ideas to start." : ""}</Empty>}
    </div>
  );
}

function IdeaCard({ idea, pillars, canDecide, onChange, onMakePost, onOpenPost }: { idea: Idea; pillars: Pillar[]; canDecide: boolean; onChange: (patch: Partial<Idea>) => void; onMakePost: () => void; onOpenPost: () => void }) {
  const { state } = useStore();
  const colors = ideaColors[idea.decision];
  const pillar = pillars.find((item) => item.id === idea.pillarId);
  const [note, setNote] = useState(false);
  return (
    <article className="flex flex-col rounded-2xl border-2 p-4 transition" style={{ background: colors.bg, borderColor: colors.ring }}>
      <div className="flex flex-wrap items-center gap-2">
        <select value={idea.pillarId ?? ""} onChange={(event) => onChange({ pillarId: event.target.value || undefined })} aria-label="Pillar" className="rounded-full border-0 px-2.5 py-1 text-[12px] font-semibold text-white outline-none" style={{ background: pillar?.color ?? "#A8A39B" }}>
          <option value="">No pillar</option>
          {pillars.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select value={idea.format} onChange={(event) => onChange({ format: event.target.value })} aria-label="Format" className="rounded-full border border-[#E2DED7] bg-white px-2.5 py-1 text-[12px] font-semibold outline-none">
          {formats.map((format) => <option key={format}>{format}</option>)}
        </select>
        <span className="ml-auto text-[11px] text-[#8B867E]">{nameOf(state, idea.createdBy)}</span>
      </div>
      <h4 className={`mt-3 text-[15px] font-bold leading-snug ${idea.decision === "Rejected" ? "text-[#8C8780] line-through" : ""}`}>{idea.title}</h4>
      {idea.notes && <p className="mt-1.5 line-clamp-3 text-[13px] text-[#55514B]">{idea.notes}</p>}
      {idea.comment && !note && <p className="mt-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-[12px] italic text-[#55514B]">“{idea.comment}”</p>}
      {note && <textarea autoFocus value={idea.comment} onChange={(event) => onChange({ comment: event.target.value })} onBlur={() => setNote(false)} rows={2} placeholder="Why? Any direction for the freelancer?" className="mt-2 w-full rounded-lg border border-[#E2DED7] bg-white px-2.5 py-2 text-[13px] outline-none" />}
      <div className="mt-auto pt-3">
        {idea.postId ? (
          <Button size="sm" className="w-full" onClick={onOpenPost}>Post created · open it <ArrowRight size={13} /></Button>
        ) : canDecide ? (
          <div className="flex flex-wrap gap-1.5">
            {(["Approved", "Maybe", "Rejected"] as const).map((decision) => (
              <button key={decision} onClick={() => onChange({ decision: idea.decision === decision ? "New" : decision })} aria-pressed={idea.decision === decision} className="flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-bold transition" style={idea.decision === decision ? { background: ideaColors[decision].ink, color: "#fff", borderColor: ideaColors[decision].ink } : { background: "#fff", color: ideaColors[decision].ink, borderColor: ideaColors[decision].ring }}>
                {decision === "Approved" ? "Approve" : decision === "Maybe" ? "Maybe" : "Reject"}
              </button>
            ))}
            <button onClick={() => setNote(true)} className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[#55514B] hover:bg-white">Comment</button>
            {idea.decision === "Approved" && <Button size="sm" kind="primary" className="mt-1.5 w-full" onClick={onMakePost}>Turn into a post <ArrowRight size={13} /></Button>}
          </div>
        ) : (
          <Chip t={idea.decision === "Approved" ? "green" : idea.decision === "Maybe" ? "amber" : idea.decision === "Rejected" ? "grey" : "purple"}>{idea.decision === "New" ? "Waiting for decision" : idea.decision}</Chip>
        )}
      </div>
    </article>
  );
}

// ─── 3. Content board ───
export function PostCard({ post, showClient = false }: { post: Post; showClient?: boolean }) {
  const { state, go } = useStore();
  const turn = turnOf(state, post);
  const person = personById(state, turn.who);
  const client = state.clients.find((item) => item.id === post.clientId);
  const mine = turn.who === state.me;
  const image = post.files.find((file) => file.kind === "image");
  const openChanges = post.comments.filter((comment) => comment.kind === "change" && !comment.resolved).length;
  return (
    <button onClick={() => go({ view: "client", clientId: post.clientId, tab: "marketing", sub: "content", postId: post.id })} className={`w-full overflow-hidden rounded-xl border bg-white text-left transition hover:shadow-md ${mine ? "border-[#2F6FDB] ring-2 ring-[#2F6FDB]/15" : "border-[#E9E6E0]"}`}>
      <div className="relative h-24 overflow-hidden" style={{ background: `${client?.color ?? "#5A6B7D"}14` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image ? <img src={asset(image.src)} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center px-3 text-center text-[13px] font-extrabold leading-tight" style={{ color: client?.color }}>{post.art}</div>}
        {showClient && client && <span className="absolute left-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-bold">{client.name}</span>}
        <span className="absolute right-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold">{shortDate(post.date)}</span>
      </div>
      <div className="p-3">
        <div className="line-clamp-2 text-[13px] font-bold leading-snug">{post.title}</div>
        <div className="mt-1 text-[11px] text-[#8B867E]">{post.format} · {post.platforms.join(", ")}</div>
        <div className={`mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold ${mine ? "bg-[#EAF1FD] text-[#1F5BC4]" : turn.tone === "done" ? "bg-[#E7F6EE] text-[#17804A]" : "bg-[#F6F5F2] text-[#55514B]"}`}>
          {person && <Avatar name={person.name} color={person.color} size={16} />}
          <span className="truncate">{mine ? `You: ${turn.verb}` : person ? `${person.name}: ${turn.verb}` : turn.verb}</span>
        </div>
        {(openChanges > 0 || (post.needsExpert && !post.expertOk)) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {openChanges > 0 && <Chip t="amber" className="!text-[11px]">{openChanges} change{openChanges === 1 ? "" : "s"}</Chip>}
            {post.needsExpert && !post.expertOk && <Chip t="purple" className="!text-[11px]">Expert check</Chip>}
          </div>
        )}
      </div>
    </button>
  );
}

function ContentBoard({ client }: { client: Client }) {
  const { state, addPost } = useStore();
  const [title, setTitle] = useState("");
  const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(state.month)).sort((a, b) => a.date.localeCompare(b.date));
  const gaps = Math.max(0, client.agreedPosts - posts.length);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[#6B6760]">Each post moves left to right. The highlighted cards are waiting on you.</p>
        <form onSubmit={(event) => { event.preventDefault(); if (!title.trim()) return; addPost(client.id, title.trim()); setTitle(""); }} className="flex gap-2">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Quick add a post title" aria-label="New post title" className="w-60 rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#2F6FDB]" />
          <Button type="submit"><Plus size={14} />Add</Button>
        </form>
      </div>
      <div className="grid gap-3 overflow-x-auto pb-2 lg:grid-cols-5">
        {stages.map((stage, index) => {
          const list = posts.filter((post) => stageOf(post.status) === index);
          return (
            <div key={stage} className="min-w-[210px] rounded-2xl bg-[#EFEDE8] p-2.5 lg:min-w-0">
              <div className="mb-2.5 flex items-center justify-between px-1.5 pt-1">
                <span className="text-[13px] font-bold">{stage}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold">{list.length}</span>
              </div>
              <div className="space-y-2.5">
                {list.map((post) => <PostCard key={post.id} post={post} />)}
                {index === 0 && gaps > 0 && (
                  <div className="rounded-xl border-2 border-dashed border-[#D6D1C8] p-3 text-center text-[12px] font-semibold text-[#8B867E]">{gaps} agreed post{gaps === 1 ? "" : "s"} not started. Approve ideas to fill them.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 4. Calendar ───
function CalendarView({ client }: { client: Client }) {
  const { state, go } = useStore();
  const [year, month] = state.month.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month, 0).getDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(state.month));
  const today = todayIso();
  const late = posts.filter((post) => post.date < today && !["Scheduled", "Published"].includes(post.status));
  const color = (post: Post) => (post.status === "Published" ? tone.green : post.status === "Scheduled" ? tone.blue : post.date < today ? tone.red : stageOf(post.status) >= 2 ? tone.purple : tone.amber);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <span className="font-semibold">{posts.length} of {client.agreedPosts} agreed posts have a date</span>
        {late.length > 0 && <Chip t="red" dot>{late.length} past their date and not scheduled</Chip>}
        <span className="ml-auto flex flex-wrap gap-3 text-[12px] text-[#6B6760]">
          {[["In progress", tone.amber], ["With client / approved", tone.purple], ["Scheduled", tone.blue], ["Live", tone.green], ["Late", tone.red]].map(([label, t]) => (
            <span key={label as string} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: (t as typeof tone.red).dot }} />{label as string}</span>
          ))}
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#E9E6E0] bg-white">
        <div className="grid min-w-[760px] grid-cols-7">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => <div key={name} className="border-b border-[#F0EEE9] px-2 py-2 text-[11px] font-bold uppercase text-[#8B867E]">{name}</div>)}
          {Array.from({ length: cells }, (_, index) => {
            const date = index - offset + 1;
            const iso = date > 0 && date <= days ? `${state.month}-${String(date).padStart(2, "0")}` : "";
            const items = posts.filter((post) => post.date === iso);
            return (
              <div key={index} className={`min-h-[104px] border-b border-r border-[#F5F3EF] p-1.5 ${iso === today ? "bg-[#F4F8FF]" : ""}`}>
                {iso && <div className={`mb-1 text-[11px] font-semibold ${iso === today ? "text-[#1F5BC4]" : "text-[#A8A39B]"}`}>{date}</div>}
                {items.map((post) => (
                  <button key={post.id} onClick={() => go({ view: "client", clientId: client.id, tab: "marketing", sub: "content", postId: post.id })} className="mb-1 block w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-semibold" style={{ background: color(post).bg, color: color(post).ink }}>
                    {post.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
