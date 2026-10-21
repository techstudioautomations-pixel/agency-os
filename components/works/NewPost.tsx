"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, FilePlus2, Lightbulb, Maximize2, Send, Trash2, UploadCloud, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { agreedFor, isMarketing, monthName, myClients, planSlot, reviewerFor, shiftMonth, shortDate } from "@/lib/works/logic";
import type { PostFile } from "@/lib/works/types";
import { Button, ClientMark, Field, fieldClass } from "./kit";
import { Lightbox } from "./Lightbox";
import { CtaPicker } from "./CtaPicker";
import { ChannelIcon } from "./ChannelIcon";
import { isLinkedInCarousel, pagesIn, readPostFiles, slidesOf, withoutFile } from "@/lib/works/pdf";

const formats = ["Carousel", "Text post", "Single image", "Reel", "Document", "Newsletter"] as const;
const formatLabel: Record<string, string> = { Reel: "Video / Reel", Document: "PDF / document", "Single image": "Image only", "Text post": "Text only" };
type Format = (typeof formats)[number];
/** Extra work can be made of anything, so it accepts any of these files. */
const extraAttach = { accept: "image/*,video/*,application/pdf,.doc,.docx,.ppt,.pptx", multiple: true, label: "Upload the files", hint: "Images, a PDF, a video or documents." };
const formatFor = (value: string): Format => ((formats as readonly string[]).includes(value) ? (value as Format) : value === "Video" ? "Reel" : "Document");
const channels = ["LinkedIn", "Instagram", "Facebook", "TikTok", "Newsletter"];
const steps = ["For", "From", "What", "Content", "Review"];
const titles = ["What is this for?", "Where does it come from?", "What kind of post is it?", "Add the words and the files", "Who reviews it?"];

/** What can be attached for each kind of post. */
const attach: Record<(typeof formats)[number], { accept: string; multiple: boolean; label: string; hint: string }> = {
  Carousel: { accept: "image/*,application/pdf", multiple: true, label: "Upload the slides", hint: "Several images in order, or one PDF." },
  "Single image": { accept: "image/*", multiple: false, label: "Upload the image", hint: "One image." },
  Reel: { accept: "video/*", multiple: false, label: "Upload the video", hint: "One video file." },
  "Text post": { accept: "image/*", multiple: false, label: "Add an image (optional)", hint: "A text post does not need one." },
  Newsletter: { accept: "application/pdf,image/*,.doc,.docx", multiple: true, label: "Upload the newsletter files", hint: "A PDF, a document or images." },
  Document: { accept: "application/pdf,.doc,.docx,.ppt,.pptx,image/*", multiple: true, label: "Upload the PDF or files", hint: "A PDF, a document or images." },
};

const kindOf = (file: File): PostFile["kind"] => (file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : file.type.startsWith("video/") ? "video" : "other");
const pad = (value: number) => String(value).padStart(2, "0");

export function NewPostWizard() {
  const { postWizard } = useStore();
  if (!postWizard.open || typeof document === "undefined") return null;
  return createPortal(<Wizard key={`${postWizard.clientId ?? ""}-${postWizard.ideaId ?? ""}-${postWizard.assetId ?? ""}`} />, document.body);
}

