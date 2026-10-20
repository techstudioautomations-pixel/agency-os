"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Brain, CalendarCheck, Check, ClipboardList, ExternalLink, Handshake, KeyRound, LayoutTemplate, Mail, Palette, Plus, Trash2, type LucideIcon } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { areaItems, autoAreas, missing, progress } from "@/lib/works/logic";
import type { CheckItem, Client } from "@/lib/works/types";
import { PhaseChecklist } from "./Checklist";
import { Bar, Button, Card, Chip, Field, Ring, fieldClass } from "./kit";

const icons: Record<string, LucideIcon> = {
  onboarding: ClipboardList,
  access: KeyRound,
  brain: Brain,
  brand: Palette,
  templates: LayoutTemplate,
  handoff: Handshake,
  newsletter: Mail,
  content: CalendarCheck,
  report: BarChart3,
};
const iconFor = (id: string) => icons[id] ?? ClipboardList;

/** Which client link belongs to which section (the document that section produces). */
const docLink: Record<string, { key: "brain" | "guide" | "canva"; label: string; placeholder: string }> = {
  brain: { key: "brain", label: "Strategy brain document", placeholder: "Link to the research doc or Claude project" },
  brand: { key: "guide", label: "Brand positioning & creative direction guide", placeholder: "Link to the guide (Google Doc or PDF)" },
  templates: { key: "canva", label: "Canva templates folder", placeholder: "https://www.canva.com/…" },
};

const short = (label: string) => label.split(/[:·]/)[0].trim();
const isDone = (item: CheckItem) => item.status === "Received" || item.status === "N/A";
const nextItems = (items: CheckItem[], count = 4) => [...items.filter((item) => !isDone(item)), ...items.filter(isDone)].slice(0, count);

function Preview({ rows }: { rows: { label: string; done: boolean }[] }) {
  return (
    <ul className="space-y-1.5">
      {rows.map((row, index) => (
        <li key={index} className="grid grid-cols-[18px_1fr] items-start gap-2 text-[13px]">
          <span className={`mt-0.5 grid h-[18px] w-[18px] place-items-center rounded-md border-2 ${row.done ? "border-[#1D9E5A] bg-[#1D9E5A] text-white" : "border-[#D9D5CE] bg-white"}`}>{row.done && <Check size={11} strokeWidth={3.5} />}</span>
          <span className={row.done ? "text-[#9A958D] line-through" : "font-medium text-[#1E2430]"}>{row.label}</span>
        </li>
      ))}
      {rows.length === 0 && <li className="text-[13px] text-[#8B867E]">No steps yet. Open it to add some.</li>}
    </ul>
  );
}

