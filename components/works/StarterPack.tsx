"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, ExternalLink, Pencil, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { areaItems, isFreelancer, progress } from "@/lib/works/logic";
import type { CheckItem, Client } from "@/lib/works/types";
import { Button, Chip, fieldClass } from "./kit";

type DocKey = "brand" | "brain" | "templates";

const docs = (client: Client): { key: DocKey; label: string; note: string; url: string; color: string }[] => [
  { key: "brand", label: "Brand & creative guide", note: "Positioning, tone, visual rules", url: client.links.guide ?? "", color: "#D6457A" },
  { key: "brain", label: "Strategy brain", note: "Research, audiences, claims", url: client.links.brain ?? "", color: "#7C5CD6" },
  { key: "templates", label: "Canva templates", note: "Editable masters, both sizes", url: client.links.canva, color: "#E08A1E" },
];

const isDone = (item: CheckItem) => item.status === "Received" || item.status === "N/A";
const isUrl = (value: string) => /^https?:\/\//.test(value.trim());
const shortGroup = (group: string) => group.replace(/^.*?·\s*/, "");

/** The starter pack, readable inside the app. The same view is used on the client page and in Marketing. */
export function StarterPack({ client }: { client: Client }) {
  const { state, go } = useStore();
  const freelancer = isFreelancer(state);
  const [open, setOpen] = useState<DocKey | "">("");
  const handed = client.checklist.some((item) => item.label.startsWith("Pack handed") && item.status === "Received");
  const packItems = ["brain", "brand", "templates", "handoff"].flatMap((id) => areaItems(client.checklist, id));
  const p = progress(packItems);

  return (
    <div className="rounded-2xl border border-[#E9E6E0] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-[15px] font-bold">{freelancer ? "Your starter pack" : "Freelancer starter pack"}</h3>
        {handed ? <Chip t="green" dot>Handed over</Chip> : <Chip t="amber" dot>Being prepared · {p.percent}%</Chip>}
        {!freelancer && <button onClick={() => go({ view: "client", clientId: client.id, tab: "checklists" })} className="ml-auto text-[13px] font-semibold text-[#1F5BC4]">Checklists <ArrowRight size={12} className="inline" /></button>}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {docs(client).map((doc) => {
          const items = areaItems(client.checklist, doc.key);
          const ready = items.length > 0 && items.every(isDone);
          const written = Boolean(client.packNotes[doc.key].trim()) || isUrl(doc.url);
          return (
            <button key={doc.key} onClick={() => setOpen(doc.key)} className="flex items-center gap-3 rounded-xl border border-[#EEEBE5] px-3 py-2.5 text-left hover:border-[#C9C3B8]">
              <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: doc.color }} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold">{doc.label}</span><span className="block truncate text-[12px] text-[#8B867E]">{ready ? "Ready" : written ? doc.note : freelancer ? "Not added yet" : "Not written yet"}</span></span>
              {ready ? <Check size={15} className="shrink-0 text-[#17804A]" /> : <ArrowRight size={14} className="shrink-0 text-[#8B867E]" />}
            </button>
          );
        })}
      </div>
      {open && <PackViewer client={client} start={open} onClose={() => setOpen("")} />}
    </div>
  );
}

function PackViewer({ client, start, onClose }: { client: Client; start: DocKey; onClose: () => void }) {
  const { state, go, updateClient } = useStore();
  const freelancer = isFreelancer(state);
  const [key, setKey] = useState<DocKey>(start);
  const [editing, setEditing] = useState(false);
  const list = docs(client);
  const doc = list.find((item) => item.key === key)!;
  const items = areaItems(client.checklist, key);
  const groups = [...new Set(items.map((item) => item.group))];
  const text = client.packNotes[key];
  const write = (value: string) => updateClient(client.id, { packNotes: { ...client.packNotes, [key]: value } });

  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-end bg-[#1E2430]/50 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={doc.label} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex max-h-[94vh] w-full max-w-[760px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start gap-3 border-b border-[#F0EEE9] px-6 pb-3 pt-5">
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-[#8B867E]">{client.name} · starter pack</div>
            <h2 className="mt-0.5 text-[22px] font-extrabold">{doc.label}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-[#8B867E] hover:bg-[#F1F0ED]"><X size={18} /></button>
        </div>
        <div className="flex gap-1 overflow-x-auto px-6 pt-3">
          {list.map((item) => (
            <button key={item.key} onClick={() => { setKey(item.key); setEditing(false); }} aria-pressed={key === item.key} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${key === item.key ? "text-white" : "bg-[#F1F0ED] text-[#55514B]"}`} style={key === item.key ? { background: item.color } : undefined}>{item.label}</button>
          ))}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            {isUrl(doc.url) ? (
              <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E2430] px-4 py-2.5 text-[13px] font-semibold text-white">Open the full document <ExternalLink size={14} /></a>
            ) : (
              <span className="rounded-xl bg-[#F8F7F4] px-4 py-2.5 text-[13px] text-[#8B867E]">No link added yet</span>
            )}
            {!freelancer && <Button onClick={() => go({ view: "client", clientId: client.id, tab: "checklists", sub: key })}>Edit the checklist and link <ArrowRight size={13} /></Button>}
          </div>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-[15px] font-bold">In short</h3>
              {!freelancer && !editing && <button onClick={() => setEditing(true)} className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-[#1F5BC4]"><Pencil size={13} />{text ? "Edit" : "Write it"}</button>}
              {editing && <Button size="sm" kind="primary" onClick={() => setEditing(false)}><Check size={13} />Done</Button>}
            </div>
            {editing ? (
              <textarea autoFocus value={text} onChange={(event) => write(event.target.value)} rows={8} aria-label={`${doc.label} summary`} className={fieldClass} placeholder="The points the freelancer must have in front of them: voice, colours, what to avoid, who we write for." />
            ) : text ? (
              <p className="whitespace-pre-wrap rounded-xl bg-[#F8F7F4] p-4 text-[14px] leading-relaxed">{text}</p>
            ) : (
              <p className="rounded-xl border border-dashed border-[#D6D1C8] p-4 text-[13px] text-[#8B867E]">{freelancer ? "Nothing written here yet. Use the full document." : "Nothing written yet. Put the key points here so the freelancer can read them without leaving the app."}</p>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-[15px] font-bold">What is in it</h3>
            {items.length === 0 ? <p className="text-[13px] text-[#8B867E]">This client has no checklist for it.</p> : groups.map((group) => (
              <div key={group} className="mb-3">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#8B867E]">{shortGroup(group)}</div>
                <ul className="divide-y divide-[#F3F1ED] rounded-xl border border-[#F0EEE9]">
                  {items.filter((item) => item.group === group).map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-3.5 py-2.5">
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${isDone(item) ? "border-[#1D9E5A] bg-[#1D9E5A] text-white" : "border-[#D9D5CE] bg-white"}`}>{isDone(item) && <Check size={12} strokeWidth={3.5} />}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] ${isDone(item) ? "text-[#55514B]" : "font-semibold"}`}>{item.label}</span>
                        {item.note && (isUrl(item.note) ? <a href={item.note} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1F5BC4]">Open <ExternalLink size={11} /></a> : <span className="block whitespace-pre-wrap text-[12px] text-[#6B6760]">{item.note}</span>)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
