"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronLeft, ChevronRight, Download, ExternalLink, Maximize2, Pencil, ShieldCheck, Trash2, UploadCloud, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { ago, isFreelancer, isOwner, nameOf, personById, qaGroups, qaItemsFor, qaProgress, reviewerFor, shortDate, stageOf, stages, turnOf } from "@/lib/works/logic";
import type { Client, Post, PostFile, RevisionCategory } from "@/lib/works/types";
import { buildZip, safeName } from "@/lib/zip";
import { PostArt } from "./PostArt";
import { Lightbox } from "./Lightbox";
import { statusTone } from "./Marketing";
import { asset, Avatar, Button, Chip, ClientMark, Field, fieldClass } from "./kit";
import { Shell } from "./Shell";

const channels = ["LinkedIn", "Instagram", "Facebook", "TikTok", "Newsletter"];
const formats = ["Carousel", "Single image", "Reel", "Video", "Text post", "Newsletter", "Blog post", "Document"];
const limits: Record<string, number> = { LinkedIn: 3000, Instagram: 2200, Facebook: 5000, TikTok: 2200, Newsletter: 20000 };
const categories: RevisionCategory[] = ["Copy", "Brand", "Layout", "Factual"];
const kindOf = (file: File): PostFile["kind"] => (file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : file.type.startsWith("video/") ? "video" : "other");

