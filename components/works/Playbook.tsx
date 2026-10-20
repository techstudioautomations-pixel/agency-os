"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, BarChart3, BookOpen, Brain, CalendarDays, Check, ChevronDown, ClipboardCheck, Coins, ExternalLink, FileText, Handshake, KeyRound, Megaphone, Paperclip, Pencil, Plus, Rocket, Settings as SettingsIcon, ShieldCheck, Sparkles, Target, Trash2, UserCheck, Users, type LucideIcon } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { isFreelancer, isOwner, todayIso } from "@/lib/works/logic";
import type { PlaybookItem, PlaybookItemKind, PlaybookSlot, PlaybookStage } from "@/lib/works/types";
import { AttachField, Button, Chip, Field, fieldClass } from "./kit";

const icons: Record<string, LucideIcon> = { handshake: Handshake, file: FileText, clipboard: ClipboardCheck, key: KeyRound, brain: Brain, rocket: Rocket, calendar: CalendarDays, chart: BarChart3, target: Target, megaphone: Megaphone, users: Users, shield: ShieldCheck, user: UserCheck, coins: Coins, settings: SettingsIcon };
const iconFor = (name: string) => icons[name] ?? ClipboardCheck;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

const kinds: { kind: PlaybookItemKind; label: string; one: string; icon: LucideIcon; hint: string; placeholder: string }[] = [
  { kind: "resource", label: "Resources", one: "resource", icon: Paperclip, hint: "Made once and reused", placeholder: "A note about it (optional)" },
  { kind: "prompt", label: "Prompts", one: "prompt", icon: Sparkles, hint: "A reusable generator", placeholder: "Paste the prompt. Put [square brackets] around the parts to fill in." },
  { kind: "sop", label: "SOPs", one: "SOP", icon: BookOpen, hint: "How we do it", placeholder: "The steps, one per line" },
];

const count = (slot: PlaybookSlot, kind: PlaybookItemKind) => slot.attachments.filter((item) => item.kind === kind).length;
const isInternal = (url: string) => url.startsWith("#/");

/** The client journey, or the business areas: stages across the top, what each needs below, and what is attached to each. */
export function PlaybookView({ group }: { group: "workflow" | "areas" }) {
  const { state, editPlaybook } = useStore();
  const freelancer = isFreelancer(state);
  const owner = isOwner(state);
  const all = state.playbook[group];
  const stages = freelancer ? all.filter((stage) => stage.forFreelancer) : all;
  const [selected, setSelected] = useState(stages[0]?.id ?? "");
  const [editing, setEditing] = useState(false);
  const stage = stages.find((item) => item.id === selected) ?? stages[0];
  const numbered = group === "workflow";

  const change = (fn: (stages: PlaybookStage[]) => void) => editPlaybook((playbook) => fn(playbook[group]));
  const addStage = () => {
    const id = uid("stage");
    change((list) => { list.push({ id, title: "New stage", owner: "", color: "#55514B", icon: "clipboard", slots: [] }); });
    setSelected(id);
  };

  if (!stage) return <p className="rounded-2xl border border-dashed border-[#D6D1C8] p-6 text-[14px] text-[#6B6760]">Nothing here yet.</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-1 flex-wrap gap-x-5 gap-y-1 text-[12px] text-[#6B6760]">
          {kinds.map((item) => <span key={item.kind} className="inline-flex items-center gap-1"><item.icon size={13} /><b>{item.one}</b>: {item.hint.toLowerCase()}</span>)}
        </div>
        {owner && <Button kind={editing ? "primary" : "secondary"} onClick={() => setEditing(!editing)}>{editing ? <><Check size={14} />Done editing</> : <><Pencil size={14} />Edit structure</>}</Button>}
      </div>

      <ol className={`grid gap-3 ${numbered ? "" : "sm:grid-cols-2"}`} style={numbered ? { gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" } : undefined}>
        {stages.map((item, index) => {
          const Icon = iconFor(item.icon);
          const active = item.id === stage.id;
          return (
            <li key={item.id}>
              <button onClick={() => setSelected(item.id)} aria-pressed={active} className="h-full w-full rounded-2xl border-2 p-3.5 text-left transition hover:shadow-md" style={{ borderColor: active ? item.color : `${item.color}33`, background: active ? `${item.color}14` : "#fff" }}>
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: item.color }}><Icon size={17} /></span>
                  {numbered && <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: item.color }}>Step {index + 1}</span>}
                </div>
                <div className="mt-2.5 text-[14px] font-bold leading-snug">{item.title}</div>
                {item.owner && <div className="mt-0.5 text-[12px] font-semibold text-[#55514B]">{item.owner}</div>}
                <div className="mt-2 text-[12px] text-[#6B6760]">{item.slots.length} item{item.slots.length === 1 ? "" : "s"} · {item.slots.reduce((sum, slot) => sum + slot.attachments.length, 0)} attached</div>
              </button>
            </li>
          );
        })}
        {editing && owner && <li><button onClick={addStage} className="grid h-full min-h-[120px] w-full place-items-center rounded-2xl border-2 border-dashed border-[#C9C3B8] text-[13px] font-semibold text-[#55514B] hover:border-[#2F6FDB] hover:text-[#1F5BC4]"><span className="inline-flex items-center gap-1.5"><Plus size={15} />Add a {numbered ? "stage" : "area"}</span></button></li>}
      </ol>

      <StagePanel key={stage.id} stage={stage} index={stages.findIndex((item) => item.id === stage.id)} total={stages.length} editing={editing && owner} numbered={numbered} canAttach={!freelancer} change={change} onRemoved={() => setSelected(stages.find((item) => item.id !== stage.id)?.id ?? "")} />
    </div>
  );
}

