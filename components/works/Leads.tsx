"use client";

import { useState } from "react";
import { ArrowRight, Plus, Trophy, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { money, nameOf, shortDate, todayIso } from "@/lib/works/logic";
import type { Lead, LeadStage } from "@/lib/works/types";
import { Shell } from "./Shell";
import { Avatar, Button, Card, Chip, Field, fieldClass } from "./kit";

const columns: LeadStage[] = ["New", "Contacted", "Discovery call", "Proposal sent"];

export function Leads({ leadId }: { leadId?: string }) {
  const store = useStore();
  const { state, go } = store;
  const [name, setName] = useState("");
  const [dragged, setDragged] = useState("");
  const open = state.leads.filter((lead) => columns.includes(lead.stage));
  const won = state.leads.filter((lead) => lead.stage === "Won");
  const lost = state.leads.filter((lead) => lead.stage === "Lost");
  const selected = state.leads.find((lead) => lead.id === leadId);
  const pipeline = open.reduce((sum, lead) => sum + lead.value, 0);
  const cur = state.settings.currency;
  const due = open.filter((lead) => lead.followUp && lead.followUp <= todayIso()).length;

  return (
    <Shell
      title="Leads"
      sub={<>{open.length} open · {money(pipeline, cur)}/month in the pipeline{due ? <> · <b className="text-[#B83232]">{due} follow-up{due === 1 ? "" : "s"} due</b></> : null}</>}
      actions={
        <form onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; store.addLead(name.trim()); setName(""); }} className="flex gap-2">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Company name" aria-label="New lead" className="w-52 rounded-xl border border-[#E2DED7] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2F6FDB]" />
          <Button kind="primary" type="submit"><Plus size={15} />Add lead</Button>
        </form>
      }
    >
      <div className="grid gap-3 overflow-x-auto pb-2 lg:grid-cols-4">
        {columns.map((stage) => {
          const list = open.filter((lead) => lead.stage === stage);
          return (
            <div key={stage} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged) store.updateLead(dragged, { stage }); setDragged(""); }} className="min-w-[230px] rounded-2xl bg-[#EFEDE8] p-2.5 lg:min-w-0">
              <div className="mb-2.5 flex items-center justify-between px-1.5 pt-1">
                <span className="text-[13px] font-bold">{stage}</span>
                <span className="text-[12px] font-semibold text-[#6B6760]">{money(list.reduce((sum, lead) => sum + lead.value, 0), cur)}</span>
              </div>
              <div className="space-y-2.5">
                {list.map((lead) => {
                  const late = lead.followUp && lead.followUp < todayIso();
                  const today = lead.followUp === todayIso();
                  return (
                    <button key={lead.id} draggable onDragStart={() => setDragged(lead.id)} onClick={() => go({ view: "leads", leadId: lead.id })} className={`w-full rounded-xl border bg-white p-3 text-left transition hover:shadow-md ${selected?.id === lead.id ? "border-[#1E2430]" : "border-transparent"}`}>
                      <div className="text-[14px] font-bold leading-snug">{lead.company}</div>
                      <div className="mt-1 text-[12px] text-[#8B867E]">{lead.sector || "Sector to add"} · {lead.package}</div>
                      <div className="mt-2.5 flex items-center gap-2 text-[12px]">
                        <b>{money(lead.value, cur)}</b>
                        {lead.followUp && <Chip t={late ? "red" : today ? "amber" : "grey"} className="ml-auto">{late ? "Overdue" : today ? "Today" : `Follow up ${shortDate(lead.followUp)}`}</Chip>}
                      </div>
                    </button>
                  );
                })}
                {list.length === 0 && <div className="rounded-xl border-2 border-dashed border-[#D6D1C8] p-4 text-center text-[12px] text-[#A8A39B]">Drag a lead here</div>}
              </div>
            </div>
          );
        })}
      </div>

      {selected && <LeadPanel lead={selected} onClose={() => go({ view: "leads" })} />}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 text-[15px] font-bold"><Trophy size={16} className="text-[#1D9E5A]" />Won · handed to María</h3>
          <ul className="mt-3 space-y-2">
            {won.map((lead) => (
              <li key={lead.id} className="flex items-center gap-2 rounded-xl bg-[#E7F6EE] px-3 py-2.5 text-[13px]">
                <b className="flex-1">{lead.company}</b>
                {lead.clientId && <button onClick={() => go({ view: "client", clientId: lead.clientId!, tab: "checklist" })} className="inline-flex items-center gap-1 font-semibold text-[#17804A]">Onboarding <ArrowRight size={13} /></button>}
              </li>
            ))}
            {won.length === 0 && <li className="text-[13px] text-[#8B867E]">None yet this period.</li>}
          </ul>
        </Card>
        <Card>
          <h3 className="text-[15px] font-bold">Lost</h3>
          <ul className="mt-3 space-y-2">
            {lost.map((lead) => (
              <li key={lead.id} className="rounded-xl bg-[#F6F5F2] px-3 py-2.5 text-[13px]"><b>{lead.company}</b>{lead.notes[0] && <span className="text-[#6B6760]"> · {lead.notes[0].body}</span>}</li>
            ))}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}

function LeadPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const store = useStore();
  const { state, go } = store;
  const [note, setNote] = useState("");
  const set = (patch: Partial<Lead>) => store.updateLead(lead.id, patch);
  const owner = state.people.find((person) => person.id === lead.ownerId);
  return (
    <Card className="mt-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <input value={lead.company} onChange={(event) => set({ company: event.target.value })} aria-label="Company" className="w-full bg-transparent text-[20px] font-extrabold outline-none" />
          <div className="mt-1 flex items-center gap-2 text-[13px] text-[#6B6760]">{owner && <Avatar name={owner.name} color={owner.color} size={20} />}Owner: {nameOf(state, lead.ownerId)} · {lead.stage}</div>
        </div>
        {lead.stage !== "Won" && (
          <Button kind="good" onClick={() => { const id = store.winLead(lead.id); go({ view: "client", clientId: id, tab: "checklist" }); }}><Trophy size={15} />Mark as won</Button>
        )}
        {lead.stage !== "Lost" && lead.stage !== "Won" && <Button kind="danger" onClick={() => set({ stage: "Lost", followUp: "" })}>Lost</Button>}
        <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-[#8B867E] hover:bg-[#F1F0ED]"><X size={18} /></button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Contact"><input value={lead.contact} onChange={(event) => set({ contact: event.target.value })} className={fieldClass} /></Field>
        <Field label="Email"><input value={lead.email} onChange={(event) => set({ email: event.target.value })} className={fieldClass} /></Field>
        <Field label="Sector"><input value={lead.sector} onChange={(event) => set({ sector: event.target.value })} className={fieldClass} /></Field>
        <Field label="Source"><input value={lead.source} onChange={(event) => set({ source: event.target.value })} className={fieldClass} placeholder="Referral, LinkedIn, event…" /></Field>
        <Field label="Package"><select value={lead.package} onChange={(event) => set({ package: event.target.value as Lead["package"] })} className={fieldClass}><option>Not sure</option><option>Essential</option><option>Growth</option></select></Field>
        <Field label={`Value per month · ${state.settings.currency}`}><input type="number" min={0} value={lead.value} onChange={(event) => set({ value: Number(event.target.value) })} className={fieldClass} /></Field>
        <Field label="Stage"><select value={lead.stage} onChange={(event) => set({ stage: event.target.value as LeadStage })} className={fieldClass}>{[...columns, "Lost"].map((stage) => <option key={stage}>{stage}</option>)}</select></Field>
        <Field label="Next follow-up" hint={`Moving stage sets it ${state.settings.followUpDays} days out.`}><input type="date" value={lead.followUp} onChange={(event) => set({ followUp: event.target.value })} className={fieldClass} /></Field>
      </div>
      <div className="mt-4">
        <form onSubmit={(event) => { event.preventDefault(); if (!note.trim()) return; set({ notes: [{ at: todayIso(), body: note.trim() }, ...lead.notes] }); setNote(""); }} className="flex gap-2">
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Log a call, email or meeting…" aria-label="Note" className="min-w-0 flex-1 rounded-xl border border-[#E2DED7] px-3 py-2.5 text-[13px] outline-none focus:border-[#2F6FDB]" />
          <Button type="submit">Add note</Button>
        </form>
        <ul className="mt-3 space-y-1.5">
          {lead.notes.map((item, index) => <li key={index} className="rounded-lg bg-[#F8F7F4] px-3 py-2 text-[13px]"><span className="text-[12px] font-semibold text-[#8B867E]">{shortDate(item.at)}</span> · {item.body}</li>)}
        </ul>
      </div>
      <p className="mt-4 text-[12px] text-[#8B867E]">Marking as won creates the client, starts the onboarding checklist with the package filled in, and notifies María and operations.</p>
    </Card>
  );
}
