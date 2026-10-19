"use client";

import { useState } from "react";
import { ArrowLeft, Check, Download, ExternalLink, FileText, Film, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { ago, daysSince, isFreelancer, isOwner, nameOf, personById, reviewerFor, shortDate, stageOf, stages, turnOf } from "@/lib/works/logic";
import type { Client, Post, PostFile, RevisionCategory } from "@/lib/works/types";
import { buildZip, safeName } from "@/lib/zip";
import { asset, Avatar, Button, Card, Chip, Field, Stepper, fieldClass, tone } from "./kit";

const platformsAll = ["LinkedIn", "Instagram", "Facebook", "TikTok", "Newsletter"];
const limits: Record<string, number> = { LinkedIn: 3000, Instagram: 2200, Facebook: 5000, TikTok: 2200, Newsletter: 20000 };
const categories: RevisionCategory[] = ["Brand", "Copy", "Layout", "Factual"];

const kindOf = (file: File): PostFile["kind"] => (file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : file.type.startsWith("video/") ? "video" : "other");

export function PostView({ post, client }: { post: Post; client: Client }) {
  const store = useStore();
  const { state, go } = store;
  const turn = turnOf(state, post);
  const freelancer = isFreelancer(state);
  const reviewer = reviewerFor(state, client);
  const isReviewer = state.me === reviewer || isOwner(state);
  const isFreelancerOnIt = state.me === client.freelancerId;
  const canEditCopy = post.status === "Copy in progress" || (post.status === "Copy review" && isReviewer);
  const canEditDesign = ["Copy in progress", "Design in progress", "Copy review", "Design review"].includes(post.status);
  const changes = post.comments.filter((comment) => comment.kind === "change");
  const openChanges = changes.filter((comment) => !comment.resolved);
  const set = (patch: Partial<Post>) => store.updatePost(post.id, patch);
  const back = () => go({ view: "client", clientId: client.id, tab: "marketing", sub: "content" });
  const stage = stageOf(post.status);
  const waiting = turn.who ? daysSince(post.waitingSince) : 0;

  return (
    <div className="space-y-4">
      <button onClick={back} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6B6760] hover:text-[#1E2430]"><ArrowLeft size={15} />Back to {client.name} content</button>

      <Card>
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-[260px] flex-1">
            <input value={post.title} onChange={(event) => set({ title: event.target.value })} aria-label="Post title" className="w-full bg-transparent text-[22px] font-extrabold leading-tight outline-none" />
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[#6B6760]">
              <span>{post.format}</span>·<span>planned for {shortDate(post.date)}</span>·<span>version {post.version}</span>
              {post.needsExpert && <Chip t={post.expertOk ? "green" : "purple"}><ShieldCheck size={12} />{post.expertOk ? "Expert confirmed" : "Expert check needed"}</Chip>}
            </div>
          </div>
          <div className={`rounded-2xl px-4 py-3 ${turn.who === state.me ? "bg-[#EAF1FD]" : turn.tone === "done" ? "bg-[#E7F6EE]" : "bg-[#F6F5F2]"}`}>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8B867E]">{turn.who === state.me ? "Your turn" : turn.tone === "done" ? "Status" : "Waiting on"}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[15px] font-bold">
              {turn.who && turn.who !== state.me && <Avatar name={nameOf(state, turn.who)} color={personById(state, turn.who)?.color} size={22} />}
              {turn.who && turn.who !== state.me ? `${nameOf(state, turn.who)} · ` : ""}{turn.verb}
            </div>
            {waiting > 0 && turn.tone !== "freelancer" && <div className={`text-[12px] font-semibold ${waiting >= state.settings.escalationDays ? "text-[#B83232]" : "text-[#6B6760]"}`}>waiting {waiting} day{waiting === 1 ? "" : "s"}</div>}
          </div>
        </div>
        <div className="mt-4"><Stepper steps={client.approvalMode === "A" ? stages : stages.filter((item) => item !== "Client")} current={client.approvalMode === "A" ? stage : stage > 2 ? stage - 1 : stage} done={post.status === "Published"} /></div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <CopyPanel post={post} editable={canEditCopy || isOwner(state)} onChange={set} />
          <CreativePanel post={post} editable={canEditDesign || isOwner(state)} onChange={set} />
        </div>
        <div className="space-y-4">
          <DecisionPanel post={post} client={client} isReviewer={isReviewer} isFreelancerOnIt={isFreelancerOnIt || (!freelancer && !client.freelancerId)} openChanges={openChanges.length} />
          <Conversation post={post} />
          {changes.length > 0 && (
            <Card>
              <h3 className="text-[15px] font-bold">Revision log</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {categories.map((category) => { const count = changes.filter((comment) => comment.category === category).length; return count ? <Chip key={category} t="amber">{category} · {count}</Chip> : null; })}
              </div>
              <p className="mt-2 text-[12px] text-[#6B6760]">Every change request is logged with its category, so month-end shows where revisions come from.</p>
            </Card>
          )}
          <Card>
            <h3 className="text-[15px] font-bold">History</h3>
            <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
              {post.history.map((event, index) => (
                <li key={index} className="flex gap-2 text-[12px]"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A8A39B]" /><span><b>{event.text}</b><span className="text-[#8B867E]"> · {nameOf(state, event.by)} · {ago(event.at)}</span></span></li>
              ))}
              {post.history.length === 0 && <li className="text-[12px] text-[#8B867E]">No history yet.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CopyPanel({ post, editable, onChange }: { post: Post; editable: boolean; onChange: (patch: Partial<Post>) => void }) {
  const { ping } = useStore();
  const [tab, setTab] = useState("main");
  const togglePlatform = (platform: string) => onChange({ platforms: post.platforms.includes(platform) ? post.platforms.filter((item) => item !== platform) : [...post.platforms, platform] });
  const custom = Object.keys(post.captions);
  const value = tab === "main" ? post.copy : post.captions[tab] ?? "";
  const limit = tab === "main" ? Math.min(...post.platforms.map((platform) => limits[platform] ?? 3000)) : limits[tab] ?? 3000;
  const write = (text: string) => (tab === "main" ? onChange({ copy: text }) : onChange({ captions: { ...post.captions, [tab]: text } }));
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-[16px] font-bold">1 · Copy</h3>
        {platformsAll.map((platform) => (
          <button key={platform} disabled={!editable} onClick={() => togglePlatform(platform)} aria-pressed={post.platforms.includes(platform)} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${post.platforms.includes(platform) ? "bg-[#1E2430] text-white" : "bg-[#F1F0ED] text-[#6B6760]"}`}>{platform}</button>
        ))}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button onClick={() => setTab("main")} className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${tab === "main" ? "bg-[#EAF1FD] text-[#1F5BC4]" : "text-[#6B6760] hover:bg-[#F6F5F2]"}`}>Main caption</button>
        {custom.map((platform) => <button key={platform} onClick={() => setTab(platform)} className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${tab === platform ? "bg-[#EAF1FD] text-[#1F5BC4]" : "text-[#6B6760] hover:bg-[#F6F5F2]"}`}>{platform} version</button>)}
        {editable && post.platforms.filter((platform) => !custom.includes(platform)).length > 0 && (
          <select value="" onChange={(event) => { if (!event.target.value) return; onChange({ captions: { ...post.captions, [event.target.value]: post.copy } }); setTab(event.target.value); }} aria-label="Add a version for a platform" className="rounded-lg border border-dashed border-[#D6D1C8] bg-white px-2 py-1.5 text-[12px] font-semibold text-[#6B6760]">
            <option value="">+ Different wording for…</option>
            {post.platforms.filter((platform) => !custom.includes(platform)).map((platform) => <option key={platform}>{platform}</option>)}
          </select>
        )}
      </div>
      <textarea value={value} readOnly={!editable} onChange={(event) => write(event.target.value)} rows={6} aria-label="Caption" placeholder="Write the caption here." className={`${fieldClass} leading-relaxed ${!editable ? "bg-[#FBFAF8]" : ""}`} />
      <div className="mt-1.5 flex items-center justify-between text-[12px]">
        <span className={value.length > limit ? "font-bold text-[#B83232]" : "text-[#8B867E]"}>{value.length.toLocaleString()} / {limit.toLocaleString()} characters</span>
        <span className="flex gap-3">
          {tab !== "main" && editable && <button onClick={() => { const next = { ...post.captions }; delete next[tab]; onChange({ captions: next }); setTab("main"); }} className="font-semibold text-[#B83232]">Remove version</button>}
          <button onClick={async () => { try { await navigator.clipboard.writeText(value); ping("Caption copied"); } catch { ping("Copy was blocked"); } }} className="font-semibold text-[#1F5BC4]">Copy</button>
        </span>
      </div>
      {!editable && <p className="mt-2 text-[12px] text-[#8B867E]">Copy is locked once it is approved. The reviewer can send it back if it needs changing.</p>}
    </Card>
  );
}

function CreativePanel({ post, editable, onChange }: { post: Post; editable: boolean; onChange: (patch: Partial<Post>) => void }) {
  const { ping } = useStore();
  const [slide, setSlide] = useState(0);
  const [busy, setBusy] = useState(false);
  const visual = post.files.filter((file) => file.kind !== "other");
  const current = visual[Math.min(slide, visual.length - 1)];

  function add(list: FileList | null) {
    if (!list) return;
    Array.from(list).forEach((file) => {
      const base = { id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: file.name, kind: kindOf(file) };
      if (file.size < 1_500_000) {
        const reader = new FileReader();
        reader.onload = () => onChange({ files: [...postFilesRef.current, { ...base, src: String(reader.result) }] });
        reader.readAsDataURL(file);
      } else onChange({ files: [...postFilesRef.current, { ...base, src: URL.createObjectURL(file) }] });
    });
    ping("Files added");
  }
  const postFilesRef = { current: post.files };

  async function downloadAll() {
    setBusy(true);
    try {
      const entries = await Promise.all(post.files.map(async (file, index) => ({ name: `${String(index + 1).padStart(2, "0")}-${safeName(file.name)}`, data: new Uint8Array(await (await fetch(asset(file.src))).arrayBuffer()) })));
      const url = URL.createObjectURL(buildZip(entries));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName(post.title)}.zip`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
      ping("Could not bundle the files");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-[16px] font-bold">2 · Creative</h3>
        {post.files.length > 0 && <Button size="sm" onClick={downloadAll} disabled={busy}><Download size={13} />{busy ? "Preparing…" : post.files.length > 1 ? `Download all (${post.files.length})` : "Download"}</Button>}
      </div>
      {current ? (
        <div className="relative grid min-h-[320px] place-items-center overflow-hidden rounded-xl bg-[#F1F0ED]">
          {current.kind === "image" && /* eslint-disable-next-line @next/next/no-img-element */ <img src={asset(current.src)} alt={current.name} className="max-h-[520px] w-auto object-contain" />}
          {current.kind === "video" && <video src={asset(current.src)} controls className="max-h-[520px]" />}
          {current.kind === "pdf" && <iframe src={asset(current.src)} title={current.name} className="h-[520px] w-full bg-white" />}
          {visual.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-1 text-[12px] font-semibold text-white">{Math.min(slide, visual.length - 1) + 1} / {visual.length}</span>}
        </div>
      ) : (
        <div className="grid min-h-[160px] place-items-center rounded-xl bg-[#F6F5F2] text-center text-[13px] text-[#8B867E]">{post.status.startsWith("Copy") ? "Design starts after the copy is approved." : "No artwork uploaded yet."}</div>
      )}
      {post.files.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {post.files.map((file) => {
            const index = visual.indexOf(file);
            return (
              <div key={file.id} className={`relative shrink-0 overflow-hidden rounded-lg border-2 ${current?.id === file.id ? "border-[#2F6FDB]" : "border-transparent"}`}>
                <button onClick={() => index >= 0 && setSlide(index)} className="grid h-16 w-16 place-items-center bg-[#F1F0ED]" aria-label={`Show ${file.name}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {file.kind === "image" ? <img src={asset(file.src)} alt="" className="h-full w-full object-cover" /> : file.kind === "video" ? <Film size={18} /> : <FileText size={18} />}
                </button>
                {editable && <button onClick={() => onChange({ files: post.files.filter((item) => item.id !== file.id) })} aria-label={`Remove ${file.name}`} className="absolute right-0.5 top-0.5 rounded bg-white/90 p-0.5 text-[#B83232]"><Trash2 size={11} /></button>}
              </div>
            );
          })}
        </div>
      )}
      {editable && (
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D3DDEC] bg-[#F7FAFF] p-4 text-[13px] font-semibold text-[#1F5BC4] hover:bg-[#EEF4FF]">
          <UploadCloud size={18} /> Upload artwork: images in slide order, a PDF carousel or a video
          <input type="file" multiple accept="image/*,video/*,application/pdf" className="sr-only" onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
        </label>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Editable design (Canva / Adobe)"><div className="flex gap-2"><input value={post.designLink} onChange={(event) => onChange({ designLink: event.target.value })} placeholder="https://www.canva.com/design/…" className={fieldClass} />{/^https?:/.test(post.designLink) && <a href={post.designLink} target="_blank" rel="noreferrer" className="mt-1 grid w-11 place-items-center rounded-xl bg-[#EEF2FA] text-[#1F5BC4]" aria-label="Open design"><ExternalLink size={14} /></a>}</div></Field>
        <Field label="Final files in the client's Drive"><div className="flex gap-2"><input value={post.driveLink} onChange={(event) => onChange({ driveLink: event.target.value })} placeholder="https://drive.google.com/…" className={fieldClass} />{/^https?:/.test(post.driveLink) && <a href={post.driveLink} target="_blank" rel="noreferrer" className="mt-1 grid w-11 place-items-center rounded-xl bg-[#EEF2FA] text-[#1F5BC4]" aria-label="Open Drive"><ExternalLink size={14} /></a>}</div></Field>
      </div>
    </Card>
  );
}

function DecisionPanel({ post, client, isReviewer, isFreelancerOnIt, openChanges }: { post: Post; client: Client; isReviewer: boolean; isFreelancerOnIt: boolean; openChanges: number }) {
  const store = useStore();
  const { state } = store;
  const [asking, setAsking] = useState(false);
  const [category, setCategory] = useState<RevisionCategory>("Copy");
  const [body, setBody] = useState("");
  const [via, setVia] = useState("Email");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(post.date);
  const [schedVia, setSchedVia] = useState("Publer");
  const [url, setUrl] = useState("");
  const working = post.status === "Copy in progress" || post.status === "Design in progress";
  const reviewing = post.status === "Copy review" || post.status === "Design review";
  const due = new Date(`${post.waitingSince}T12:00:00`);
  due.setDate(due.getDate() + state.settings.clientApprovalDays);

  const changeForm = (fromClient: boolean) => (
    <div className="mt-3 space-y-2 rounded-xl bg-[#FFF6EC] p-3">
      <div className="flex flex-wrap gap-1.5">
        {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold ${category === item ? "bg-[#E8862A] text-white" : "bg-white text-[#94600A]"}`}>{item}</button>)}
      </div>
      <textarea autoFocus value={body} onChange={(event) => setBody(event.target.value)} rows={3} placeholder={fromClient ? "What did the client ask for?" : "What needs to change? Be specific: the freelancer ticks each request off."} className="w-full rounded-lg border border-[#F2D7B5] bg-white px-3 py-2 text-[13px] outline-none" />
      <div className="flex gap-2">
        <Button kind="warn" size="sm" onClick={() => { if (!body.trim()) { store.ping("Describe the change first"); return; } store.requestChanges(post.id, body.trim(), category); setBody(""); setAsking(false); }}>Send to {nameOf(state, client.freelancerId)}</Button>
        <Button size="sm" kind="ghost" onClick={() => setAsking(false)}>Cancel</Button>
      </div>
    </div>
  );

  let content: React.ReactNode;
  if (working) {
    content = isFreelancerOnIt ? (
      <>
        <p className="text-[13px] text-[#55514B]">{post.status === "Copy in progress" ? "Write the caption, then submit it. Design starts once the copy is approved." : "Upload the artwork and the editable Canva link, then submit."}</p>
        {openChanges > 0 && <p className="mt-2 rounded-lg bg-[#FFF3D9] px-3 py-2 text-[13px] font-semibold text-[#94600A]">{openChanges} requested change{openChanges === 1 ? "" : "s"} below. Tick each one off as you fix it.</p>}
        <Button kind="primary" className="mt-3 w-full" onClick={() => { if (openChanges && !window.confirm(`${openChanges} change request${openChanges === 1 ? " is" : "s are"} not ticked off. Submit anyway?`)) return; store.submitPost(post.id); }}>
          Submit {post.status === "Copy in progress" ? "copy" : "design"} for review
        </Button>
        <p className="mt-2 text-[12px] text-[#8B867E]">{nameOf(state, reviewerFor(state, client))} is notified by email and in the OS.</p>
      </>
    ) : (
      <p className="text-[13px] text-[#55514B]">{nameOf(state, client.freelancerId)} is working on the {post.status.startsWith("Copy") ? "copy" : "design"}.</p>
    );
  } else if (reviewing) {
    const expertBlock = post.status === "Design review" && post.needsExpert && !post.expertOk;
    content = isReviewer ? (
      <>
        <p className="text-[13px] text-[#55514B]">Check the {post.status === "Copy review" ? "caption" : "artwork and caption"}. Approve it, or send it back with clear changes.</p>
        {post.needsExpert && (
          <label className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-[13px] ${post.expertOk ? "bg-[#E7F6EE]" : "bg-[#F1ECFC]"}`}>
            <input type="checkbox" checked={post.expertOk} onChange={(event) => store.updatePost(post.id, { expertOk: event.target.checked })} className="mt-0.5 h-4 w-4" />
            <span><b>Technical claims confirmed</b> by {client.expertReviewer || "the client's expert"}. Needed before design approval.</span>
          </label>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button kind="good" disabled={expertBlock} onClick={() => store.approvePost(post.id)}><Check size={15} />Approve {post.status === "Copy review" ? "copy" : "design"}</Button>
          <Button kind="warn" onClick={() => { setCategory(post.status === "Copy review" ? "Copy" : "Layout"); setAsking(true); }}>Request changes</Button>
        </div>
        {asking && changeForm(false)}
        <p className="mt-2 text-[12px] text-[#8B867E]">{post.status === "Design review" ? (client.approvalMode === "A" ? "After approval it goes to the client (mode A)." : "After approval it is ready to schedule.") : "After approval, design starts."}</p>
      </>
    ) : (
      <p className="text-[13px] text-[#55514B]">Submitted {ago(post.waitingSince)}. Waiting for {nameOf(state, reviewerFor(state, client))}. You will be notified.</p>
    );
  } else if (post.status === "Client approval") {
    content = !isFreelancer(state) ? (
      <>
        <p className="text-[13px] text-[#55514B]">Send it to {client.approver.name || "the client's approver"} and log their answer here. One consolidated round per batch.</p>
        <p className={`mt-1 text-[12px] font-semibold ${due.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10) ? "text-[#B83232]" : "text-[#6B6760]"}`}>Answer due {shortDate(due.toISOString())} ({state.settings.clientApprovalDays} working days)</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Field label="How they answered"><select value={via} onChange={(event) => setVia(event.target.value)} className={fieldClass}>{["Email", "Canva comment", "Drive comment", "Call", "WhatsApp"].map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Note (optional)"><input value={note} onChange={(event) => setNote(event.target.value)} className={fieldClass} placeholder="e.g. 'Happy, go ahead'" /></Field>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button kind="good" onClick={() => store.logClientApproval(post.id, via, note)}><Check size={15} />Client approved</Button>
          <Button kind="warn" onClick={() => { setCategory("Copy"); setAsking(true); }}>Client wants changes</Button>
        </div>
        {asking && changeForm(true)}
      </>
    ) : (
      <p className="text-[13px] text-[#55514B]">With the client since {shortDate(post.waitingSince)}. Operations logs the answer.</p>
    );
  } else if (post.status === "Ready to schedule") {
    content = (
      <>
        <p className="text-[13px] text-[#55514B]">Fully approved{post.clientDecision ? ` (client, ${post.clientDecision.via})` : ""}. Schedule it and put the final files in the client&apos;s Drive.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Field label="Publish date"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={fieldClass} /></Field>
          <Field label="Scheduled in"><select value={schedVia} onChange={(event) => setSchedVia(event.target.value)} className={fieldClass}><option>Publer</option><option>Manually</option></select></Field>
        </div>
        {!post.driveLink && <p className="mt-2 text-[12px] font-semibold text-[#94600A]">Add the Drive link to the final files first (Creative panel).</p>}
        <Button kind="primary" className="mt-3 w-full" disabled={!post.driveLink || !date} onClick={() => store.schedulePost(post.id, date, schedVia)}>Mark as scheduled</Button>
      </>
    );
  } else if (post.status === "Scheduled") {
    content = (
      <>
        <p className="text-[13px] text-[#55514B]">Scheduled for {shortDate(post.date)} in {post.scheduledVia ?? "Publer"}. After it goes out, add the live link.</p>
        <div className="mt-3 flex gap-2"><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://… live post" aria-label="Live post link" className={fieldClass} /><Button kind="good" className="mt-1" disabled={!/^https?:/.test(url)} onClick={() => store.markLive(post.id, url)}>Live</Button></div>
      </>
    );
  } else {
    content = (
      <div className="flex items-center gap-2 text-[14px] font-semibold text-[#17804A]"><Check size={16} />Published {post.liveUrl && <a href={post.liveUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[#1F5BC4]">Open <ExternalLink size={13} /></a>}</div>
    );
  }

  return (
    <Card className="border-[#1E2430]/15">
      <h3 className="mb-2 text-[15px] font-bold">What happens now</h3>
      {content}
      {post.status === "Client approval" && isOwner(state) && <button onClick={() => store.moveBack(post.id)} className="mt-3 text-[12px] font-semibold text-[#8B867E] underline">Pull back to design</button>}
    </Card>
  );
}

function Conversation({ post }: { post: Post }) {
  const store = useStore();
  const { state } = store;
  const [text, setText] = useState("");
  const names = [...state.people, ...state.freelancers].map((person) => person.name.split(" ")[0]);
  return (
    <Card pad={false}>
      <div className="border-b border-[#F0EEE9] px-5 py-3.5"><h3 className="text-[15px] font-bold">Comments</h3></div>
      <div className="max-h-[420px] space-y-2.5 overflow-y-auto p-4">
        {post.comments.map((comment) => {
          const person = personById(state, comment.by);
          const isChange = comment.kind === "change";
          return (
            <div key={comment.id} className="rounded-xl p-3" style={{ background: isChange ? (comment.resolved ? tone.green.bg : "#FFF6EC") : comment.kind === "system" ? "#F6F5F2" : "#F8F7F4" }}>
              <div className="flex items-center gap-2 text-[12px]">
                {comment.by === "client" ? <Chip t="blue">Client</Chip> : <Avatar name={person?.name ?? "?"} color={person?.color} size={20} />}
                <b>{comment.by === "client" ? "" : person?.name}</b>
                {isChange && <Chip t={comment.resolved ? "green" : "amber"}>{comment.resolved ? "Done" : `Change · ${comment.category}`}</Chip>}
                <span className="ml-auto text-[#A8A39B]">{ago(comment.at)}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed">{comment.body}</p>
              {isChange && <button onClick={() => store.resolveChange(post.id, comment.id)} className="mt-1.5 text-[12px] font-semibold text-[#1F5BC4]">{comment.resolved ? "Reopen" : "Mark as fixed"}</button>}
            </div>
          );
        })}
        {post.comments.length === 0 && <p className="text-[13px] text-[#8B867E]">No comments yet.</p>}
      </div>
      <div className="border-t border-[#F0EEE9] p-4">
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={2} placeholder="Write a comment. Type @Name to notify someone." aria-label="Comment" className="w-full rounded-xl border border-[#E2DED7] px-3 py-2 text-[13px] outline-none focus:border-[#2F6FDB]" />
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {names.filter((name) => name !== state.people.concat(state.freelancers).find((p) => p.id === state.me)?.name.split(" ")[0]).slice(0, 6).map((name) => <button key={name} onClick={() => setText((value) => `${value}${value && !value.endsWith(" ") ? " " : ""}@${name} `)} className="rounded-md bg-[#F1F0ED] px-1.5 py-0.5 text-[11px] font-semibold text-[#55514B]">@{name}</button>)}
          <Button size="sm" kind="primary" className="ml-auto" onClick={() => { if (!text.trim()) return; store.comment(post.id, text.trim()); setText(""); }}>Comment</Button>
        </div>
      </div>
    </Card>
  );
}
