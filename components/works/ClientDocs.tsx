"use client";

import { useState, type ReactNode } from "react";
import { ExternalLink, FileText, Loader2, Trash2, Wand2 } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { nameOf, shortDate } from "@/lib/works/logic";
import { fileToLogo } from "@/lib/works/image";
import { mainPoints } from "@/lib/works/mainPoints";
import { reportText } from "@/lib/works/readReport";
import type { Client, ClientFile } from "@/lib/works/types";
import { AttachField, Button, Card, CardHead, Chip, ClientMark, Empty, fieldClass } from "./kit";

type DocKey = "brand" | "brain" | "templates" | "questionnaire";
const docs: { key: DocKey; label: string; note: string; color: string; linkKey: "guide" | "brain" | "canva" | "questionnaire" }[] = [
  { key: "brand", label: "Brand and creative guidelines", note: "Positioning, tone, visual rules", color: "#D6457A", linkKey: "guide" },
  { key: "brain", label: "Strategy brain", note: "Research, audiences, claims", color: "#7C5CD6", linkKey: "brain" },
  { key: "templates", label: "Canva templates", note: "Editable masters, both sizes", color: "#E08A1E", linkKey: "canva" },
  { key: "questionnaire", label: "Questionnaire", note: "What the client told us about the business", color: "#0F8F8F", linkKey: "questionnaire" },
];
const isLink = (value?: string) => Boolean(value && /^https?:\/\//.test(value));

/** One document: upload it or paste its link, and keep its main points beside it. */
function DocCard({ client, doc }: { client: Client; doc: (typeof docs)[number] }) {
  const { updateClient, ping } = useStore();
  const file = client.packFiles?.[doc.key];
  const link = client.links[doc.linkKey] ?? "";
  const source = file?.url ?? (isLink(link) ? link : "");
  const points = client.packNotes[doc.key] ?? "";
  const [busy, setBusy] = useState(false);
  const attach = (value?: { name: string; url: string }) => {
    const asLink = Boolean(value && /^https?:/.test(value.url) && !value.url.startsWith("blob:"));
    updateClient(client.id, { links: { ...client.links, [doc.linkKey]: asLink ? value!.url : "" }, packFiles: { ...client.packFiles, [doc.key]: !value || asLink ? undefined : value } });
  };
  const write = (value: string) => updateClient(client.id, { packNotes: { ...client.packNotes, [doc.key]: value } });
  const read = async () => {
    if (!file) { ping("Upload the PDF or Word file first. A link cannot be read from here."); return; }
    setBusy(true);
    try {
      const blob = await (await fetch(file.url)).blob();
      const found = mainPoints(await reportText(new File([blob], file.name, { type: blob.type })));
      if (!found) { ping("Nothing clear to pick out of this file. Write the points by hand."); return; }
      if (!points.trim() || window.confirm("Replace what is written with the points found in the file?")) write(found);
    } catch (error) {
      ping(error instanceof Error && !/Word file/.test(error.message) ? error.message : "That file could not be read. Try a PDF or a Word file.");
    } finally { setBusy(false); }
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#F0EEE9] px-4 py-3">
        <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: doc.color }} />
        <div className="min-w-0 flex-1"><div className="text-[15px] font-bold">{doc.label}</div><div className="text-[12px] text-[#8B867E]">{doc.note}</div></div>
        {source ? <Chip t="green" dot>Added</Chip> : <Chip t="amber">Missing</Chip>}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <AttachField value={source ? { name: file?.name ?? source.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40), url: source } : undefined} onChange={attach} label="Upload" />
          {source && <a href={source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1F5BC4]">Open <ExternalLink size={12} /></a>}
          {file && <Button size="sm" onClick={() => void read()} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}Read the main points</Button>}
        </div>
        <textarea value={points} onChange={(event) => write(event.target.value)} rows={points ? 6 : 3} aria-label={`Main points of ${doc.label}`} placeholder="The main points, so nobody has to open the document to know them." className={fieldClass} />
      </div>
    </div>
  );
}