function StagePanel({ stage, index, total, editing, numbered, canAttach, change, onRemoved }: { stage: PlaybookStage; index: number; total: number; editing: boolean; numbered: boolean; canAttach: boolean; change: (fn: (stages: PlaybookStage[]) => void) => void; onRemoved: () => void }) {
  const [open, setOpen] = useState("");
  const [newSlot, setNewSlot] = useState("");
  const Icon = iconFor(stage.icon);
  const patch = (fn: (target: PlaybookStage) => void) => change((list) => { const target = list.find((item) => item.id === stage.id); if (target) fn(target); });
  const moveStage = (delta: number) => change((list) => { const from = list.findIndex((item) => item.id === stage.id); const to = from + delta; if (to < 0 || to >= list.length) return; [list[from], list[to]] = [list[to], list[from]]; });
  const moveSlot = (slotId: string, delta: number) => patch((target) => { const from = target.slots.findIndex((slot) => slot.id === slotId); const to = from + delta; if (to < 0 || to >= target.slots.length) return; [target.slots[from], target.slots[to]] = [target.slots[to], target.slots[from]]; });

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white">
      <header className="flex flex-wrap items-center gap-3 px-5 py-4" style={{ background: `${stage.color}12` }}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: stage.color }}><Icon size={21} /></span>
        <div className="min-w-[200px] flex-1">
          {editing ? (
            <div className="flex flex-wrap gap-2">
              <input value={stage.title} onChange={(event) => patch((target) => { target.title = event.target.value; })} aria-label="Name" className="min-w-0 flex-1 rounded-lg border border-[#E2DED7] bg-white px-2.5 py-1.5 text-[16px] font-extrabold" />
              {numbered && <input value={stage.owner} onChange={(event) => patch((target) => { target.owner = event.target.value; })} aria-label="Owner" placeholder="Owner" className="w-44 rounded-lg border border-[#E2DED7] bg-white px-2.5 py-1.5 text-[14px]" />}
              <input type="color" value={stage.color} onChange={(event) => patch((target) => { target.color = event.target.value; })} aria-label="Colour" className="h-9 w-9 cursor-pointer rounded-lg border border-[#E2DED7] bg-white p-0.5" />
            </div>
          ) : (
            <>
              <h3 className="text-[19px] font-extrabold">{numbered ? `${index + 1}. ` : ""}{stage.title}</h3>
              {stage.owner && <p className="text-[13px] text-[#55514B]">Owner: <b>{stage.owner}</b></p>}
            </>
          )}
        </div>
        {editing && (
          <div className="flex items-center gap-1">
            <button onClick={() => moveStage(-1)} disabled={index === 0} aria-label="Move earlier" className="rounded-lg p-2 text-[#55514B] hover:bg-white disabled:opacity-30"><ArrowUp size={15} className="-rotate-90" /></button>
            <button onClick={() => moveStage(1)} disabled={index === total - 1} aria-label="Move later" className="rounded-lg p-2 text-[#55514B] hover:bg-white disabled:opacity-30"><ArrowDown size={15} className="-rotate-90" /></button>
            <Button kind="danger" size="sm" onClick={() => { if (window.confirm(`Remove "${stage.title}" and everything attached to it?`)) { change((list) => { const at = list.findIndex((item) => item.id === stage.id); if (at >= 0) list.splice(at, 1); }); onRemoved(); } }}><Trash2 size={13} />Remove</Button>
          </div>
        )}
      </header>

      <ul className="divide-y divide-[#F3F1ED]">
        {stage.slots.map((slot, slotIndex) => (
          <li key={slot.id}>
            {editing ? (
              <div className="flex items-center gap-2 px-4 py-2">
                <input value={slot.title} onChange={(event) => patch((target) => { const entry = target.slots.find((item) => item.id === slot.id); if (entry) entry.title = event.target.value; })} aria-label="Item" className="min-w-0 flex-1 rounded-lg border border-[#E2DED7] bg-white px-2.5 py-1.5 text-[14px]" />
                <span className="hidden text-[12px] text-[#8B867E] sm:inline">{slot.attachments.length} attached</span>
                <button onClick={() => moveSlot(slot.id, -1)} disabled={slotIndex === 0} aria-label="Move up" className="rounded-lg p-1.5 text-[#55514B] hover:bg-[#F6F5F2] disabled:opacity-30"><ArrowUp size={15} /></button>
                <button onClick={() => moveSlot(slot.id, 1)} disabled={slotIndex === stage.slots.length - 1} aria-label="Move down" className="rounded-lg p-1.5 text-[#55514B] hover:bg-[#F6F5F2] disabled:opacity-30"><ArrowDown size={15} /></button>
                <button onClick={() => { if (slot.attachments.length === 0 || window.confirm(`Remove "${slot.title}" and the ${slot.attachments.length} thing${slot.attachments.length === 1 ? "" : "s"} attached to it?`)) patch((target) => { target.slots = target.slots.filter((item) => item.id !== slot.id); }); }} aria-label={`Remove ${slot.title}`} className="rounded-lg p-1.5 text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={15} /></button>
              </div>
            ) : (
              <SlotRow slot={slot} color={stage.color} open={open === slot.id} onToggle={() => setOpen(open === slot.id ? "" : slot.id)} canAttach={canAttach} change={(fn) => patch((target) => { const entry = target.slots.find((item) => item.id === slot.id); if (entry) fn(entry); })} />
            )}
          </li>
        ))}
        {stage.slots.length === 0 && <li className="px-5 py-6 text-[13px] text-[#8B867E]">Nothing here yet.{editing ? " Add the first item below." : ""}</li>}
      </ul>

      {editing && (
        <form onSubmit={(event) => { event.preventDefault(); if (!newSlot.trim()) return; patch((target) => { target.slots.push({ id: uid("slot"), title: newSlot.trim(), key: false, attachments: [] }); }); setNewSlot(""); }} className="flex gap-2 border-t border-[#F0EEE9] bg-[#FBFAF8] px-4 py-3">
          <input value={newSlot} onChange={(event) => setNewSlot(event.target.value)} placeholder="Add an item, for example “Welcome pack”" aria-label="New item" className="min-w-0 flex-1 rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[14px]" />
          <Button kind="primary" type="submit" disabled={!newSlot.trim()}><Plus size={14} />Add</Button>
        </form>
      )}
    </section>
  );
}