/** One card per section, plus the two that fill themselves in. */
export function AreaGrid({ client }: { client: Client }) {
  const { state, go, addClientSection } = useStore();
  const [naming, setNaming] = useState(false);
  const [label, setLabel] = useState("");
  const open = (sub: string) => go({ view: "client", clientId: client.id, tab: "checklists", sub });
  const autos = autoAreas(state, client);
  const available = state.settings.sections.filter((section) => !client.sections.some((item) => item.id === section.id));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {client.sections.map((section) => {
          const items = areaItems(client.checklist, section.id);
          const p = progress(items);
          const keyOpen = missing(items).filter((item) => !item.soft && !item.detail).length;
          const Icon = iconFor(section.id);
          return (
            <button key={section.id} onClick={() => open(section.id)} className="group flex min-w-0 flex-col rounded-2xl border border-[#E9E6E0] bg-white p-4 text-left transition hover:border-[#D2CCC2] hover:shadow-[0_8px_24px_rgba(30,36,48,.07)]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: section.color }}><Icon size={20} /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold">{section.label}</div>
                  <div className="truncate text-[12px] text-[#8B867E]">{p.complete} of {p.total} done</div>
                </div>
                <Ring value={p.percent} size={42} color={p.percent === 100 ? "#1D9E5A" : section.color} />
              </div>
              <div className="mt-3 flex-1"><Preview rows={nextItems(items).map((item) => ({ label: short(item.label), done: isDone(item) }))} /></div>
              <div className="mt-3 flex items-center gap-2 border-t border-[#F0EEE9] pt-3 text-[12px] font-semibold">
                {p.total === 0 ? <Chip>Empty</Chip> : p.percent === 100 ? <Chip t="green">Complete</Chip> : keyOpen > 0 ? <Chip t="amber">{keyOpen} key step{keyOpen === 1 ? "" : "s"} open</Chip> : <Chip t="blue">Details open</Chip>}
                <span className="ml-auto inline-flex items-center gap-1 text-[#1F5BC4]">Open <ArrowRight size={13} className="transition group-hover:translate-x-0.5" /></span>
              </div>
            </button>
          );
        })}
        {autos.map((area) => {
          const done = area.steps.filter((step) => step.done).length;
          const Icon = iconFor(area.id);
          return (
            <button key={area.id} onClick={() => open(area.id)} className="group flex min-w-0 flex-col rounded-2xl border border-dashed border-[#D6D1C8] bg-[#FBFAF8] p-4 text-left transition hover:border-[#B5B0A8]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: area.color }}><Icon size={20} /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold">{area.label}</div>
                  <div className="truncate text-[12px] text-[#8B867E]">{area.blurb}</div>
                </div>
                <Ring value={Math.round((done / area.steps.length) * 100)} size={42} color={done === area.steps.length ? "#1D9E5A" : area.color} />
              </div>
              <div className="mt-3 flex-1"><Preview rows={[...area.steps.filter((step) => !step.done), ...area.steps.filter((step) => step.done)].slice(0, 4)} /></div>
              <div className="mt-3 flex items-center gap-2 border-t border-[#F0EEE9] pt-3 text-[12px] font-semibold">
                <Chip>Automatic</Chip>
                <span className="ml-auto inline-flex items-center gap-1 text-[#1F5BC4]">See steps <ArrowRight size={13} /></span>
              </div>
            </button>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-bold">Add a section for this client</span>
          {available.map((section) => (
            <button key={section.id} onClick={() => addClientSection(client.id, { fromId: section.id })} className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DED7] bg-white px-3 py-1.5 text-[13px] font-semibold hover:border-[#2F6FDB] hover:text-[#1F5BC4]"><Plus size={12} />{section.label}</button>
          ))}
          {naming ? (
            <form onSubmit={(event) => { event.preventDefault(); if (!label.trim()) return; addClientSection(client.id, { label }); setLabel(""); setNaming(false); }} className="flex gap-2">
              <input autoFocus value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Website project" aria-label="New section name" className="w-52 rounded-xl border border-[#E2DED7] px-3 py-1.5 text-[13px] outline-none focus:border-[#2F6FDB]" />
              <Button size="sm" kind="primary" type="submit">Add</Button>
              <Button size="sm" kind="ghost" type="button" onClick={() => setNaming(false)}>Cancel</Button>
            </form>
          ) : (
            <button onClick={() => setNaming(true)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#C9C3B8] px-3 py-1.5 text-[13px] font-semibold text-[#3D4450] hover:border-[#2F6FDB]"><Plus size={12} />Blank section</button>
          )}
        </div>
        <p className="mt-2 text-[12px] text-[#8B867E]">Changes here are for {client.name} only. To change the defaults for new clients, use Settings → Checklists.</p>
      </Card>
    </div>
  );
}

/** One section in full: the tick-list, a link to the document it produces, and a place to add steps for this client. */
export function AreaDetail({ client, areaId }: { client: Client; areaId: string }) {
  const { state, go, toggleCheck, updateCheck, addCheck, removeCheck, updateClient, removeClientSection, renameClientSection } = useStore();
  const back = () => go({ view: "client", clientId: client.id, tab: "checklists" });
  const auto = autoAreas(state, client).find((area) => area.id === areaId);
  const section = client.sections.find((item) => item.id === areaId);

  if (auto) {
    const done = auto.steps.filter((step) => step.done).length;
    const Icon = iconFor(auto.id);
    return (
      <div className="space-y-4">
        <Button kind="ghost" onClick={back}><ArrowLeft size={15} />All checklists</Button>
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: auto.color }}><Icon size={22} /></span>
            <div className="flex-1"><h3 className="text-[18px] font-bold">{auto.label}</h3><p className="text-[13px] text-[#6B6760]">{auto.blurb} Nothing to tick: do the work and it ticks itself.</p></div>
            <Chip t={done === auto.steps.length ? "green" : "grey"}>{done}/{auto.steps.length}</Chip>
          </div>
          <ul className="mt-4 divide-y divide-[#F3F1ED] rounded-xl border border-[#F0EEE9]">
            {auto.steps.map((step) => (
              <li key={step.label} className="flex items-center gap-3 px-4 py-3">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${step.done ? "border-[#1D9E5A] bg-[#1D9E5A] text-white" : "border-[#D9D5CE] bg-white"}`}>{step.done && <Check size={15} strokeWidth={3} />}</span>
                <span className={`flex-1 text-[14px] ${step.done ? "text-[#9A958D] line-through" : "font-semibold"}`}>{step.label}</span>
                <Button size="sm" onClick={() => go(step.go)}>Open <ArrowRight size={13} /></Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }
  if (!section) return <div className="space-y-4"><Button kind="ghost" onClick={back}><ArrowLeft size={15} />All checklists</Button><p className="text-[14px] text-[#6B6760]">This section is not on this client.</p></div>;

  const items = areaItems(client.checklist, section.id);
  const p = progress(items);
  const Icon = iconFor(section.id);
  const doc = docLink[section.id];
  const url = doc ? client.links[doc.key] ?? "" : "";
  const hasDetail = items.some((item) => item.detail);

  return (
    <div className="space-y-4">
      <Button kind="ghost" onClick={back}><ArrowLeft size={15} />All checklists</Button>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl p-5" style={{ background: `${section.color}12` }}>
        <span className="grid h-12 w-12 place-items-center rounded-xl text-white" style={{ background: section.color }}><Icon size={24} /></span>
        <div className="min-w-[200px] flex-1">
          <input value={section.label} onChange={(event) => renameClientSection(client.id, section.id, event.target.value)} aria-label="Section name" className="w-full bg-transparent text-[20px] font-extrabold outline-none" />
          <p className="text-[13px] text-[#55514B]">{section.blurb} {hasDetail ? "Steps marked Key step decide whether the client is ready for production." : ""}</p>
        </div>
        <div className="flex w-full max-w-[220px] items-center gap-2"><Bar value={p.percent} color={section.color} track="#FFFFFF" height={8} /><b className="text-[13px]">{p.percent}%</b></div>
        <button onClick={() => { if (window.confirm(`Remove "${section.label}" and its ${items.length} steps from ${client.name}? Other clients and the defaults are not affected.`)) { removeClientSection(client.id, section.id); back(); } }} aria-label={`Remove ${section.label}`} className="rounded-xl p-2 text-[#8B867E] hover:bg-white hover:text-[#B83232]"><Trash2 size={17} /></button>
      </div>

      {doc && (
        <Card>
          <Field label={doc.label} hint={section.id === "brand" ? "Follows Garrett's guide: positioning and audience, visual identity, social treatments, freelancer rules, quality and sign-off." : section.id === "templates" ? "Ten editable masters, each in portrait 1080×1350 and square 1080×1080." : "The freelancer builds ideas from this."}>
            <div className="flex gap-2">
              <input value={url} onChange={(event) => updateClient(client.id, { links: { ...client.links, [doc.key]: event.target.value } })} placeholder={doc.placeholder} className={fieldClass} />
              {/^https?:/.test(url) && <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${doc.label}`} className="mt-1 inline-flex items-center gap-1 rounded-xl border border-[#E2DED7] px-3.5 text-[13px] font-semibold text-[#1F5BC4] hover:border-[#C9C3B8]">Open <ExternalLink size={13} /></a>}
            </div>
          </Field>
        </Card>
      )}
      {section.id === "access" && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#E7F6EE] p-4 text-[13px]">
          <KeyRound size={17} className="shrink-0 text-[#17804A]" />
          <span className="flex-1 text-[#17603A]">Record who actually has access, and since when, in the Access tab. Never store passwords.</span>
          <Button size="sm" onClick={() => go({ view: "client", clientId: client.id, tab: "access" })}>Open Access <ArrowRight size={13} /></Button>
        </div>
      )}

      <PhaseChecklist
        items={items}
        onToggle={(id) => toggleCheck(client.id, id)}
        onUpdate={(id, patch) => updateCheck(client.id, id, patch)}
        onAdd={(title) => addCheck(client.id, section.id, title)}
        onRemove={(id) => removeCheck(client.id, id)}
        copyGroup="2 · Questionnaire"
        addLabel={`Add a step to ${section.label} for ${client.name}…`}
      />
    </div>
  );
}

/** A compact row of bars for the client overview. */
export function AreaStrip({ client }: { client: Client }) {
  const { state, go } = useStore();
  const autos = autoAreas(state, client);
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[16px] font-bold">Checklists</h3>
        <button onClick={() => go({ view: "client", clientId: client.id, tab: "checklists" })} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1F5BC4]">Open all <ArrowRight size={13} /></button>
      </div>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        {client.sections.map((section) => {
          const p = progress(areaItems(client.checklist, section.id));
          return (
            <button key={section.id} onClick={() => go({ view: "client", clientId: client.id, tab: "checklists", sub: section.id })} className="min-w-0 text-left">
              <div className="mb-1 flex items-center justify-between gap-2 text-[13px] font-semibold"><span className="truncate">{section.label}</span><span className="text-[#8B867E]">{p.complete}/{p.total}</span></div>
              <Bar value={p.percent} color={p.percent === 100 ? "#1D9E5A" : section.color} />
            </button>
          );
        })}
        {autos.map((area) => {
          const done = area.steps.filter((step) => step.done).length;
          return (
            <button key={area.id} onClick={() => go({ view: "client", clientId: client.id, tab: "checklists", sub: area.id })} className="min-w-0 text-left">
              <div className="mb-1 flex items-center justify-between gap-2 text-[13px] font-semibold"><span className="truncate">{area.label}</span><span className="text-[#8B867E]">{done}/{area.steps.length}</span></div>
              <Bar value={(done / area.steps.length) * 100} color={done === area.steps.length ? "#1D9E5A" : area.color} />
            </button>
          );
        })}
      </div>
    </Card>
  );
}
