"use client";

import { useRef, useState } from "react";
import { ArrowRight, FilePlus2, Image as ImageIcon, Loader2, Plus, Send, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { ago, isDraft, isFreelancer, isMarketing, myClients, personById, reviewerFor, shortDate, todayIso } from "@/lib/works/logic";
import { pdfSlice, readPostFiles } from "@/lib/works/pdf";
import type { Client, FreelancerUpdate, Post, PostFile } from "@/lib/works/types";
import { PostArt } from "./PostArt";
import { ChannelIcon } from "./ChannelIcon";
import { statusTone } from "./Marketing";
import { Avatar, Button, Chip, ClientMark, Empty, Field, Segmented, fieldClass } from "./kit";

const formats = ["Text post", "Single image", "Carousel", "Reel", "Newsletter"];
const channelChoices = ["LinkedIn", "Instagram", "Facebook", "TikTok", "X", "YouTube"];

type Item = { key: string; title: string; format: string; platforms: string[]; date: string; copy: string; send: boolean; files: PostFile[]; group?: string };
type Group = { id: string; name: string; file: File; pages: PostFile[]; whole: PostFile[]; per: string };
const key = () => `i-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const bare = (name: string) => name.replace(/\.[a-z0-9]+$/i, "");

export function UpdateWizard() {
  const { updateWizard } = useStore();
  if (!updateWizard.open) return null;
  return <Composer key={updateWizard.clientId ?? "new"} />;
}

/** A freelancer sends one message with the posts that came with it: text posts as pictures, a PDF with several carousels, a post written by hand. */
function Composer() {
  const { state, updateWizard, closeUpdate, createUpdate, go } = useStore();
  const clients = myClients(state).filter(isMarketing);
  const [clientId, setClientId] = useState(updateWizard.clientId && clients.some((item) => item.id === updateWizard.clientId) ? updateWizard.clientId : clients.length === 1 ? clients[0].id : "");
  const client = clients.find((item) => item.id === clientId);
  const [date, setDate] = useState(todayIso());
  const [message, setMessage] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [send, setSend] = useState(true);
  const [pictureAs, setPictureAs] = useState("Text post");
  const [items, setItems] = useState<Item[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const pictures = useRef<HTMLInputElement>(null);
  const pdfs = useRef<HTMLInputElement>(null);

  const reviewers = state.people.filter((person) => person.role !== "freelancer");
  const usual = client ? personById(state, reviewerFor(state, client))?.name : "";
  const firstChannel = [client?.platforms[0] ?? "LinkedIn"];
  const patch = (target: string, change: Partial<Item>) => setItems((list) => list.map((item) => (item.key === target ? { ...item, ...change } : item)));
  const base = (): Omit<Item, "key" | "title" | "format" | "files"> => ({ platforms: firstChannel, date, copy: "", send });

  const addPictures = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy("Reading the pictures…");
    try {
      const read = await readPostFiles([...list].filter((file) => file.type.startsWith("image/")));
      setItems((current) => {
        // A file name like {3918627F-BF44-…} or IMG_2041 is no title. Those posts are numbered instead.
        const messy = (name: string) => /^[{(]?[0-9a-f-]{16,}[})]?$/i.test(name) || /^(img|image|screenshot|screen shot|whatsapp|photo|dsc|pxl)[\s_-]*[\d\s._-]*/i.test(name) && /\d{3,}/.test(name);
        let count = current.filter((item) => item.format === pictureAs).length;
        return [...current, ...read.files.filter((file) => file.kind === "image").map((file) => ({ ...base(), key: key(), title: messy(bare(file.name)) ? `${pictureAs} ${++count}` : bare(file.name), format: pictureAs, files: [file] }))];
      });
      setNotes(read.notes);
    } finally { setBusy(""); }
  };

  const addPdf = async (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    setBusy("Reading the PDF…");
    try {
      const read = await readPostFiles([file]);
      const whole = read.files;
      const pdf = whole.find((entry) => entry.kind === "pdf");
      if (!pdf) { setNotes(["That file is not a PDF."]); return; }
      const pages = whole.filter((entry) => entry.pageOf === pdf.id);
      const group: Group = { id: pdf.id, name: file.name, file, pages, whole, per: "" };
      setGroups((current) => [...current, group]);
      setItems((current) => [...current, { ...base(), key: key(), title: bare(file.name), format: "Carousel", files: whole, group: group.id }]);
      setNotes(read.notes);
    } finally { setBusy(""); }
  };

  /** Cuts a PDF into carousels of so many pages each, or puts it back as one. */
  const split = async (group: Group) => {
    const per = Math.floor(Number(group.per));
    const total = group.pages.length;
    setBusy("Cutting the PDF into carousels…");
    try {
      let made: Item[];
      if (!per || per >= total) made = [{ ...base(), key: key(), title: bare(group.name), format: "Carousel", files: group.whole, group: group.id }];
      else {
        made = [];
        for (let from = 1, n = 1; from <= total; from += per, n++) {
          const to = Math.min(total, from + per - 1);
          made.push({ ...base(), key: key(), title: `${bare(group.name)} · carousel ${n}`, format: "Carousel", files: await pdfSlice(group.file, group.pages, from, to, `${bare(group.name)} · carousel ${n}.pdf`), group: group.id });
        }
      }
      setItems((current) => {
        const at = current.findIndex((item) => item.group === group.id);
        const rest = current.filter((item) => item.group !== group.id);
        return [...rest.slice(0, Math.max(0, at)), ...made, ...rest.slice(Math.max(0, at))];
      });
    } catch {
      setNotes(["The PDF could not be cut. Add each carousel as its own PDF instead."]);
    } finally { setBusy(""); }
  };

  const ready = Boolean(client) && (items.length > 0 || message.trim().length > 0) && items.every((item) => item.title.trim());
  const submit = () => {
    if (!client || !ready) return;
    createUpdate({ clientId: client.id, date, message: message.trim(), reviewerId: reviewerId || undefined, items: items.map(({ title, format, platforms, date: itemDate, copy, files, send: itemSend }) => ({ title: title.trim(), format, platforms, date: itemDate || date, copy, files, send: itemSend })) });
    closeUpdate();
    go({ view: "marketing", clientId: client.id, tab: "updates" });
  };
  const toReview = items.filter((item) => item.send).length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6">
      <button aria-label="Close" onClick={closeUpdate} className="absolute inset-0 bg-black/40" />
      <div role="dialog" aria-label="Send an update" className="relative flex max-h-[94vh] w-full max-w-[820px] flex-col rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-[#F0EEE9] px-6 py-4">
          <div className="min-w-0 flex-1"><h2 className="text-[20px] font-extrabold">Send an update</h2><p className="text-[13px] text-[#6B6760]">One message with everything you made. Add the pictures and PDFs, then say what should happen to each post.</p></div>
          <button onClick={closeUpdate} aria-label="Close" className="rounded-lg p-1.5 text-[#6B6760] hover:bg-[#F1F0ED]"><X size={18} /></button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Client"><select value={clientId} onChange={(event) => setClientId(event.target.value)} className={fieldClass}><option value="">Choose…</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Date of the update"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={fieldClass} /></Field>
            <Field label="Send to"><select value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} className={fieldClass}><option value="">{usual ? `${usual} (usual reviewer)` : "Usual reviewer"}</option>{reviewers.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
          </div>
          <Field label="Your message"><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder="Here is my update for today. I prepared this week's content for your review." className={fieldClass} /></Field>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h3 className="text-[15px] font-bold">What is in this update</h3>
              <span className="text-[12px] text-[#8B867E]">{items.length} post{items.length === 1 ? "" : "s"}{items.length ? ` · ${toReview} to review, ${items.length - toReview} draft${items.length - toReview === 1 ? "" : "s"}` : ""}</span>
              {items.length > 1 && (
                <span className="ml-auto flex items-center gap-2 text-[12px] font-semibold text-[#55514B]">Set all to
                  <Segmented size="sm" value={items.every((item) => item.send) ? "review" : items.every((item) => !item.send) ? "draft" : ""} onChange={(value) => { setSend(value === "review"); setItems((list) => list.map((item) => ({ ...item, send: value === "review" }))); }} options={[{ value: "review", label: "For review" }, { value: "draft", label: "Draft" }]} />
                </span>
              )}
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-2xl border-2 border-dashed border-[#D6D1C8] p-3">
                <div className="flex items-center gap-2 text-[13px] font-bold"><ImageIcon size={15} />Pictures</div>
                <p className="mt-0.5 text-[12px] text-[#6B6760]">One post for each picture.</p>
                <div className="mt-2 flex items-center gap-2">
                  <select value={pictureAs} onChange={(event) => setPictureAs(event.target.value)} aria-label="The pictures are" className="min-w-0 flex-1 rounded-lg border border-[#E2DED7] bg-white px-2 py-1.5 text-[12px] font-semibold"><option>Text post</option><option>Single image</option></select>
                  <Button size="sm" onClick={() => pictures.current?.click()} disabled={Boolean(busy)}><Plus size={13} />Add</Button>
                </div>
                <input ref={pictures} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { void addPictures(event.target.files); event.target.value = ""; }} />
              </div>
              <div className="rounded-2xl border-2 border-dashed border-[#D6D1C8] p-3">
                <div className="flex items-center gap-2 text-[13px] font-bold"><FilePlus2 size={15} />A PDF</div>
                <p className="mt-0.5 text-[12px] text-[#6B6760]">Carousels. Several in one PDF can be cut apart.</p>
                <div className="mt-2"><Button size="sm" onClick={() => pdfs.current?.click()} disabled={Boolean(busy)}><Plus size={13} />Add a PDF</Button></div>
                <input ref={pdfs} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => { void addPdf(event.target.files); event.target.value = ""; }} />
              </div>
              <div className="rounded-2xl border-2 border-dashed border-[#D6D1C8] p-3">
                <div className="flex items-center gap-2 text-[13px] font-bold"><Plus size={15} />Written here</div>
                <p className="mt-0.5 text-[12px] text-[#6B6760]">A post with only text.</p>
                <div className="mt-2"><Button size="sm" onClick={() => setItems((list) => [...list, { ...base(), key: key(), title: "", format: "Text post", files: [] }])}><Plus size={13} />Add a post</Button></div>
              </div>
            </div>
            {busy && <p className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-[#1F5BC4]"><Loader2 size={14} className="animate-spin" />{busy}</p>}
            {notes.map((note) => <p key={note} className="mt-2 rounded-xl bg-[#FFF3D9] px-3.5 py-2 text-[13px] text-[#6B4A06]">{note}</p>)}

            {groups.filter((group) => items.some((item) => item.group === group.id)).map((group) => (
              <div key={group.id} className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#F4F8FF] px-3.5 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1"><b>{group.name}</b> has {group.pages.length} page{group.pages.length === 1 ? "" : "s"}. Is it more than one carousel?</span>
                <label className="flex items-center gap-1.5 font-semibold">Pages in each
                  <input value={group.per} inputMode="numeric" onChange={(event) => setGroups((list) => list.map((entry) => (entry.id === group.id ? { ...entry, per: event.target.value.replace(/\D/g, "") } : entry)))} placeholder="all" aria-label={`Pages in each carousel of ${group.name}`} className="w-14 rounded-lg border border-[#C9D8F2] bg-white px-2 py-1 text-center" />
                </label>
                <Button size="sm" onClick={() => void split(group)} disabled={Boolean(busy)}>Cut it</Button>
              </div>
            ))}

            <ul className="mt-3 space-y-2.5">
              {items.map((item) => {
                const thumb = item.files.find((file) => file.kind === "image");
                const pages = item.files.filter((file) => file.pageOf).length;
                return (
                  <li key={item.key} className="flex flex-wrap gap-3 rounded-2xl border border-[#E9E6E0] p-3">
                    <div className="grid h-[88px] w-[88px] shrink-0 place-items-center overflow-hidden rounded-xl bg-[#F1F0ED] text-[11px] font-semibold text-[#8B867E]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {thumb ? <img src={thumb.src} alt="" className="h-full w-full object-cover" /> : "Text only"}
                    </div>
                    <div className="min-w-[220px] flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input value={item.title} onChange={(event) => patch(item.key, { title: event.target.value })} placeholder="Title of the post" aria-label="Title of the post" className="min-w-0 flex-1 rounded-xl border border-[#E2DED7] px-3 py-2 text-[14px] font-semibold outline-none focus:border-[#2F6FDB]" />
                        <button onClick={() => setItems((list) => list.filter((entry) => entry.key !== item.key))} aria-label={`Remove ${item.title || "this post"}`} className="rounded-lg p-2 text-[#B5B0A8] hover:bg-[#FDECEC] hover:text-[#B83232]"><Trash2 size={15} /></button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select value={item.format} onChange={(event) => patch(item.key, { format: event.target.value })} aria-label="Type of post" className="rounded-lg border border-[#E2DED7] bg-white px-2 py-1.5 text-[12px] font-semibold">{formats.map((name) => <option key={name}>{name}</option>)}</select>
                        <span className="flex gap-1">{(client ? [...new Set([...client.platforms, ...channelChoices.slice(0, 3)])] : channelChoices.slice(0, 3)).map((name) => { const on = item.platforms.includes(name); return <button key={name} type="button" onClick={() => patch(item.key, { platforms: on ? item.platforms.filter((value) => value !== name) : [...item.platforms, name] })} aria-pressed={on} aria-label={name} title={name} className={`rounded-lg p-1 ring-2 ${on ? "ring-[#2F6FDB]" : "opacity-40 ring-transparent"}`}><ChannelIcon name={name} size={20} /></button>; })}</span>
                        <input type="date" value={item.date} onChange={(event) => patch(item.key, { date: event.target.value })} aria-label="Date of the post" title="The day it should go out" className="rounded-lg border border-[#E2DED7] px-2 py-1 text-[12px]" />
                        <Segmented size="sm" value={item.send ? "review" : "draft"} onChange={(value) => patch(item.key, { send: value === "review" })} options={[{ value: "review", label: "For review" }, { value: "draft", label: "Draft" }]} />
                      </div>
                      {pages > 0 && <div className="text-[12px] text-[#8B867E]">{pages} page{pages === 1 ? "" : "s"}, kept as a PDF for LinkedIn</div>}
                      <textarea value={item.copy} onChange={(event) => patch(item.key, { copy: event.target.value })} rows={item.files.length ? 2 : 4} placeholder={item.files.length ? "Caption (optional)" : "Write the post here"} aria-label="Caption" className="w-full rounded-xl border border-[#E2DED7] px-3 py-2 text-[13px] outline-none focus:border-[#2F6FDB]" />
                    </div>
                  </li>
                );
              })}
            </ul>
            {items.length === 0 && <p className="mt-3 rounded-xl border border-dashed border-[#D6D1C8] p-4 text-[13px] text-[#8B867E]">Nothing added yet. You can also send just the message.</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[#F0EEE9] px-6 py-4">
          <p className="min-w-[200px] flex-1 text-[12px] text-[#6B6760]">{toReview > 0 ? "Posts marked For review are sent to the reviewer now. Drafts stay with you, in Posts, and nobody is told." : "Everything is a draft, so nobody is told. It stays with you in Posts."}</p>
          <Button onClick={closeUpdate}>Cancel</Button>
          <Button kind="primary" onClick={submit} disabled={!ready || Boolean(busy)}><Send size={14} />Send update</Button>
        </div>
      </div>
    </div>
  );
}

function stateOf(post: Post) {
  if (isDraft(post)) return { label: "Draft", t: "grey" as const };
  const status = statusTone(post);
  return { label: status.label, t: status.t };
}

/** The updates, newest first. Each shows its message and the posts that came with it. */
export function UpdatesList({ client }: { client?: Client }) {
  const { state, go, openUpdate } = useStore();
  const mine = myClients(state).filter(isMarketing);
  const list = state.updates.filter((item) => (client ? item.clientId === client.id : mine.some((entry) => entry.id === item.clientId)));
  const freelancer = isFreelancer(state);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-[220px] flex-1 text-[13px] text-[#6B6760]">{freelancer ? "Your updates to the team. Send one with everything you made, and say which posts are drafts and which are for review." : "What the freelancers have sent, newest first."}</p>
        {freelancer && <Button kind="primary" onClick={() => openUpdate(client?.id)}><Send size={14} />Send an update</Button>}
      </div>
      {list.length === 0 ? <Empty title="No updates yet">{freelancer ? "Send one to tell the team what you made today." : "When a freelancer sends one, it shows here."}</Empty> : list.map((item) => <UpdateCard key={item.id} update={item} onOpen={(post) => go({ view: "marketing", clientId: client?.id ?? "all", postId: post.id })} />)}
    </div>
  );
}

function UpdateCard({ update, onOpen }: { update: FreelancerUpdate; onOpen: (post: Post) => void }) {
  const { state } = useStore();
  const by = personById(state, update.by);
  const client = state.clients.find((item) => item.id === update.clientId);
  const posts = update.postIds.map((id) => state.posts.find((post) => post.id === id)).filter((post): post is Post => Boolean(post));
  if (!client) return null;
  return (
    <article className="rounded-2xl border border-[#E9E6E0] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        {by && <Avatar name={by.name} color={by.color} photo={by.photo} size={34} />}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold">{by?.name ?? "Someone"} <span className="font-normal text-[#6B6760]">sent an update</span></div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#8B867E]"><ClientMark client={client} size={16} />{client.name} · {shortDate(update.date)} · {ago(update.at.slice(0, 10))}</div>
        </div>
        <Chip t="grey">{posts.length} post{posts.length === 1 ? "" : "s"}</Chip>
      </div>
      {update.message && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#F8F7F4] px-3.5 py-2.5 text-[14px] leading-relaxed">{update.message}</p>}
      {posts.length > 0 && (
        <div className="-mx-1 mt-3 flex gap-2.5 overflow-x-auto px-1 pb-1">
          {posts.map((post) => {
            const status = stateOf(post);
            return (
              <button key={post.id} onClick={() => onOpen(post)} className="w-[136px] shrink-0 overflow-hidden rounded-xl border border-[#E9E6E0] bg-white text-left transition hover:shadow-md">
                <PostArt post={post} client={client} rounded="rounded-none" />
                <div className="space-y-1 p-2">
                  <div className="line-clamp-2 text-[12px] font-bold leading-snug">{post.title}</div>
                  <div className="flex flex-wrap items-center gap-1"><Chip t={status.t} className="!px-2 !py-0.5 !text-[10px]">{status.label}</Chip><span className="text-[10px] font-semibold text-[#8B867E]">{post.format}</span></div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}

/** The latest updates on the dashboard: a short list with a link to all of them. */
export function UpdatesBlock() {
  const { state, go, openUpdate } = useStore();
  const freelancer = isFreelancer(state);
  const mine = myClients(state).filter(isMarketing);
  const list = state.updates.filter((item) => mine.some((entry) => entry.id === item.clientId) && (!freelancer || item.by === state.me)).slice(0, 3);
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div><h2 className="text-[18px] font-extrabold">{freelancer ? "My updates" : "Updates from the freelancers"}</h2><p className="text-[13px] text-[#6B6760]">{freelancer ? "What you sent to the team, with where each post is now." : "A message with the posts that came with it."}</p></div>
        <div className="flex items-center gap-3">
          {freelancer && <Button size="sm" kind="primary" onClick={() => openUpdate()}><Send size={13} />Send an update</Button>}
          {list.length > 0 && <button onClick={() => go({ view: "marketing", clientId: "all", tab: "updates" })} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1F5BC4]">See all <ArrowRight size={14} /></button>}
        </div>
      </div>
      {list.length === 0 ? (
        <div className="rounded-2xl border border-[#E9E6E0] bg-white px-5 py-4 text-[14px] text-[#6B6760]">{freelancer ? "No updates yet. Send one when you have posts to show." : "No updates yet."}</div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white">
          {list.map((item) => {
            const by = personById(state, item.by);
            const client = state.clients.find((entry) => entry.id === item.clientId);
            const posts = item.postIds.map((id) => state.posts.find((post) => post.id === id)).filter((post): post is Post => Boolean(post));
            const drafts = posts.filter(isDraft).length;
            return (
              <li key={item.id} className="border-b border-[#F5F3EF] last:border-0">
                <button onClick={() => go({ view: "marketing", clientId: item.clientId, tab: "updates" })} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-[#FBFAF8]">
                  {by && <Avatar name={by.name} color={by.color} photo={by.photo} size={30} />}
                  <span className="min-w-[180px] flex-1"><span className="block text-[13px] font-bold">{by?.name} · {client?.name} · {shortDate(item.date)}</span><span className="line-clamp-1 text-[12px] text-[#6B6760]">{item.message || "No message"}</span></span>
                  <Chip t="grey">{posts.length} post{posts.length === 1 ? "" : "s"}</Chip>
                  {drafts > 0 && <Chip t="amber">{drafts} draft{drafts === 1 ? "" : "s"}</Chip>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