function Wizard() {
  const { state, postWizard, closePostWizard, createPost, go, ping } = useStore();
  const [reading, setReading] = useState(false);
  const clients = myClients(state).filter(isMarketing);
  const idea = state.ideas.find((item) => item.id === postWizard.ideaId);
  const firstClient = idea?.clientId ?? postWizard.clientId ?? (clients.length === 1 ? clients[0].id : "");
  const startAsset = postWizard.assetId ? state.clients.flatMap((item) => item.assets).find((item) => item.id === postWizard.assetId) : undefined;

  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState(firstClient);
  const [month, setMonth] = useState(postWizard.date?.slice(0, 7) ?? state.month);
  const [date, setDate] = useState(postWizard.date ?? `${state.month}-${pad(state.settings.dates.schedule)}`);
  const [source, setSource] = useState<"idea" | "new">(idea ? "idea" : "new");
  const [ideaId, setIdeaId] = useState(idea?.id ?? "");
  const [title, setTitle] = useState(idea?.title ?? startAsset?.name ?? "");
  const [kind, setKind] = useState<"plan" | "extra">(startAsset ? "extra" : "plan");
  const [extraPick, setExtraPick] = useState(startAsset ? `asset:${startAsset.id}` : "");
  const [extraName, setExtraName] = useState("");
  const [format, setFormat] = useState<Format>(startAsset ? formatFor(startAsset.format) : formatFor(idea?.format ?? "Carousel"));
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [copy, setCopy] = useState(idea?.angle ?? "");
  const [different, setDifferent] = useState(false);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [captionTab, setCaptionTab] = useState("");
  const [active, setActive] = useState(0);
  const [big, setBig] = useState<number | null>(null);
  const [files, setFiles] = useState<PostFile[]>([]);
  const [reviewerId, setReviewerId] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const client = clients.find((item) => item.id === clientId);
  const approved = state.ideas.filter((item) => item.clientId === clientId && item.decision === "Approved" && !item.postId);
  const planned = client ? state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(month) && !post.extra).length : 0;
  const clientExtras = client?.assets.filter((asset) => asset.kind === "extra" && asset.source !== "package") ?? [];
  const libraryExtras = state.settings.assets.filter((asset) => asset.kind === "extra" && !client?.assets.some((entry) => entry.assetId === asset.id));
  const pickedAsset = extraPick.startsWith("asset:") ? clientExtras.find((asset) => asset.id === extraPick.slice(6)) : undefined;
  const pickedLibrary = extraPick.startsWith("lib:") ? libraryExtras.find((asset) => asset.id === extraPick.slice(4)) : undefined;
  const extraType = kind === "extra" ? (pickedAsset?.name ?? pickedLibrary?.name ?? (extraName.trim() || "Extra")) : undefined;
  const hasPlan = Boolean(client?.assets.some((asset) => asset.source === "package"));
  // The type of post decides what it counts as, for this client in this month.
  const slot = client && kind === "plan" ? planSlot(client, state.posts, month, format) : undefined;
  const notInPlan = kind === "plan" && hasPlan && !slot;
  const nextMonth = shiftMonth(month, 1);
  const reviewers = state.people.filter((person) => person.role !== "freelancer");
  const defaultReviewer = client ? reviewerFor(state, client) : "";
  const channelList = client ? [...new Set([...client.platforms, ...channels])] : channels;
  const picked = platforms.length ? platforms : client?.platforms.slice(0, 1) ?? [];
  const rule = kind === "extra" ? extraAttach : attach[format];
  const day = Number(date.slice(8, 10)) || 1;
  const useDifferent = picked.length > 1 && different;
  const tab = useDifferent ? (picked.includes(captionTab) ? captionTab : picked[0]) : "";
  const captionFor = (channel: string) => captions[channel] ?? copy;
  const hasCaption = useDifferent ? picked.every((channel) => captionFor(channel).trim()) : Boolean(copy.trim());
  const slides = slidesOf(files);
  const shownFile = slides[Math.min(active, slides.length - 1)];

  const chooseMonth = (value: string) => {
    setMonth(value);
    setDate(`${value}-${pad(Math.min(state.settings.dates.schedule, 28))}`);
  };
  const chooseExtra = (value: string) => {
    setExtraPick(value);
    const asset = value.startsWith("asset:") ? clientExtras.find((entry) => entry.id === value.slice(6)) : value.startsWith("lib:") ? libraryExtras.find((entry) => entry.id === value.slice(4)) : undefined;
    if (asset) { setFormat(formatFor(asset.format)); setTitle(asset.name); }
    setFiles([]);
  };
  const chooseIdea = (id: string) => {
    setIdeaId(id);
    const found = state.ideas.find((item) => item.id === id);
    if (found) {
      setTitle(found.title);
      if (!copy.trim() && found.angle) setCopy(found.angle);
      setFormat(formatFor(found.format));
    }
  };
  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const chosen = rule.multiple ? Array.from(list) : Array.from(list).slice(0, 1);
    setReading(true);
    try {
      const { files: read, notes } = await readPostFiles(chosen);
      setFiles((current) => (rule.multiple ? [...current, ...read] : read));
      if (notes.length) ping(notes[0]);
    } finally {
      setReading(false);
    }
  };
  const move = (index: number, delta: number) => setFiles((current) => { const next = [...current]; const to = index + delta; if (to < 0 || to >= next.length) return current; [next[index], next[to]] = [next[to], next[index]]; return next; });

  const valid = [
    Boolean(client) && Boolean(date) && (kind === "plan" || (Boolean(extraPick) && (extraPick !== "other" || extraName.trim().length > 0))),
    kind === "extra" || source === "new" ? title.trim().length > 0 : Boolean(ideaId),
    true,
    true,
    true,
  ];
  const finish = (send: boolean) => {
    if (!client) return;
    const id = createPost({ clientId: client.id, ideaId: kind === "plan" && source === "idea" ? ideaId : undefined, extra: kind === "extra" || notInPlan || undefined, extraType: kind === "extra" ? extraType : notInPlan ? (formatLabel[format] ?? format) : undefined, assetId: kind === "extra" ? pickedAsset?.id : slot?.asset.id, title: title.trim() || "Untitled post", format, platforms: picked, date, copy: (useDifferent ? captionFor(picked[0]) : copy).trim(), captions: useDifferent ? Object.fromEntries(picked.map((channel) => [channel, captionFor(channel).trim()])) : {}, files, reviewerId: reviewerId || undefined, send });
    closePostWizard();
    go({ view: "marketing", clientId: client.id, postId: id });
  };

  if (clients.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] grid place-items-center bg-[#1E2430]/50 p-4" role="dialog" aria-modal="true" aria-label="Create post">
        <div className="max-w-sm rounded-3xl bg-white p-6 text-center"><p className="text-[15px] font-bold">No clients to post for yet.</p><Button className="mt-4" onClick={closePostWizard}>Close</Button></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-[#1E2430]/50 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Create post">
      {big !== null && <Lightbox files={slides} start={big} onClose={() => setBig(null)} />}
      <div className="flex max-h-[96vh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start gap-3 border-b border-[#F0EEE9] px-6 pb-4 pt-5">
          <div className="flex-1">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-[#8B867E]">Create post</div>
            <h2 className="mt-0.5 text-[22px] font-extrabold">{step === 1 && kind === "extra" ? "What is it called?" : titles[step]}</h2>
          </div>
          <button onClick={closePostWizard} aria-label="Close" className="rounded-xl p-2 text-[#8B867E] hover:bg-[#F1F0ED]"><X size={18} /></button>
        </div>
        <ol className="flex gap-1.5 px-6 pt-4">
          {steps.map((label, index) => (
            <li key={label} className="flex-1"><span className="block h-1.5 rounded-full" style={{ background: index <= step ? "#2F6FDB" : "#E7E4DE" }} /><span className={`mt-1 block text-[11px] font-semibold ${index === step ? "text-[#1F5BC4]" : "text-[#9A958D]"}`}>{label}</span></li>
          ))}
        </ol>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Client">
                <select value={clientId} onChange={(event) => { setClientId(event.target.value); setIdeaId(""); }} className={fieldClass}>
                  {!clientId && <option value="">Choose a client…</option>}
                  {clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => setKind("plan")} aria-pressed={kind === "plan"} className={`rounded-2xl border-2 p-3.5 text-left ${kind === "plan" ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E9E6E0]"}`}>
                  <div className="text-[14px] font-extrabold">One of the monthly posts</div>
                  <div className="text-[12px] text-[#6B6760]">Part of what the client pays for each month.</div>
                </button>
                <button onClick={() => setKind("extra")} aria-pressed={kind === "extra"} className={`rounded-2xl border-2 p-3.5 text-left ${kind === "extra" ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E9E6E0]"}`}>
                  <div className="text-[14px] font-extrabold">Extra work</div>
                  <div className="text-[12px] text-[#6B6760]">A brochure, video, e-book, lead magnet, flyer, exhibition material…</div>
                </button>
              </div>
              {kind === "extra" && (
                <div className="space-y-3">
                  <Field label="Which extra?">
                    <select value={extraPick} onChange={(event) => chooseExtra(event.target.value)} className={fieldClass}>
                      <option value="">Choose…</option>
                      {clientExtras.length > 0 && <optgroup label={`On ${client?.name ?? "the account"}`}>{clientExtras.map((asset) => <option key={asset.id} value={`asset:${asset.id}`}>{asset.name}{asset.assignedTo === state.me ? " · assigned to you" : ""}{asset.due ? ` · due ${asset.due}` : ""}</option>)}</optgroup>}
                      <optgroup label="Something new">{libraryExtras.map((asset) => <option key={asset.id} value={`lib:${asset.id}`}>{asset.name}</option>)}<option value="other">Something else…</option></optgroup>
                    </select>
                  </Field>
                  {extraPick === "other" && <Field label="What is it?"><input value={extraName} onChange={(event) => { setExtraName(event.target.value); setTitle(event.target.value); }} placeholder="e.g. Tender document, contract summary" className={fieldClass} /></Field>}
                  {pickedAsset?.brief && <p className="rounded-xl bg-[#FFF9EC] px-4 py-3 text-[13px] text-[#6B4A06]"><b>Brief:</b> {pickedAsset.brief}{pickedAsset.due ? ` Due ${shortDate(pickedAsset.due)}.` : ""}</p>}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Month" hint="The post counts towards this month.">
                  <select value={month} onChange={(event) => chooseMonth(event.target.value)} className={fieldClass}>
                    {[0, 1, 2].map((delta) => <option key={delta} value={shiftMonth(state.month, delta)}>{monthName(shiftMonth(state.month, delta))}</option>)}
                  </select>
                </Field>
                <Field label="Goes out on" hint={`Week ${Math.ceil(day / 7)} of ${monthName(month).split(" ")[0]}`}>
                  <input type="date" value={date} min={`${month}-01`} max={`${month}-31`} onChange={(event) => setDate(event.target.value)} className={fieldClass} />
                </Field>
              </div>
              {client && kind === "plan" && planned >= agreedFor(client, month) && (
                <div className="flex flex-wrap gap-2 rounded-2xl bg-[#FFF3D9] px-4 py-3 text-[13px] text-[#6B4A06]">
                  <span className="flex-1">Options: put it in next month, make it extra work, or keep going and it counts as an extra post this month.</span>
                  <Button size="sm" onClick={() => chooseMonth(nextMonth)}>Use {monthName(nextMonth).split(" ")[0]}</Button>
                  <Button size="sm" onClick={() => { setKind("extra"); setExtraPick("other"); }}>Make it extra work</Button>
                </div>
              )}
              {client && (
                <div className="flex items-center gap-3 rounded-2xl bg-[#F8F7F4] p-4">
                  <ClientMark client={client} size={38} />
                  {kind === "plan" ? <p className="text-[14px]"><b>{client.name}</b> has <b>{planned}</b> of <b>{agreedFor(client, month)}</b> posts planned for {monthName(month)}. {planned >= agreedFor(client, month) ? <span className="font-semibold text-[#94600A]">That is the whole plan, so this one would be number {planned + 1}, over what they pay for.</span> : <>This one will be number {planned + 1}.</>}</p> : <p className="text-[14px]">Extra work does not count towards {client.name}&apos;s <b>{agreedFor(client, month)}</b> monthly posts.</p>}
                </div>
              )}
            </div>
          )}

          {step === 1 && kind === "extra" && (
            <div className="space-y-4">
              <Field label="Name"><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Services brochure" className={fieldClass} /></Field>
              <p className="text-[13px] text-[#6B6760]">Extra work does not start from the ideas deck.</p>
            </div>
          )}
          {step === 1 && kind === "plan" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => setSource("idea")} aria-pressed={source === "idea"} className={`rounded-2xl border-2 p-4 text-left ${source === "idea" ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E9E6E0]"}`}>
                  <Lightbulb size={20} className="text-[#2F6FDB]" />
                  <div className="mt-2 text-[15px] font-extrabold">From the ideas deck</div>
                  <div className="text-[13px] text-[#6B6760]">Pick an idea that was approved.</div>
                </button>
                <button onClick={() => { setSource("new"); setIdeaId(""); }} aria-pressed={source === "new"} className={`rounded-2xl border-2 p-4 text-left ${source === "new" ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E9E6E0]"}`}>
                  <FilePlus2 size={20} className="text-[#2F6FDB]" />
                  <div className="mt-2 text-[15px] font-extrabold">A new post</div>
                  <div className="text-[13px] text-[#6B6760]">Start from your own idea.</div>
                </button>
              </div>
              {source === "idea" ? (
                approved.length === 0 ? (
                  <p className="rounded-xl bg-[#FFF3D9] px-4 py-3 text-[13px] text-[#6B4A06]">No approved ideas for {client?.name ?? "this client"} yet. Add ideas in the Ideas deck, or start a new post.</p>
                ) : (
                  <Field label="Idea">
                    <select value={ideaId} onChange={(event) => chooseIdea(event.target.value)} className={fieldClass}>
                      <option value="">Pick an idea…</option>
                      {approved.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.format}</option>)}
                    </select>
                  </Field>
                )
              ) : (
                <Field label="Name of the post"><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. 5 things to check before you appoint a certifier" className={fieldClass} /></Field>
              )}
              {source === "idea" && ideaId && <p className="rounded-xl bg-[#F8F7F4] px-4 py-3 text-[13px]"><b>{title}</b>{state.ideas.find((item) => item.id === ideaId)?.notes ? <span className="block text-[#55514B]">{state.ideas.find((item) => item.id === ideaId)?.notes}</span> : null}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field label="Type of post">
                <select value={format} onChange={(event) => { setFormat(event.target.value as Format); setFiles([]); }} className={fieldClass}>
                  {formats.map((item) => <option key={item} value={item}>{formatLabel[item] ?? item}</option>)}
                </select>
              </Field>
              {kind === "plan" && client && slot && !slot.over && <p className="rounded-xl bg-[#E7F6EE] px-4 py-3 text-[13px] font-semibold text-[#17804A]">Counts as {slot.asset.name}: number {slot.used + 1} of {slot.qty} for {client.name} in {monthName(month).split(" ")[0]}.</p>}
              {kind === "plan" && client && slot && slot.over && (
                <div className="space-y-2 rounded-xl bg-[#FFF3D9] px-4 py-3 text-[13px] text-[#6B4A06]">
                  <p><b>{slot.asset.name}:</b> {slot.used} of {slot.qty} already made in {monthName(month).split(" ")[0]}. This one goes over what {client.name} pays for.</p>
                  <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => chooseMonth(nextMonth)}>Put it in {monthName(nextMonth).split(" ")[0]}</Button><Button size="sm" onClick={() => { setKind("extra"); setExtraPick("other"); setStep(0); }}>Make it extra work</Button></div>
                </div>
              )}
              {notInPlan && client && <p className="rounded-xl bg-[#FFF3D9] px-4 py-3 text-[13px] font-semibold text-[#6B4A06]">{client.package} does not include {(formatLabel[format] ?? format).toLowerCase()} posts. It will be saved as extra work, so it is not counted in the monthly posts.</p>}
              <div>
                <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">Where it goes</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {channelList.map((item) => {
                    const on = picked.includes(item);
                    return (
                      <button key={item} onClick={() => setPlatforms(on ? picked.filter((value) => value !== item) : [...picked, item])} aria-pressed={on} className={`flex items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition ${on ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E9E6E0] hover:border-[#C9C3B8]"}`}>
                        <ChannelIcon name={item} size={28} />
                        <span className="flex-1 text-[14px] font-bold">{item}</span>
                        <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${on ? "border-[#2F6FDB] bg-[#2F6FDB] text-white" : "border-[#D9D5CE]"}`}>{on && <Check size={12} strokeWidth={3.5} />}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {source === "new" && <p className="text-[13px] text-[#6B6760]">Name: <b>{title || "not set"}</b></p>}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">Caption <span className="font-normal text-[#8B867E]">· you can finish it later if you save a draft</span></div>
                {picked.length > 1 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <button onClick={() => setDifferent(false)} aria-pressed={!useDifferent} className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${!useDifferent ? "bg-[#1E2430] text-white" : "bg-[#F1F0ED] text-[#6B6760]"}`}>Same caption on {picked.join(" and ")}</button>
                    <button onClick={() => { setDifferent(true); setCaptions(Object.fromEntries(picked.map((channel) => [channel, captions[channel] ?? copy]))); setCaptionTab(picked[0]); }} aria-pressed={useDifferent} className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${useDifferent ? "bg-[#1E2430] text-white" : "bg-[#F1F0ED] text-[#6B6760]"}`}>Different caption for each</button>
                  </div>
                )}
                {useDifferent && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {picked.map((channel) => <button key={channel} onClick={() => setCaptionTab(channel)} aria-pressed={tab === channel} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold ${tab === channel ? "bg-[#EAF1FD] text-[#1F5BC4]" : "text-[#6B6760] hover:bg-[#F1F0ED]"}`}><ChannelIcon name={channel} size={16} />{channel}{captionFor(channel).trim() ? " ✓" : ""}</button>)}
                  </div>
                )}
                {idea?.angle || (ideaId && state.ideas.find((item) => item.id === ideaId)?.angle) ? <p className="mb-2 rounded-lg bg-[#F1F6FE] px-3 py-2 text-[12px] text-[#1F5BC4]">Started from the draft copy in the idea. Change anything you like.</p> : null}
                <textarea value={useDifferent ? captionFor(tab) : copy} onChange={(event) => (useDifferent ? setCaptions({ ...captions, [tab]: event.target.value }) : setCopy(event.target.value))} aria-label={useDifferent ? `${tab} caption` : "Caption"} rows={7} placeholder={useDifferent ? `Write the ${tab} caption` : "Write the caption"} className={`${fieldClass} leading-relaxed`} />
                <CtaPicker client={client} onPick={(cta) => (useDifferent ? setCaptions({ ...captions, [tab]: `${captionFor(tab)}${captionFor(tab).trim() ? "\n\n" : ""}${cta}` }) : setCopy(`${copy}${copy.trim() ? "\n\n" : ""}${cta}`))} />
              </div>
              <div>
                <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">{format === "Text post" ? "Image" : "Files"} · {rule.hint}</div>
                {shownFile && (
                  <div className="mb-3 rounded-2xl bg-[#F1F0ED] p-3">
                    <div className="relative mx-auto w-fit max-w-full">
                      {shownFile.kind === "image" && /* eslint-disable-next-line @next/next/no-img-element */ <img src={shownFile.src} alt={shownFile.name} className="mx-auto max-h-[42vh] max-w-full rounded-xl object-contain" />}
                      {shownFile.kind === "video" && <video src={shownFile.src} controls className="mx-auto max-h-[42vh] max-w-full rounded-xl" />}
                      {(shownFile.kind === "pdf" || shownFile.kind === "other") && <div className="grid h-40 w-64 place-items-center rounded-xl bg-white text-[14px] font-bold text-[#55514B]">{shownFile.kind === "pdf" ? "PDF" : "File"} · {shownFile.name}</div>}
                      <button onClick={() => setBig(slides.indexOf(shownFile))} aria-label="See it full size" className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold shadow"><Maximize2 size={13} />Full size</button>
                    </div>
                    {slides.length > 1 && <div className="mt-2 flex items-center justify-center gap-2 text-[12px] text-[#6B6760]"><button onClick={() => setActive((Math.min(active, slides.length - 1) - 1 + slides.length) % slides.length)} className="rounded-lg bg-white px-2.5 py-1 font-bold">Previous</button>Slide {Math.min(active, slides.length - 1) + 1} of {slides.length}<button onClick={() => setActive((Math.min(active, slides.length - 1) + 1) % slides.length)} className="rounded-lg bg-white px-2.5 py-1 font-bold">Next</button></div>}
                  </div>
                )}
                {files.some((file) => !file.pageOf) && (
                  <ul className="mb-2 space-y-1.5">
                    {files.filter((file) => !file.pageOf).map((file, index) => (
                      <li key={file.id} className="flex items-center gap-2.5 rounded-xl bg-[#F6F5F2] p-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {file.kind === "image" ? <img src={file.src} alt="" className="h-11 w-9 rounded-md object-cover" /> : <span className="grid h-11 w-9 place-items-center rounded-md bg-white text-[10px] font-bold uppercase text-[#6B6760]">{file.kind === "pdf" ? "PDF" : file.kind === "video" ? "Vid" : "File"}</span>}
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{rule.multiple ? `${index + 1}. ` : ""}{file.name}{file.kind === "pdf" && pagesIn(files, file.id) > 0 ? <span className="ml-1.5 rounded-full bg-[#E8F0FD] px-2 py-0.5 text-[11px] font-bold text-[#1F5BC4]">{pagesIn(files, file.id)} pages</span> : null}</span>
                        {rule.multiple && <button onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move earlier" className="rounded-lg p-1.5 disabled:opacity-30"><ArrowUp size={14} /></button>}
                        {rule.multiple && <button onClick={() => move(index, 1)} disabled={index === files.length - 1} aria-label="Move later" className="rounded-lg p-1.5 disabled:opacity-30"><ArrowDown size={14} /></button>}
                        <button onClick={() => setFiles(withoutFile(files, file.id))} aria-label={`Remove ${file.name}`} className="rounded-lg p-1.5 text-[#B83232]"><Trash2 size={14} /></button>
                      </li>
                    ))}
                  </ul>
                )}
                {kind === "plan" && isLinkedInCarousel({ format, platforms: picked }) && <p className="mb-2 rounded-xl bg-[#EAF3FC] px-4 py-3 text-[12px] leading-snug text-[#0A4E8F]"><b>This is a LinkedIn carousel.</b> LinkedIn only takes a carousel as one PDF, so it is posted as a PDF. Upload the slides here as images (or a PDF) and we build the PDF for you to post.</p>}
                {reading && <p className="mb-2 rounded-xl bg-[#F1F6FE] px-4 py-3 text-[13px] font-semibold text-[#1F5BC4]">Reading the file and drawing its pages…</p>}
                {(rule.multiple || files.length === 0) && (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#C9D6EE] bg-[#F7FAFF] p-4 text-[13px] font-semibold text-[#1F5BC4] hover:bg-[#EEF4FF]">
                    <UploadCloud size={18} />{rule.label}
                    <input ref={fileInput} type="file" multiple={rule.multiple} accept={rule.accept} className="sr-only" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
                  </label>
                )}
                <p className="mt-1.5 text-[12px] text-[#8B867E]">With the files attached, the words and the design are reviewed together.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <Field label="Review by" hint="They are notified when you send it.">
                <select value={reviewerId || defaultReviewer} onChange={(event) => setReviewerId(event.target.value)} className={fieldClass}>
                  {reviewers.map((person) => <option key={person.id} value={person.id}>{person.name}{person.id === defaultReviewer ? " (usual)" : ""}</option>)}
                </select>
              </Field>
              <ul className="space-y-1.5 rounded-2xl bg-[#F8F7F4] p-4 text-[13px]">
                <li><b>{title || "Untitled post"}</b></li>
                <li>{client?.name} · {kind === "extra" ? `Extra: ${extraType}` : formatLabel[format] ?? format} · {picked.join(", ") || "no channel"}</li>
                <li>Goes out {new Date(`${date}T12:00:00`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "long" })} {kind === "plan" ? ` · counts for ${monthName(month)}` : " · extra, not counted in the monthly posts"}</li>
                <li>{useDifferent ? `Different captions for ${picked.join(" and ")}` : copy.trim() ? `${copy.trim().length} characters of caption` : "No caption yet"} · {slides.length} {files.some((file) => file.pageOf) ? "slide" : "file"}{slides.length === 1 ? "" : "s"}</li>
              </ul>
              {slides.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {slides.map((file, index) => (
                    <button key={file.id} onClick={() => setBig(index)} aria-label={`See ${file.name} full size`} className="relative h-24 w-[76px] shrink-0 overflow-hidden rounded-lg border border-[#E2DED7] bg-[#F1F0ED]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {file.kind === "image" ? <img src={file.src} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-[11px] font-bold text-[#55514B]">{file.kind === "pdf" ? "PDF" : file.kind === "video" ? "Video" : "File"}</span>}
                    </button>
                  ))}
                </div>
              )}
              <p className="rounded-xl bg-[#F8F7F4] px-4 py-3 text-[12px] leading-snug text-[#55514B]"><b>Save draft</b> keeps it with you in Posts, under Needs me, and on the calendar on its day. Nobody is told. <b>Send for review</b> tells the reviewer.</p>
              {!hasCaption && <p className="rounded-xl bg-[#FFF3D9] px-4 py-3 text-[13px] text-[#6B4A06]">Add {useDifferent ? "a caption for each channel" : "a caption"} to send it for review, or save it as a draft.</p>}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[#F0EEE9] bg-[#FBFAF8] px-6 py-4">
          {step > 0 ? <Button kind="ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={15} />Back</Button> : <Button kind="ghost" onClick={closePostWizard}>Cancel</Button>}
          <span className="ml-auto text-[12px] text-[#8B867E]">Step {step + 1} of {steps.length}</span>
          {step < steps.length - 1 ? (
            <Button kind="primary" onClick={() => setStep(step + 1)} disabled={!valid[step]}>Continue <ArrowRight size={15} /></Button>
          ) : (
            <>
              <Button onClick={() => finish(false)}>Save draft</Button>
              <Button kind="good" onClick={() => finish(true)} disabled={!hasCaption}><Send size={14} />Send for review</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