function SlotRow({ slot, color, open, onToggle, canAttach, change }: { slot: PlaybookSlot; color: string; open: boolean; onToggle: () => void; canAttach: boolean; change: (fn: (slot: PlaybookSlot) => void) => void }) {
  const total = slot.attachments.length;
  return (
    <div>
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#FBFAF8]">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: total > 0 ? color : `${color}55` }} />
        <span className="min-w-0 flex-1 text-[14px] font-semibold">{slot.title}</span>
        <span className="flex items-center gap-2.5 text-[12px] font-semibold text-[#6B6760]">
          {kinds.map((item) => count(slot, item.kind) > 0 && <span key={item.kind} className="inline-flex items-center gap-1" title={`${count(slot, item.kind)} ${item.label.toLowerCase()}`}><item.icon size={13} />{count(slot, item.kind)}</span>)}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-[#8B867E] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-[#F3F1ED] bg-[#FBFAF8] px-4 py-4 sm:px-6">
          {kinds.map((item) => (
            <KindSection key={item.kind} kindDef={item} items={slot.attachments.filter((entry) => entry.kind === item.kind)} canAttach={canAttach}
              onSave={(entry) => change((target) => { const at = target.attachments.findIndex((existing) => existing.id === entry.id); if (at >= 0) target.attachments[at] = entry; else target.attachments.push(entry); })}
              onRemove={(id) => change((target) => { target.attachments = target.attachments.filter((entry) => entry.id !== id); })} />
          ))}
        </div>
      )}
    </div>
  );
}