/** The brand, the strategy, the templates and the questionnaire, as documents with their main points. */
export function StrategyDocs({ client }: { client: Client }) {
  return (
    <div className="space-y-3">
      <p className="max-w-[78ch] text-[13px] text-[#6B6760]">The documents behind the account. Upload each one, or paste its link. <b>Read the main points</b> picks out each heading and the line under it from a PDF or Word file, so you only tidy it up. It is a plain read of the text, not an AI summary. That comes when the database and AI are connected.</p>
      <div className="grid gap-4 xl:grid-cols-2">{docs.map((doc) => <DocCard key={doc.key} client={client} doc={doc} />)}</div>
    </div>
  );
}

/** The questionnaire on its own, for the Access and assets tab. It is the same one as in Strategy. */
function QuestionnaireCard({ client }: { client: Client }) {
  return <DocCard client={client} doc={docs[3]} />;
}

/** Upload files or add links under a name that says what they are. Images are shown as pictures. */
export function FilesUploader({ client, categories, title, sub, first }: { client: Client; categories: ClientFile["category"][]; title: string; sub: string; first?: ClientFile["category"] }) {
  const { state, addFile, removeFile } = useStore();
  const [category, setCategory] = useState<ClientFile["category"]>(first ?? categories[0]);
  const list = client.files.filter((file) => categories.includes(file.category));
  return (
    <Card>
      <CardHead title={title} sub={sub} right={
        <span className="flex flex-wrap items-center gap-2">
          <select value={category} onChange={(event) => setCategory(event.target.value as ClientFile["category"])} aria-label="What it is" className="rounded-xl border border-[#E2DED7] bg-white px-2.5 py-1.5 text-[12px] font-semibold">{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <AttachField onChange={(file) => file && addFile(client.id, { ...file, category })} label="Add a file or link" />
        </span>
      } />
      {list.length === 0 ? <Empty title="Nothing here yet" /> : (
        <div className="space-y-4">
          {categories.filter((item) => list.some((file) => file.category === item)).map((item) => {
            const group = list.filter((file) => file.category === item);
            const pictures = group.filter((file) => file.url.startsWith("data:image/"));
            const others = group.filter((file) => !file.url.startsWith("data:image/"));
            return (
              <div key={item}>
                <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-[#8B867E]">{item}</div>
                {pictures.length > 0 && (
                  <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {pictures.map((file) => (
                      <div key={file.id} className="group relative overflow-hidden rounded-xl border border-[#EEEBE5] bg-[#F8F7F4]">
                        <a href={file.url} target="_blank" rel="noreferrer" title={file.name}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={file.url} alt={file.name} className="aspect-square w-full object-contain p-1" /></a>
                        <button onClick={() => removeFile(client.id, file.id)} aria-label={`Remove ${file.name}`} className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-[#B5B0A8] opacity-0 shadow-sm hover:text-[#B83232] group-hover:opacity-100"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
                {others.length > 0 && (
                  <ul className="divide-y divide-[#F3F1ED] rounded-xl border border-[#F0EEE9]">
                    {others.map((file) => (
                      <li key={file.id} className="flex items-center gap-3 px-3 py-2.5">
                        <FileText size={16} className="shrink-0 text-[#8B867E]" />
                        <a href={file.url} target="_blank" rel="noreferrer" download={file.url.startsWith("data:") ? file.name : undefined} className="min-w-0 flex-1 truncate text-[13px] font-semibold hover:text-[#1F5BC4]">{file.name}</a>
                        <span className="hidden text-[12px] text-[#9A958D] sm:inline">{nameOf(state, file.addedBy)} · {shortDate(file.addedAt)}</span>
                        <button onClick={() => removeFile(client.id, file.id)} aria-label={`Remove ${file.name}`} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/** What the client sends us: the access file, logos, photos and project images, and the questionnaire. Then the accounts we have access to. */
export function AccessAssets({ client, children }: { client: Client; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <p className="max-w-[78ch] text-[13px] text-[#6B6760]">Everything the client has to send us in one place: the access file, their logos and brand files, photos and project images, and the questionnaire. Upload each, or paste a link.</p>
      <div className="grid gap-5 xl:grid-cols-2">
        <FilesUploader client={client} categories={["Access", "Logo", "Brand", "Photos", "Project images"]} title="From the client" sub="Choose what it is, then add it." />
        <QuestionnaireCard client={client} />
      </div>
      <div>
        <h3 className="mb-2 text-[15px] font-bold">Accounts and access</h3>
        {children}
      </div>
    </div>
  );
}

const allCategories: ClientFile["category"][] = ["Access", "Logo", "Brand", "Photos", "Project images", "Contract", "Report", "Other"];

/** Every file and link for the client in one place: the strategy documents, what the client sent, contracts and reports, the logo and the workspace links. */
export function ClientFilesTab({ client }: { client: Client }) {
  const { updateClient, ping } = useStore();
  const setLink = (key: keyof Client["links"], value: string) => updateClient(client.id, { links: { ...client.links, [key]: value } });
  const pick = async (file?: File) => { if (!file) return; try { updateClient(client.id, { logo: await fileToLogo(file) }); } catch { ping("Could not read that image. Try a PNG or JPG."); } };
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <div className="min-w-0 space-y-5">
        <Card>
          <CardHead title="Strategy documents" sub="Added in the Strategy tab." />
          <ul className="divide-y divide-[#F3F1ED] rounded-xl border border-[#F0EEE9]">
            {docs.map((doc) => {
              const file = client.packFiles?.[doc.key];
              const link = client.links[doc.linkKey] ?? "";
              const source = file?.url ?? (isLink(link) ? link : "");
              return (
                <li key={doc.key} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="h-6 w-1.5 shrink-0 rounded-full" style={{ background: doc.color }} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{doc.label}{file && <span className="ml-2 text-[12px] font-normal text-[#8B867E]">{file.name}</span>}</span>
                  {source ? <a href={source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1F5BC4]">Open <ExternalLink size={12} /></a> : <span className="text-[12px] text-[#B5B0A8]">Not added</span>}
                </li>
              );
            })}
          </ul>
        </Card>
        <FilesUploader client={client} categories={allCategories} title="Files" sub="Contracts, reports, photos, logos and anything else. Upload a file or paste a link." first="Contract" />
      </div>
      <div className="min-w-0 space-y-5">
        <Card>
          <CardHead title="Logo" sub="Shown next to the client's name everywhere." />
          <div className="flex items-center gap-4">
            <ClientMark client={client} size={72} />
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-xl border border-dashed border-[#C9C3B8] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#3D4450] hover:border-[#2F6FDB] hover:text-[#1F5BC4]">{client.logo ? "Change the logo" : "Upload a logo"}<input type="file" accept="image/*" className="sr-only" onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} /></label>
              {client.logo && <button onClick={() => updateClient(client.id, { logo: undefined })} className="text-[12px] font-semibold text-[#8B867E] hover:text-[#B83232]">Remove</button>}
            </div>
          </div>
        </Card>
        <Card>
          <CardHead title="Workspace links" />
          {([["guide", "Brand guide"], ["brain", "Strategy brain"], ["canva", "Canva templates"], ["questionnaire", "Questionnaire"], ["drive", "Drive folder"], ["brandKit", "Canva brand kit"], ["publer", "Publishing tool"], ["chat", client.channel === "Email" ? "Email thread" : `${client.channel} space`]] as [keyof Client["links"], string][]).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 border-b border-[#F3F1ED] py-2.5 last:border-0">
              <span className="w-28 shrink-0 text-[13px] font-semibold">{label}</span>
              <input value={client.links[key] ?? ""} onChange={(event) => setLink(key, event.target.value)} placeholder="https://…" aria-label={label} className="min-w-0 flex-1 rounded-lg border border-[#E2DED7] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#2F6FDB]" />
              {/^https?:/.test(client.links[key] ?? "") && <a href={client.links[key]} target="_blank" rel="noreferrer" aria-label={`Open ${label}`} className="text-[#1F5BC4]"><ExternalLink size={15} /></a>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

