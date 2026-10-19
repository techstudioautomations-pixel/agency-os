"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, ShieldCheck, ShieldX, Trash2 } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { canBeAssigned, isOwner, missing, progress, turnOf } from "@/lib/works/logic";
import type { Freelancer } from "@/lib/works/types";
import { Shell } from "./Shell";
import { PhaseChecklist } from "./Checklist";
import { Avatar, Bar, Button, Card, CardHead, Chip, ClientMark, Field, fieldClass, tone } from "./kit";

/** Services are stored one per line as "Service | price". */
const parseServices = (text: string) => text.split("\n").map((line) => line.split("|").map((part) => part.trim())).filter(([name]) => name).map(([name, price = ""]) => ({ name, price }));
const formatServices = (list: { name: string; price: string }[]) => list.map((item) => `${item.name} | ${item.price}`).join("\n");

export function Freelancers({ freelancerId }: { freelancerId?: string }) {
  const { state, go } = useStore();
  const selected = state.freelancers.find((person) => person.id === freelancerId);
  if (selected) return <FreelancerProfile person={selected} />;
  const active = state.freelancers.filter((person) => person.status !== "Offboarded");
  return (
    <Shell title="Freelancers" sub="Nobody is assigned to a client before their NDA and contract are signed.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {active.map((person) => {
          const p = progress(person.checklist);
          const ok = canBeAssigned(person);
          const accounts = state.clients.filter((client) => client.freelancerId === person.id);
          const desk = state.posts.filter((post) => post.date.startsWith(state.month) && turnOf(state, post).who === person.id).length;
          return (
            <button key={person.id} onClick={() => go({ view: "freelancers", freelancerId: person.id })} className="group min-w-0 overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white text-left transition hover:border-[#D2CCC2] hover:shadow-[0_8px_24px_rgba(30,36,48,.07)]">
              <div className="flex items-center gap-3 p-4" style={{ background: `${person.color}12` }}>
                <Avatar name={person.name} color={person.color} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-bold">{person.name}</div>
                  <div className="truncate text-[12px] text-[#6B6760]">{person.speciality}</div>
                </div>
                <Chip t={person.status === "Active" ? "green" : "blue"}>{person.status}</Chip>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: ok ? tone.green.ink : tone.red.ink }}>
                  {ok ? <ShieldCheck size={16} /> : <ShieldX size={16} />}{ok ? "Ready to work" : "NDA or contract missing"}
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[12px] font-semibold text-[#55514B]"><span>Setup</span><span>{p.complete}/{p.total}</span></div>
                  <Bar value={p.percent} color={p.percent === 100 ? tone.green.dot : "#2F6FDB"} />
                </div>
                <div className="flex min-h-[28px] flex-wrap gap-1.5">
                  {accounts.map((client) => <span key={client.id} className="flex items-center gap-1.5 rounded-full border border-[#ECE9E3] py-0.5 pl-0.5 pr-2.5 text-[12px] font-semibold"><ClientMark client={client} size={20} />{client.name}</span>)}
                  {accounts.length === 0 && <span className="text-[12px] text-[#8B867E]">No accounts yet</span>}
                </div>
                <div className="flex justify-between border-t border-[#F0EEE9] pt-3 text-[12px] font-semibold text-[#6B6760]"><span>{accounts.length} of {person.capacity} accounts</span><span className={desk ? "text-[#1F5BC4]" : ""}>{desk} posts on their desk</span></div>
              </div>
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

function FreelancerProfile({ person }: { person: Freelancer }) {
  const store = useStore();
  const { state, go } = store;
  const owner = isOwner(state);
  const ok = canBeAssigned(person);
  const accounts = state.clients.filter((client) => client.freelancerId === person.id);
  const set = (patch: Partial<Freelancer>) => store.updateFreelancer(person.id, patch);
  const services = parseServices(person.services);
  const [service, setService] = useState({ name: "", price: "" });
  const open = missing(person.checklist);

  return (
    <Shell title={person.name} sub={person.speciality} actions={<Button kind="ghost" onClick={() => go({ view: "freelancers" })}><ArrowLeft size={15} />All freelancers</Button>}>
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl p-5" style={{ background: `linear-gradient(120deg, ${person.color}22, #ffffff)` }}>
        <Avatar name={person.name} color={person.color} size={64} />
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2"><Chip t={person.status === "Active" ? "green" : "blue"}>{person.status}</Chip><Chip t={ok ? "green" : "red"}>{ok ? <><ShieldCheck size={12} />NDA and contract signed</> : <><ShieldX size={12} />Cannot be assigned yet</>}</Chip></div>
          <div className="mt-2 text-[13px] text-[#55514B]">{person.email}{owner && person.rate ? ` · ${person.rate}` : ""}{owner && person.paymentMethod ? ` · paid by ${person.paymentMethod}` : ""}</div>
        </div>
        <div className="text-right"><div className="text-[26px] font-extrabold">{accounts.length}<span className="text-[15px] text-[#8B867E]">/{person.capacity}</span></div><div className="text-[12px] font-semibold text-[#6B6760]">accounts</div></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold">Setup checklist</h2>
            <span className={`text-[13px] font-semibold ${open.length ? "text-[#94600A]" : "text-[#17804A]"}`}>{open.length ? `${open.length} still to do` : <><Check size={14} className="inline" /> All done</>}</span>
          </div>
          <PhaseChecklist items={person.checklist} onToggle={(id) => store.toggleFreelancerCheck(person.id, id)} onUpdate={(id, patch) => store.updateFreelancerCheck(person.id, id, patch)} />
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHead title="Accounts" sub="Assign from the client's Overview." />
            {accounts.length === 0 ? <p className="text-[13px] text-[#8B867E]">{ok ? "No accounts yet." : "Sign the NDA and contract before assigning a client."}</p> : (
              <ul className="space-y-2">
                {accounts.map((client) => {
                  const desk = state.posts.filter((post) => post.clientId === client.id && turnOf(state, post).who === person.id).length;
                  return (
                    <li key={client.id}>
                      <button onClick={() => go({ view: "marketing", clientId: client.id })} className="flex w-full items-center gap-3 rounded-xl border border-[#F0EEE9] px-3 py-2.5 text-left hover:bg-[#FBFAF8]">
                        <ClientMark client={client} size={32} />
                        <span className="flex-1"><span className="block text-[14px] font-bold">{client.name}</span><span className="text-[12px] text-[#8B867E]">{client.package} · {client.agreedPosts} posts a month</span></span>
                        {desk > 0 && <Chip t="blue">{desk} to do</Chip>}
                        <ArrowRight size={14} className="text-[#B5B0A8]" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHead title="Services and prices" />
            <ul className="space-y-1.5">
              {services.map((item, index) => (
                <li key={index} className="flex items-center gap-2 rounded-xl bg-[#F8F7F4] px-3 py-2 text-[13px]">
                  <span className="flex-1 font-semibold">{item.name}</span>
                  {owner && <span className="font-bold">{item.price}</span>}
                  <button onClick={() => set({ services: formatServices(services.filter((_, i) => i !== index)) })} aria-label={`Remove ${item.name}`} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>
                </li>
              ))}
              {services.length === 0 && <li className="text-[13px] text-[#8B867E]">No services listed yet.</li>}
            </ul>
            <form onSubmit={(event) => { event.preventDefault(); if (!service.name.trim()) return; set({ services: formatServices([...services, { name: service.name.trim(), price: service.price.trim() }]) }); setService({ name: "", price: "" }); }} className="mt-3 flex gap-2">
              <input value={service.name} onChange={(event) => setService({ ...service, name: event.target.value })} placeholder="Carousel design" aria-label="Service" className="min-w-0 flex-1 rounded-xl border border-[#E2DED7] px-3 py-2 text-[13px]" />
              {owner && <input value={service.price} onChange={(event) => setService({ ...service, price: event.target.value })} placeholder="$40 each" aria-label="Price" className="w-28 rounded-xl border border-[#E2DED7] px-3 py-2 text-[13px]" />}
              <Button type="submit" size="sm"><Plus size={13} /></Button>
            </form>
          </Card>

          <Card>
            <CardHead title="Details" />
            <div className="grid gap-3">
              <Field label="Speciality"><input value={person.speciality} onChange={(event) => set({ speciality: event.target.value, title: event.target.value })} className={fieldClass} /></Field>
              <Field label="Email (for notifications)"><input value={person.email} onChange={(event) => set({ email: event.target.value })} className={fieldClass} /></Field>
              {owner && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rate"><input value={person.rate} onChange={(event) => set({ rate: event.target.value })} className={fieldClass} /></Field>
                  <Field label="Paid by"><input value={person.paymentMethod} onChange={(event) => set({ paymentMethod: event.target.value })} className={fieldClass} placeholder="Revolut, bank…" /></Field>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Capacity (accounts)"><input type="number" min={0} value={person.capacity} onChange={(event) => set({ capacity: Number(event.target.value) })} className={fieldClass} /></Field>
                <Field label="Status"><select value={person.status} onChange={(event) => set({ status: event.target.value as Freelancer["status"] })} className={fieldClass}><option>Trial</option><option>Active</option><option>Offboarded</option></select></Field>
              </div>
              <Field label="Portfolio"><input value={person.portfolio} onChange={(event) => set({ portfolio: event.target.value })} className={fieldClass} placeholder="https://…" /></Field>
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