function KindSection({ kindDef, items, canAttach, onSave, onRemove }: { kindDef: (typeof kinds)[number]; items: PlaybookItem[]; canAttach: boolean; onSave: (item: PlaybookItem) => void; onRemove: (id: string) => void }) {
  const { state } = useStore();
  const [form, setForm] = useState<PlaybookItem | "new" | null>(null);
  const Icon = kindDef.icon;
  return (
    <section>
      <div className="mb-1.5 flex items-center gap-2">
        <Icon size={14} className="text-[#55514B]" />
        <h4 className="text-[13px] font-bold">{kindDef.label}</h4>
        <span className="text-[12px] text-[#8B867E]">{kindDef.hint}</span>
        {canAttach && form === null && <button onClick={() => setForm("new")} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#1F5BC4] hover:bg-[#EEF2FA]"><Plus size={12} />Add {kindDef.one}</button>}
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => form !== "new" && form?.id === item.id ? (
          <li key={item.id}><ItemForm kindDef={kindDef} initial={item} onCancel={() => setForm(null)} onSave={(entry) => { onSave(entry); setForm(null); }} /></li>
        ) : <li key={item.id}><ItemCard item={item} canAttach={canAttach} onEdit={() => setForm(item)} onRemove={() => onRemove(item.id)} /></li>)}
        {items.length === 0 && form === null && <li className="rounded-lg border border-dashed border-[#E2DED7] px-3 py-2 text-[12px] text-[#A8A39B]">Nothing yet.</li>}
      </ul>
      {form === "new" && <div className="mt-1.5"><ItemForm kindDef={kindDef} onCancel={() => setForm(null)} onSave={(entry) => { onSave({ ...entry, addedBy: state.me }); setForm(null); }} /></div>}
    </section>
  );
}