export function PostReview({ post, client, backScope }: { post: Post; client: Client; backScope: string }) {
  const store = useStore();
  const { state, go } = store;
  const turn = turnOf(state, post);
  const mine = turn.who === state.me;
  const freelancerView = isFreelancer(state);
  const canEdit = isOwner(state) || (state.me === client.freelancerId && post.status !== "Published") || (!client.freelancerId && !freelancerView);
  const isMaker = state.me === client.freelancerId;
  const [editing, setEditing] = useState(() => isMaker && post.status === "Copy in progress" && !post.copy.trim());
  useEffect(() => { window.scrollTo(0, 0); }, [post.id]);
  const status = statusTone(post);
  const openChanges = post.comments.filter((comment) => comment.kind === "change" && !comment.resolved);
  const queue = state.posts.filter((item) => item.id !== post.id && item.date.startsWith(state.month) && turnOf(state, item).who === state.me && (backScope === "all" || item.clientId === backScope)).sort((a, b) => a.date.localeCompare(b.date));
  const steps = client.approvalMode === "A" ? stages : stages.filter((item) => item !== "Client");
  const stage = stageOf(post.status);
  const current = client.approvalMode === "A" ? stage : stage > 2 ? stage - 1 : stage;

  return (
    <Shell
      title={<span className="flex items-center gap-3"><ClientMark client={client} size={40} /><span className="min-w-0 truncate">{post.title}</span></span>}
      sub={<span className="flex flex-wrap items-center gap-2"><Chip t={status.t}>{status.label}</Chip><span>{post.format} · {post.platforms.join(", ")} · goes out {shortDate(post.date)} · v{post.version}</span>{post.needsExpert && <Chip t={post.expertOk ? "green" : "purple"}><ShieldCheck size={12} />{post.expertOk ? "Expert confirmed" : "Expert check needed"}</Chip>}</span>}
      actions={
        <>
          <Button kind="ghost" onClick={() => go({ view: "marketing", clientId: backScope, tab: "posts" })}><ArrowLeft size={15} />All posts</Button>
          {queue[0] && <Button kind="primary" onClick={() => go({ view: "marketing", clientId: backScope, postId: queue[0].id })}>Next for you ({queue.length}) <ArrowRight size={15} /></Button>}
        </>
      }
    >
      <div className="mb-4 flex items-center gap-1">
        {steps.map((step, index) => {
          const done = post.status === "Published" || index < current;
          const now = index === current && post.status !== "Published";
          return (
            <div key={step} className="flex min-w-0 flex-1 items-center gap-2">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${done ? "bg-[#1D9E5A] text-white" : now ? "bg-[#2F6FDB] text-white" : "bg-[#E7E4DE] text-[#8B867E]"}`}>{done ? <Check size={13} /> : index + 1}</span>
              <span className={`text-[12px] font-semibold ${now ? "text-[#1F5BC4]" : "hidden sm:inline"} ${!now && done ? "text-[#17804A]" : !now ? "text-[#9A958D]" : ""}`}>{step}</span>
              {index < steps.length - 1 && <span className="h-0.5 flex-1 rounded-full" style={{ background: done ? "#1D9E5A" : "#E7E4DE" }} />}
            </div>
          );
        })}
      </div>

      {isMaker && ["Copy in progress", "Design in progress", "Ready to schedule"].includes(post.status) && (
        <div className="mb-4 rounded-2xl border border-[#BFD3F5] bg-[#F1F6FE] px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold uppercase tracking-wide text-[#1F5BC4]">Your turn</div>
              <div className="text-[16px] font-extrabold">{post.status === "Ready to schedule" ? "Schedule it" : post.status === "Copy in progress" ? (openChanges.length ? "Fix the copy" : "Write the caption") : openChanges.length ? "Fix the design" : "Upload the artwork"}</div>
              <div className="text-[13px] text-[#55514B]">{post.status === "Ready to schedule" ? "It is approved. Add the Drive link to the final files, pick the date and schedule it in the publishing tool, at the bottom." : post.status === "Copy in progress" ? "Write the caption, then send it for review at the bottom. The artwork comes after the copy is approved." : "Upload the artwork and the links, then send it for review at the bottom."}</div>
            </div>
            {!editing && canEdit && post.status !== "Ready to schedule" && <Button kind="primary" onClick={() => setEditing(true)}><Pencil size={15} />{post.status === "Copy in progress" ? "Write the caption" : "Upload artwork"}</Button>}
          </div>
          {openChanges.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {openChanges.map((change) => <li key={change.id} className="rounded-xl bg-white px-3 py-2 text-[13px]"><b className="text-[#C2620F]">{change.category}:</b> {change.body}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,.9fr)]">
        <div className="min-w-0">
          {editing ? <PostEditor post={post} onDone={() => { setEditing(false); store.postEdited(post.id); }} /> : <PostPreviewPanel post={post} client={client} canEdit={canEdit} onEdit={() => setEditing(true)} />}
        </div>
        <Conversation post={post} client={client} mine={mine} />
      </div>
    </Shell>
  );
}

// ─── Left: the post as it will look ───
export function PostPreviewPanel({ post, client, canEdit, onEdit }: { post: Post; client: Client; canEdit: boolean; onEdit: () => void }) {
  const { ping } = useStore();
  const [slide, setSlide] = useState(0);
  const [channel, setChannel] = useState(post.platforms[0] ?? "LinkedIn");
  const [busy, setBusy] = useState(false);
  const [big, setBig] = useState(false);
  const visuals = post.files.filter((file) => file.kind === "image" || file.kind === "video");
  const pdf = post.files.find((file) => file.kind === "pdf");
  const caption = post.captions[channel] ?? post.copy;
  const count = Math.max(1, visuals.length);

  async function downloadAll() {
    setBusy(true);
    try {
      const entries = await Promise.all(post.files.map(async (file, index) => ({ name: `${String(index + 1).padStart(2, "0")}-${safeName(file.name)}`, data: new Uint8Array(await (await fetch(asset(file.src))).arrayBuffer()) })));
      const url = URL.createObjectURL(buildZip(entries));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName(client.name)}-${safeName(post.title)}.zip`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
      ping("Could not bundle the files");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white">
      {big && <Lightbox files={post.files.map((file) => ({ ...file, src: asset(file.src) }))} start={slide} onClose={() => setBig(false)} />}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#F0EEE9] px-4 py-3">
        <div className="flex gap-1">
          {post.platforms.map((item) => <button key={item} onClick={() => setChannel(item)} className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${channel === item ? "bg-[#1E2430] text-white" : "text-[#6B6760] hover:bg-[#F1F0ED]"}`}>{item}</button>)}
        </div>
        <span className="ml-auto flex flex-wrap gap-1.5">
          {post.files.length > 0 && <Button size="sm" onClick={downloadAll} disabled={busy}><Download size={13} />{busy ? "Preparing…" : post.files.length > 1 ? `Download all (${post.files.length})` : "Download"}</Button>}
          {post.designLink && <a href={post.designLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-[#E2DED7] px-3 py-1.5 text-[12px] font-semibold hover:border-[#C9C3B8]">Canva <ExternalLink size={12} /></a>}
          {canEdit && <Button size="sm" kind="primary" onClick={onEdit}><Pencil size={13} />Edit post</Button>}
        </span>
      </div>

      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="bg-[#F1F0ED] p-4 sm:p-6">
          <div className="relative mx-auto max-w-[420px]">
            <PostArt post={post} client={client} index={slide} rounded="rounded-2xl" className="shadow-[0_12px_32px_rgba(30,36,48,.15)]" />
            {visuals.length > 0 && <button onClick={() => setBig(true)} aria-label="See it full size" className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold shadow"><Maximize2 size={13} />Full size</button>}
            {count > 1 && (
              <>
                <button onClick={() => setSlide((slide - 1 + count) % count)} aria-label="Previous slide" className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 shadow"><ChevronLeft size={18} /></button>
                <button onClick={() => setSlide((slide + 1) % count)} aria-label="Next slide" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 shadow"><ChevronRight size={18} /></button>
              </>
            )}
          </div>
          {visuals.length > 1 && (
            <div className="mx-auto mt-3 flex max-w-[420px] gap-2 overflow-x-auto pb-1">
              {visuals.map((file, index) => (
                <button key={file.id} onClick={() => setSlide(index)} className={`w-14 shrink-0 overflow-hidden rounded-lg border-2 ${index === slide ? "border-[#2F6FDB]" : "border-transparent opacity-70"}`} aria-label={`Slide ${index + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {file.kind === "image" ? <img src={asset(file.src)} alt="" className="aspect-[4/5] w-full object-cover" /> : <span className="grid aspect-[4/5] place-items-center bg-[#1E2430] text-[10px] font-bold text-white">Video</span>}
                </button>
              ))}
            </div>
          )}
          {pdf && <a href={asset(pdf.src)} target="_blank" rel="noreferrer" className="mx-auto mt-3 flex max-w-[420px] items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-[#1F5BC4]">Open PDF carousel: {pdf.name} <ExternalLink size={12} /></a>}
          {!post.files.length && <p className="mx-auto mt-3 max-w-[420px] text-center text-[12px] text-[#8B867E]">{post.status.startsWith("Copy") ? "Preview design. The artwork is made after the copy is approved." : "No artwork uploaded yet. This is a preview."}</p>}
        </div>

        <div className="flex flex-col p-5">
          <div className="flex items-center gap-2.5">
            <ClientMark client={client} size={34} />
            <div className="leading-tight"><div className="text-[14px] font-bold">{client.name}</div><div className="text-[12px] text-[#8B867E]">{channel} · {shortDate(post.date)}</div></div>
          </div>
          <p className={`mt-4 flex-1 whitespace-pre-wrap text-[14px] leading-relaxed ${caption ? "" : "italic text-[#A8A39B]"}`}>{caption || "No caption yet."}</p>
          <div className="mt-4 flex items-center justify-between border-t border-[#F0EEE9] pt-3 text-[12px]">
            <span className={caption.length > (limits[channel] ?? 3000) ? "font-bold text-[#B83232]" : "text-[#8B867E]"}>{caption.length} / {(limits[channel] ?? 3000).toLocaleString()} characters{post.captions[channel] ? ` · ${channel} version` : ""}</span>
            {caption && <button onClick={async () => { try { await navigator.clipboard.writeText(caption); ping("Caption copied"); } catch { ping("Copy was blocked"); } }} className="font-semibold text-[#1F5BC4]">Copy caption</button>}
          </div>
          {post.driveLink && <a href={post.driveLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#1F5BC4]">Final files in Drive <ExternalLink size={12} /></a>}
        </div>
      </div>
    </div>
  );
}

// ─── Left, edit mode: everything the freelancer fills in, in one place ───
function PostEditor({ post, onDone }: { post: Post; onDone: () => void }) {
  const store = useStore();
  const set = (patch: Partial<Post>) => store.updatePost(post.id, patch);
  const filesRef = useRef(post.files);
  filesRef.current = post.files;
  const [captionTab, setCaptionTab] = useState("main");

  function add(list: FileList | null) {
    if (!list) return;
    Array.from(list).forEach((file) => {
      const base = { id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: file.name, kind: kindOf(file) };
      if (file.size < 1_500_000) {
        const reader = new FileReader();
        reader.onload = () => { const next = [...filesRef.current, { ...base, src: String(reader.result) }]; filesRef.current = next; set({ files: next }); };
        reader.readAsDataURL(file);
      } else {
        const next = [...filesRef.current, { ...base, src: URL.createObjectURL(file) }];
        filesRef.current = next;
        set({ files: next });
      }
    });
  }
  const move = (index: number, delta: number) => {
    const next = [...post.files];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set({ files: next });
  };
  const toggleChannel = (item: string) => set({ platforms: post.platforms.includes(item) ? post.platforms.filter((value) => value !== item) : [...post.platforms, item] });
  const different = post.platforms.length > 1 && post.platforms.some((item) => post.captions[item] !== undefined);
  const tab = different ? (post.platforms.includes(captionTab) ? captionTab : post.platforms[0]) : "main";
  const value = tab === "main" ? post.copy : post.captions[tab] ?? post.copy;
  const limit = tab === "main" ? Math.min(...post.platforms.map((item) => limits[item] ?? 3000)) : limits[tab] ?? 3000;
  const write = (text: string) => (tab === "main" ? set({ copy: text }) : set({ captions: { ...post.captions, [tab]: text } }));
  const useDifferent = () => { set({ captions: Object.fromEntries(post.platforms.map((item) => [item, post.captions[item] ?? post.copy])) }); setCaptionTab(post.platforms[0]); };
  const useSame = () => { set({ copy: post.captions[tab] ?? post.copy, captions: {} }); setCaptionTab("main"); };

  return (
    <div className="space-y-4 rounded-2xl border-2 border-[#2F6FDB]/40 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold">Edit post</h3>
        <Button kind="primary" size="sm" onClick={onDone}><Check size={14} />Done</Button>
      </div>
      <Field label="Title (internal)"><input value={post.title} onChange={(event) => set({ title: event.target.value, art: event.target.value })} className={fieldClass} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type of post">
          <select value={post.assetId ?? `format:${post.format}`} onChange={(event) => {
            const picked = (store.state.clients.find((c) => c.id === post.clientId)?.assets ?? []).find((asset) => asset.id === event.target.value);
            if (picked) set({ assetId: picked.id, format: picked.format });
            else set({ assetId: undefined, format: event.target.value.replace("format:", "") });
          }} className={fieldClass}>
            {(store.state.clients.find((c) => c.id === post.clientId)?.assets ?? []).filter((asset) => asset.kind === "piece").map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            <option disabled>──────</option>
            {formats.map((item) => <option key={item} value={`format:${item}`}>{item}</option>)}
          </select>
        </Field>
        <Field label="Goes out on"><input type="date" value={post.date} onChange={(event) => set({ date: event.target.value })} className={fieldClass} /></Field>
      </div>
      <div>
        <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">Channels</div>
        <div className="flex flex-wrap gap-1.5">{channels.map((item) => <button key={item} onClick={() => toggleChannel(item)} aria-pressed={post.platforms.includes(item)} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${post.platforms.includes(item) ? "bg-[#1E2430] text-white" : "bg-[#F1F0ED] text-[#6B6760]"}`}>{item}</button>)}</div>
      </div>

      {post.status.startsWith("Copy") ? (
        <p className="rounded-xl bg-[#F8F7F4] px-4 py-3 text-[13px] text-[#6B6760]">Artwork and links are added after the copy is approved.</p>
      ) : (
      <div>
        <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">Artwork {post.format === "Carousel" ? "· slides in order" : ""}</div>
        {post.files.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {post.files.map((file, index) => (
              <div key={file.id} className="flex items-center gap-2.5 rounded-xl bg-[#F6F5F2] p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {file.kind === "image" ? <img src={asset(file.src)} alt="" className="h-11 w-9 rounded-md object-cover" /> : <span className="grid h-11 w-9 place-items-center rounded-md bg-white text-[10px] font-bold uppercase">{file.kind}</span>}
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{index + 1}. {file.name}</span>
                <button onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up" className="rounded-lg p-1.5 disabled:opacity-30"><ArrowUp size={14} /></button>
                <button onClick={() => move(index, 1)} disabled={index === post.files.length - 1} aria-label="Move down" className="rounded-lg p-1.5 disabled:opacity-30"><ArrowDown size={14} /></button>
                <button onClick={() => set({ files: post.files.filter((item) => item.id !== file.id) })} aria-label={`Remove ${file.name}`} className="rounded-lg p-1.5 text-[#B83232]"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#C9D6EE] bg-[#F7FAFF] p-4 text-[13px] font-semibold text-[#1F5BC4] hover:bg-[#EEF4FF]">
          <UploadCloud size={18} />Upload images, a PDF carousel or a video
          <input type="file" multiple accept="image/*,video/*,application/pdf" className="sr-only" onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
        </label>
      </div>
      )}

      <div>
        <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">Caption</div>
        {post.platforms.length > 1 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button onClick={useSame} aria-pressed={!different} className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${!different ? "bg-[#1E2430] text-white" : "bg-[#F1F0ED] text-[#6B6760]"}`}>Same caption on all</button>
            <button onClick={useDifferent} aria-pressed={different} className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${different ? "bg-[#1E2430] text-white" : "bg-[#F1F0ED] text-[#6B6760]"}`}>Different caption for each</button>
          </div>
        )}
        {different && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {post.platforms.map((item) => <button key={item} onClick={() => setCaptionTab(item)} aria-pressed={tab === item} className={`rounded-lg px-3 py-1 text-[12px] font-bold ${tab === item ? "bg-[#EAF1FD] text-[#1F5BC4]" : "text-[#6B6760] hover:bg-[#F1F0ED]"}`}>{item}</button>)}
          </div>
        )}
        <textarea value={value} onChange={(event) => write(event.target.value)} rows={7} aria-label={different ? `${tab} caption` : "Caption"} className={`${fieldClass} leading-relaxed`} placeholder="Write the caption" />
        <div className="mt-1 text-[12px] text-[#8B867E]">{value.length} characters · limit {limit.toLocaleString()}{value.length > limit ? " (too long)" : ""}</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Editable design link (Canva / Adobe)"><input value={post.designLink} onChange={(event) => set({ designLink: event.target.value })} placeholder="https://www.canva.com/design/…" className={fieldClass} /></Field>
        <Field label="Final files in the client's Drive"><input value={post.driveLink} onChange={(event) => set({ driveLink: event.target.value })} placeholder="https://drive.google.com/…" className={fieldClass} /></Field>
      </div>
      <label className="flex items-center gap-2 text-[13px] font-semibold"><input type="checkbox" checked={post.needsExpert} onChange={(event) => set({ needsExpert: event.target.checked })} className="h-4 w-4" />Contains technical claims the client&apos;s expert must confirm</label>
    </div>
  );
}

// ─── Right: one conversation, and the next action always at the bottom ───
function Conversation({ post, client, mine }: { post: Post; client: Client; mine: boolean }) {
  const store = useStore();
  const { state } = store;
  const [text, setText] = useState("");
  const [changeMode, setChangeMode] = useState(false);
  const [category, setCategory] = useState<RevisionCategory>(post.status === "Copy review" ? "Copy" : "Layout");
  const [via, setVia] = useState("Email");
  const [date, setDate] = useState(post.date);
  const [url, setUrl] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const reviewer = reviewerFor(state, client, post);
  const isReviewer = state.me === reviewer || isOwner(state);
  const isMaker = state.me === client.freelancerId || (!client.freelancerId && !isFreelancer(state));
  const reviewing = post.status === "Copy review" || post.status === "Design review";
  const working = post.status === "Copy in progress" || post.status === "Design in progress";
  const openChanges = post.comments.filter((comment) => comment.kind === "change" && !comment.resolved).length;
  const expertBlock = post.status === "Design review" && post.needsExpert && !post.expertOk;

  type Line = { at: string; kind: "msg" | "event"; by: string; body: string; id?: string; change?: boolean; category?: string; resolved?: boolean };
  const lines: Line[] = [
    ...post.comments.map((comment) => ({ at: comment.at, kind: comment.kind === "system" ? ("event" as const) : ("msg" as const), by: comment.by, body: comment.body, id: comment.id, change: comment.kind === "change", category: comment.category, resolved: comment.resolved })),
    ...post.history.map((event) => ({ at: event.at, kind: "event" as const, by: event.by, body: event.text })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  useEffect(() => { const box = end.current?.parentElement; if (box) box.scrollTop = box.scrollHeight; }, [lines.length]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    if (changeMode) { store.requestChanges(post.id, body, category); setChangeMode(false); }
    else store.comment(post.id, body);
    setText("");
  };

  let action: React.ReactNode = null;
  if (reviewing && isReviewer) {
    action = (
      <div className="space-y-2">
        {post.needsExpert && post.status === "Design review" && (
          <label className={`flex items-start gap-2 rounded-xl p-2.5 text-[12px] ${post.expertOk ? "bg-[#E7F6EE]" : "bg-[#F1ECFC]"}`}>
            <input type="checkbox" checked={post.expertOk} onChange={(event) => store.updatePost(post.id, { expertOk: event.target.checked })} className="mt-0.5 h-4 w-4" />
            <span><b>Technical claims confirmed</b> by {client.expertReviewer || "the client's expert"}</span>
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button kind="good" disabled={expertBlock} onClick={() => store.approvePost(post.id)}><Check size={15} />Approve {post.status === "Copy review" ? "copy" : "design"}</Button>
          <Button kind={changeMode ? "warn" : "secondary"} onClick={() => setChangeMode(!changeMode)}>Request changes</Button>
        </div>
      </div>
    );
  } else if (working && isMaker) {
    action = (
      <div className="space-y-2">
        {openChanges > 0 && <p className="rounded-xl bg-[#FFF3D9] px-3 py-2 text-[12px] font-semibold text-[#94600A]">{openChanges} change{openChanges === 1 ? "" : "s"} to fix. Tick them in the chat as you go.</p>}
        <Button kind="primary" className="w-full" onClick={() => { if (openChanges && !window.confirm("Some changes are not ticked off. Submit anyway?")) return; store.submitPost(post.id); }}>
          Submit {post.status === "Copy in progress" ? "copy" : "design"} for review <ArrowRight size={15} />
        </Button>
        <p className="text-center text-[11px] text-[#8B867E]">{nameOf(state, reviewer)} is notified by email and here.</p>
      </div>
    );
  } else if (post.status === "Client approval" && !isFreelancer(state)) {
    action = (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="font-semibold">Client answered by</span>
          <select value={via} onChange={(event) => setVia(event.target.value)} className="rounded-lg border border-[#E2DED7] bg-white px-2 py-1 text-[12px] font-semibold">{["Email", "Canva comment", "Drive comment", "Call", "WhatsApp"].map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button kind="good" onClick={() => store.logClientApproval(post.id, via, "")}><Check size={15} />Client approved</Button>
          <Button kind={changeMode ? "warn" : "secondary"} onClick={() => { setCategory("Copy"); setChangeMode(!changeMode); }}>Client wants changes</Button>
        </div>
      </div>
    );
  } else if (post.status === "Ready to schedule" && (isMaker || !isFreelancer(state))) {
    action = (
      <div className="space-y-2">
        <div className="flex gap-2"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Publish date" className={`${fieldClass} !mt-0`} /></div>
        {!post.driveLink && <p className="text-[12px] font-semibold text-[#94600A]">Add the Drive link to the final files first (Edit post).</p>}
        <Button kind="primary" className="w-full" disabled={!post.driveLink || !date} onClick={() => store.schedulePost(post.id, date, "Publishing tool")}>Scheduled in publishing tool</Button>
      </div>
    );
  } else if (post.status === "Scheduled") {
    action = (
      <div className="flex gap-2">
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Live post link, once it is out" aria-label="Live post link" className={`${fieldClass} !mt-0`} />
        <Button kind="good" disabled={!/^https?:/.test(url)} onClick={() => store.markLive(post.id, url)}>Live</Button>
      </div>
    );
  }

  const turn = turnOf(state, post);
  return (
    <div className="flex h-[min(78vh,760px)] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white">
      <div className={`flex items-center gap-2.5 border-b px-4 py-3 ${mine ? "border-[#CFE0FB] bg-[#EAF1FD]" : "border-[#F0EEE9]"}`}>
        {turn.who && !mine && <Avatar name={nameOf(state, turn.who)} color={personById(state, turn.who)?.color} size={26} />}
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#8B867E]">{mine ? "Your turn" : turn.who ? "Waiting on" : "Status"}</div>
          <div className="truncate text-[14px] font-bold">{turn.who && !mine ? `${nameOf(state, turn.who)} · ` : ""}{turn.verb}</div>
        </div>
        {post.liveUrl && <a href={post.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1F5BC4]">Live post <ExternalLink size={12} /></a>}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto bg-[#FBFAF8] px-4 py-4">
        {lines.map((line, index) => {
          if (line.kind === "event") return <div key={index} className="text-center text-[11px] text-[#9A958D]"><span className="rounded-full bg-white px-2.5 py-1">{line.body} · {nameOf(state, line.by)} · {ago(line.at)}</span></div>;
          const own = line.by === state.me;
          const person = personById(state, line.by);
          return (
            <div key={index} className={`flex gap-2 ${own ? "flex-row-reverse" : ""}`}>
              {line.by === "client" ? <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#E0A325] text-[11px] font-bold text-white">C</span> : <Avatar name={person?.name ?? "?"} color={person?.color} size={28} />}
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${line.change ? (line.resolved ? "bg-[#E7F6EE]" : "bg-[#FFF1E2] ring-1 ring-[#F5CFA3]") : own ? "bg-[#2F6FDB] text-white" : "bg-white ring-1 ring-[#ECE9E3]"}`}>
                <div className={`mb-0.5 flex items-center gap-1.5 text-[11px] font-bold ${own && !line.change ? "text-white/80" : "text-[#6B6760]"}`}>
                  {line.by === "client" ? "Client" : person?.name}
                  {line.change && <span className={line.resolved ? "text-[#17804A]" : "text-[#C2620F]"}>{line.resolved ? "✓ fixed" : `change · ${line.category}`}</span>}
                  <span className="font-normal opacity-70">{ago(line.at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{line.body}</p>
                {line.change && line.id && <button onClick={() => store.resolveChange(post.id, line.id!)} className="mt-1 text-[12px] font-bold text-[#1F5BC4]">{line.resolved ? "Reopen" : "Mark as fixed"}</button>}
              </div>
            </div>
          );
        })}
        {lines.length === 0 && <p className="pt-10 text-center text-[13px] text-[#8B867E]">No messages yet. Questions, feedback and change requests go here.</p>}
        <div ref={end} />
      </div>

      <div className="space-y-2.5 border-t border-[#F0EEE9] p-3">
        {action}
        {changeMode && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-semibold text-[#C2620F]">What kind of change?</span>
            {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold ${category === item ? "bg-[#E8862A] text-white" : "bg-[#FFF1E2] text-[#94600A]"}`}>{item}</button>)}
            <button onClick={() => setChangeMode(false)} aria-label="Cancel change request" className="ml-auto text-[#8B867E]"><X size={15} /></button>
          </div>
        )}
        <div className={`flex items-end gap-2 rounded-2xl border p-1.5 ${changeMode ? "border-[#F5CFA3] bg-[#FFF8F0]" : "border-[#E2DED7]"}`}>
          <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} rows={2} placeholder={changeMode ? "Describe the change. The freelancer will tick it off." : "Message… (@name to notify someone)"} aria-label="Message" className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] outline-none" />
          <Button kind={changeMode ? "warn" : "primary"} size="sm" onClick={send} disabled={!text.trim()}>{changeMode ? "Send changes" : "Send"}</Button>
        </div>
      </div>
    </div>
  );
}


// ─── Quality checklist: the freelancer ticks it before submitting, the reviewer sees it ───
function QualityCard({ post }: { post: Post }) {
  const store = useStore();
  const progress = qaProgress(post);
  const applicable = new Set(qaItemsFor(post).map((item) => item.id));
  const ticked = new Set(post.qa ?? []);
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white ${progress.missing === 0 ? "bg-[#1D9E5A]" : "bg-[#7C5CD6]"}`}><Check size={16} strokeWidth={3} /></span>
        <span className="flex-1"><span className="block text-[14px] font-bold">Quality checklist</span><span className="block text-[12px] text-[#8B867E]">From the brand guide. Tick each before it goes for review.</span></span>
        <span className="text-[13px] font-bold">{progress.ticked}/{progress.total}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-[#F0EEE9] px-4 py-4">
          {qaGroups.map((group) => {
            const items = group.items.filter((item) => applicable.has(item.id));
            return (
              <div key={group.title}>
                <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-[#8B867E]">{group.title}</div>
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li key={item.id}>
                      <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
                        <input type="checkbox" checked={ticked.has(item.id)} onChange={() => store.toggleQa(post.id, item.id)} className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className={ticked.has(item.id) ? "text-[#9A958D] line-through" : ""}>{item.text}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
