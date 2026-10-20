"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown, ExternalLink, FileText, Pencil } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { areaItems, isFreelancer, progress } from "@/lib/works/logic";
import type { CheckItem, Client } from "@/lib/works/types";
import { AttachField, Button, Chip, fieldClass } from "./kit";

export type DocKey = "brand" | "brain" | "templates";

export const packDocs = (client: Client): { key: DocKey; label: string; note: string; url: string; color: string; linkKey: "guide" | "brain" | "canva" }[] => [
  { key: "brand", label: "Brand & creative guide", note: "Positioning, tone, visual rules", url: client.links.guide ?? "", color: "#D6457A", linkKey: "guide" },
  { key: "brain", label: "Strategy brain", note: "Research, audiences, claims", url: client.links.brain ?? "", color: "#7C5CD6", linkKey: "brain" },
  { key: "templates", label: "Canva templates", note: "Editable masters, both sizes", url: client.links.canva, color: "#E08A1E", linkKey: "canva" },
];

const isDone = (item: CheckItem) => item.status === "Received" || item.status === "N/A";
const isUrl = (value: string) => /^https?:\/\//.test(value.trim());
const shortGroup = (group: string) => group.replace(/^.*?·\s*/, "");

/** Google Docs, Slides and Drive files can be shown inside the page. Other links open in a new tab. */
function embedUrl(url: string): string | null {
  const doc = url.match(/^https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([^/?#]+)/);
  if (doc) return `https://docs.google.com/${doc[1]}/d/${doc[2]}/preview`;
  const file = url.match(/^https:\/\/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (file) return `https://drive.google.com/file/d/${file[1]}/preview`;
  if (/\.pdf($|[?#])/i.test(url)) return url;
  return null;
}

/** A data: file turned into a blob, which browsers will show inside a frame. */
function useShowableUrl(src: string) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!src.startsWith("data:")) { setUrl(src); return; }
    try {
      const [head, body] = src.split(",");
      const mime = head.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
      const bytes = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
      const blob = URL.createObjectURL(new Blob([bytes], { type: mime }));
      setUrl(blob);
      return () => URL.revokeObjectURL(blob);
    } catch { setUrl(""); }
  }, [src]);
  return url;
}

/** The starter pack as a short card with three documents. Opening one goes to Marketing, where the document is shown. */
export function StarterPack({ client }: { client: Client }) {
  const { state, go } = useStore();
  const freelancer = isFreelancer(state);
  const handed = client.checklist.some((item) => item.label.startsWith("Pack handed") && item.status === "Received");
  const p = progress(["brain", "brand", "templates", "handoff"].flatMap((id) => areaItems(client.checklist, id)));
  return (
    <div className="rounded-2xl border border-[#E9E6E0] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-[15px] font-bold">{freelancer ? "Your starter pack" : "Freelancer starter pack"}</h3>
        {handed ? <Chip t="green" dot>Handed over</Chip> : <Chip t="amber" dot>Being prepared · {p.percent}%</Chip>}
        {!freelancer && <button onClick={() => go({ view: "client", clientId: client.id, tab: "checklists" })} className="ml-auto text-[13px] font-semibold text-[#1F5BC4]">Checklists <ArrowRight size={12} className="inline" /></button>}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {packDocs(client).map((doc) => {
          const items = areaItems(client.checklist, doc.key);
          const ready = items.length > 0 && items.every(isDone);
          return (
            <button key={doc.key} onClick={() => go({ view: "marketing", clientId: client.id, tab: `pack-${doc.key}` })} className="flex items-center gap-3 rounded-xl border border-[#EEEBE5] px-3 py-2.5 text-left hover:border-[#C9C3B8]">
              <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: doc.color }} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold">{doc.label}</span><span className="block truncate text-[12px] text-[#8B867E]">{ready ? "Ready" : doc.note}</span></span>
              {ready ? <Check size={15} className="shrink-0 text-[#17804A]" /> : <ArrowRight size={14} className="shrink-0 text-[#8B867E]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One starter-pack document shown in the page: the document itself, a short summary, and the checklist behind it. */
export function PackPane({ client, docKey }: { client: Client; docKey: DocKey }) {
  const { state, go, updateClient } = useStore();
  const freelancer = isFreelancer(state);
  const doc = packDocs(client).find((item) => item.key === docKey)!;
  const file = client.packFiles?.[docKey];
  const source = file?.url ?? (isUrl(doc.url) ? doc.url : "");
  const items = areaItems(client.checklist, docKey);
  const p = progress(items);
  const groups = [...new Set(items.map((item) => item.group))];
  const text = client.packNotes[docKey];
  const [editing, setEditing] = useState(false);
  const [showList, setShowList] = useState(!source);
  const write = (value: string) => updateClient(client.id, { packNotes: { ...client.packNotes, [docKey]: value } });
  const attach = (value?: { name: string; url: string }) => {
    const isLink = Boolean(value?.url.startsWith("http"));
    updateClient(client.id, {
      links: { ...client.links, [doc.linkKey]: isLink ? value!.url : "" },
      packFiles: { ...client.packFiles, [docKey]: !value || isLink ? undefined : value },
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#F0EEE9] px-5 py-4">
          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: doc.color }} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[18px] font-extrabold">{doc.label}</h3>
            <p className="text-[12px] text-[#8B867E]">{client.name} · {doc.note}</p>
          </div>
          {source && <a href={source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2DED7] px-3.5 py-2 text-[13px] font-semibold hover:border-[#C9C3B8]">Open in new tab <ExternalLink size={13} /></a>}
          {!freelancer && <AttachField value={source ? { name: file?.name ?? source.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40), url: source } : undefined} onChange={attach} label="Upload PDF" />}
        </div>
        <DocFrame source={source} name={file?.name} admin={!freelancer} color={doc.color} />
      </div>

      <section className="rounded-2xl border border-[#E9E6E0] bg-white p-5">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-[15px] font-bold">In short</h3>
          {!freelancer && !editing && <button onClick={() => setEditing(true)} className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-[#1F5BC4]"><Pencil size={13} />{text ? "Edit" : "Write it"}</button>}
          {editing && <Button size="sm" kind="primary" onClick={() => setEditing(false)}><Check size={13} />Done</Button>}
        </div>
        {editing ? (
          <textarea autoFocus value={text} onChange={(event) => write(event.target.value)} rows={7} aria-label={`${doc.label} summary`} className={fieldClass} placeholder="The points the freelancer must have in front of them: voice, colours, what to avoid, who we write for." />
        ) : text ? (
          <p className="whitespace-pre-wrap rounded-xl bg-[#F8F7F4] p-4 text-[14px] leading-relaxed">{text}</p>
        ) : (
          <p className="rounded-xl border border-dashed border-[#D6D1C8] p-4 text-[13px] text-[#8B867E]">{freelancer ? "Nothing written here yet. Use the document above." : "Nothing written yet. Put the key points here so the freelancer can read them quickly."}</p>
        )}
      </section>

      <section className="rounded-2xl border border-[#E9E6E0] bg-white">
        <button onClick={() => setShowList(!showList)} aria-expanded={showList} className="flex w-full items-center gap-3 px-5 py-4 text-left">
          <h3 className="flex-1 text-[15px] font-bold">Checklist behind it</h3>
          <Chip t={p.percent === 100 ? "green" : "grey"}>{p.complete}/{p.total}</Chip>
          <ChevronDown size={17} className={`text-[#8B867E] transition ${showList ? "rotate-180" : ""}`} />
        </button>
        {showList && (
          <div className="space-y-3 border-t border-[#F0EEE9] px-5 pb-5 pt-4">
            {items.length === 0 ? <p className="text-[13px] text-[#8B867E]">This client has no checklist for it.</p> : groups.map((group) => (
              <div key={group}>
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
            {!freelancer && <Button onClick={() => go({ view: "client", clientId: client.id, tab: "checklists", sub: docKey })}>Edit the checklist <ArrowRight size={13} /></Button>}
          </div>
        )}
      </section>
    </div>
  );
}

function DocFrame({ source, name, admin, color }: { source: string; name?: string; admin: boolean; color: string }) {
  const shown = useShowableUrl(source);
  const embed = source.startsWith("data:") ? (/^data:(application\/pdf|image\/)/.test(source) ? shown : null) : embedUrl(source);
  const isImage = source.startsWith("data:image/");
  if (!source) {
    return (
      <div className="grid min-h-[220px] place-items-center px-6 py-10 text-center">
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ background: color }}><FileText size={22} /></span>
          <p className="mt-3 text-[15px] font-bold">No document yet</p>
          <p className="mt-1 max-w-sm text-[13px] text-[#6B6760]">{admin ? "Upload the PDF, or paste a link to the Google Doc, with the buttons above. It will show here for the freelancer." : "Operations has not added it yet."}</p>
        </div>
      </div>
    );
  }
  if (embed) {
    return (
      <div>
        {isImage ? <img src={embed} alt={name ?? "Document"} className="mx-auto max-h-[70vh] w-auto max-w-full" /> : <iframe src={embed} title={name ?? "Document"} className="h-[72vh] min-h-[420px] w-full bg-[#F8F7F4]" />}
        <p className="border-t border-[#F0EEE9] px-5 py-2.5 text-[12px] text-[#8B867E]">If the document does not load here, use “Open in new tab”. Google files only show to people signed in with access.{source.startsWith("blob:") ? " This large file is only kept in this browser tab until the database is connected. Files under 1.5 MB are saved." : ""}</p>
      </div>
    );
  }
  return (
    <div className="grid min-h-[200px] place-items-center px-6 py-10 text-center">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ background: color }}><ExternalLink size={22} /></span>
        <p className="mt-3 text-[15px] font-bold">This one opens in its own tab</p>
        <p className="mt-1 max-w-sm text-[13px] text-[#6B6760]">Some sites, such as Canva, cannot be shown inside the app. Use “Open in new tab” above. For a Google Doc, paste the full link to the file so it can show here.</p>
      </div>
    </div>
  );
}