function ItemCard({ item, canAttach, onEdit, onRemove }: { item: PlaybookItem; canAttach: boolean; onEdit: () => void; onRemove: () => void }) {
  const { ping } = useStore();
  const [full, setFull] = useState(false);
  const link = item.url ?? item.file?.url;
  const copy = async () => { try { await navigator.clipboard.writeText(item.text ?? ""); ping("Copied"); } catch { ping("Copy was blocked by the browser"); } };
  return (
    <div className="rounded-xl border border-[#E9E6E0] bg-white px-3.5 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-[14px] font-semibold">{item.title}</span>
        {item.text && <Button size="sm" onClick={copy}>Copy</Button>}
        {link && (isInternal(link) ? <a href={link} className="inline-flex items-center gap-1 rounded-lg border border-[#E2DED7] px-2.5 py-1 text-[12px] font-semibold text-[#1F5BC4] hover:border-[#C9C3B8]">Open</a> : <a href={link} target="_blank" rel="noreferrer" download={link.startsWith("data:") ? item.file?.name : undefined} className="inline-flex items-center gap-1 rounded-lg border border-[#E2DED7] px-2.5 py-1 text-[12px] font-semibold text-[#1F5BC4] hover:border-[#C9C3B8]">{item.file ? item.file.name.slice(0, 22) : "Open"} <ExternalLink size={11} /></a>)}
        {canAttach && <button onClick={onEdit} aria-label={`Edit ${item.title}`} className="rounded-lg p-1.5 text-[#8B867E] hover:bg-[#F1F0ED]"><Pencil size={13} /></button>}
        {canAttach && <button onClick={() => { if (window.confirm(`Remove "${item.title}"?`)) onRemove(); }} aria-label={`Remove ${item.title}`} className="rounded-lg p-1.5 text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={13} /></button>}
      </div>
      {item.text && (
        <>
          <p className={`mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#55514B] ${full ? "" : "line-clamp-3"}`}>{item.text}</p>
          {item.text.length > 160 && <button onClick={() => setFull(!full)} className="mt-0.5 text-[12px] font-semibold text-[#1F5BC4]">{full ? "Show less" : "Show all"}</button>}
        </>
      )}
    </div>
  );
}

function ItemForm({ kindDef, initial, onSave, onCancel }: { kindDef: (typeof kinds)[number]; initial?: PlaybookItem; onSave: (item: PlaybookItem) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const [attached, setAttached] = useState<{ name: string; url: string } | undefined>(initial?.file ?? (initial?.url ? { name: initial.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40), url: initial.url } : undefined));
  const save = () => {
    if (!title.trim()) return;
    const isFile = Boolean(attached && (attached.url.startsWith("data:") || attached.url.startsWith("blob:")));
    onSave({ id: initial?.id ?? uid("item"), kind: kindDef.kind, title: title.trim(), text: text.trim() || undefined, url: attached && !isFile ? attached.url : undefined, file: attached && isFile ? attached : undefined, addedBy: initial?.addedBy ?? "", addedAt: initial?.addedAt ?? todayIso() });
  };
  const wide = kindDef.kind !== "resource";
  return (
    <div className="space-y-2.5 rounded-xl border-2 border-[#2F6FDB]/40 bg-white p-3.5">
      <Field label="Name"><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kindDef.kind === "prompt" ? "e.g. Research prompt for a new client" : kindDef.kind === "sop" ? "e.g. How we set up a client" : "e.g. Sales deck"} className={fieldClass} /></Field>
      <Field label={kindDef.kind === "prompt" ? "The prompt" : kindDef.kind === "sop" ? "Steps" : "Note"}><textarea value={text} onChange={(event) => setText(event.target.value)} rows={wide ? 6 : 2} placeholder={kindDef.placeholder} className={fieldClass} /></Field>
      <div className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-semibold text-[#55514B]">File or link</span><AttachField value={attached} onChange={setAttached} label="Upload file" compact /></div>
      <div className="flex gap-2"><Button kind="primary" size="sm" onClick={save} disabled={!title.trim()}><Check size={13} />Save</Button><Button kind="ghost" size="sm" onClick={onCancel}>Cancel</Button></div>
    </div>
  );
}

