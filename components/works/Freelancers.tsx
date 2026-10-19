"use client";

import { ArrowLeft, ShieldCheck, ShieldX } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { canBeAssigned, isOwner, progress, turnOf } from "@/lib/works/logic";
import type { Freelancer } from "@/lib/works/types";
import { Shell } from "./Shell";
import { ChecklistView, GateBanner } from "./Checklist";
import { Avatar, Bar, Card, CardHead, Chip, ClientMark, Field, fieldClass, tone } from "./kit";

export function Freelancers({ freelancerId }: { freelancerId?: string }) {
  const { state, go } = useStore();
  const selected = state.freelancers.find((person) => person.id === freelancerId);
  if (selected) return <FreelancerProfile person={selected} />;
  const active = state.freelancers.filter((person) => person.status !== "Offboarded");
  return (
    <Shell title="Freelancers" sub={`${active.filter((p) => p.status === "Active").length} active · ${active.filter((p) => p.status === "Trial").length} on trial. Nobody is assigned to a client before the NDA and contract are signed.`}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active.map((person) => {
          const p = progress(person.checklist);
          const ok = canBeAssigned(person);
          const accounts = state.clients.filter((client) => client.freelancerId === person.id);
          const desk = state.posts.filter((post) => turnOf(state, post).who === person.id).length;
          return (
            <button key={person.id} onClick={() => go({ view: "freelancers", freelancerId: person.id })} className="min-w-0 rounded-2xl border border-[#E9E6E0] bg-white p-5 text-left transition hover:border-[#D2CCC2] hover:shadow-[0_8px_24px_rgba(30,36,48,.06)]">
              <div className="flex items-center gap-3">
                <Avatar name={person.name} color={person.color} size={44} />
                <div className="min-w-0 flex-1"><div className="truncate text-[16px] font-bold">{person.name}</div><div className="truncate text-[12px] text-[#8B867E]">{person.speciality}</div></div>
                <Chip t={person.status === "Active" ? "green" : "blue"}>{person.status}</Chip>
              </div>
              <div className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold`} style={{ background: ok ? tone.green.bg : tone.red.bg, color: ok ? tone.green.ink : tone.red.ink }}>
                {ok ? <ShieldCheck size={15} /> : <ShieldX size={15} />}{ok ? "NDA and contract signed" : "Cannot be assigned yet"}
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[12px] font-semibold text-[#55514B]"><span>Setup checklist</span><span>{p.complete}/{p.total}</span></div>
                <Bar value={p.percent} color={p.percent === 100 ? tone.green.dot : "#2F6FDB"} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {accounts.map((client) => <span key={client.id} className="flex items-center gap-1.5 rounded-lg bg-[#F6F5F2] px-2 py-1 text-[12px] font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: client.color }} />{client.name}</span>)}
              </div>
              <div className="mt-3 flex justify-between border-t border-[#F0EEE9] pt-3 text-[12px] text-[#6B6760]"><span>{accounts.length} of {person.capacity} accounts</span><span>{desk} posts on their desk</span></div>
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
  const accounts = state.clients.filter((client) => client.freelancerId === person.id);
  const set = (patch: Partial<Freelancer>) => store.updateFreelancer(person.id, patch);
  return (
    <Shell title={<span className="flex items-center gap-3"><Avatar name={person.name} color={person.color} size={44} />{person.name}</span>} sub={`${person.speciality} · ${person.status}`}>
      <button onClick={() => go({ view: "freelancers" })} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6B6760]"><ArrowLeft size={15} />All freelancers</button>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="min-w-0 space-y-4">
          <GateBanner items={person.checklist} readyText="Fully set up" what="freelancer" />
          {!canBeAssigned(person) && <div className="rounded-xl bg-[#FDECEC] px-4 py-3 text-[13px] font-semibold text-[#B83232]">Gate: {person.name} cannot be assigned to a client until the NDA and the contract are marked Done.</div>}
          <ChecklistView items={person.checklist} onChange={(id, patch) => store.updateFreelancerCheck(person.id, id, patch)} />
        </div>
        <div className="space-y-5">
          <Card>
            <CardHead title="Details" />
            <div className="grid gap-3">
              <Field label="Speciality"><input value={person.speciality} onChange={(event) => set({ speciality: event.target.value, title: event.target.value })} className={fieldClass} /></Field>
              <Field label="Email (for notifications)"><input value={person.email} onChange={(event) => set({ email: event.target.value })} className={fieldClass} /></Field>
              {owner && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rate"><input value={person.rate} onChange={(event) => set({ rate: event.target.value })} className={fieldClass} /></Field>
                  <Field label="Payment method"><input value={person.paymentMethod} onChange={(event) => set({ paymentMethod: event.target.value })} className={fieldClass} placeholder="Revolut, bank…" /></Field>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Capacity (accounts)"><input type="number" min={0} value={person.capacity} onChange={(event) => set({ capacity: Number(event.target.value) })} className={fieldClass} /></Field>
                <Field label="Status"><select value={person.status} onChange={(event) => set({ status: event.target.value as Freelancer["status"] })} className={fieldClass}><option>Trial</option><option>Active</option><option>Offboarded</option></select></Field>
              </div>
              <Field label="Portfolio"><input value={person.portfolio} onChange={(event) => set({ portfolio: event.target.value })} className={fieldClass} placeholder="https://…" /></Field>
            </div>
          </Card>
          <Card>
            <CardHead title="Accounts" sub="Assign from the client's Overview." />
            {accounts.length === 0 ? <p className="text-[13px] text-[#8B867E]">No accounts yet.</p> : (
              <ul className="space-y-2">
                {accounts.map((client) => (
                  <li key={client.id}><button onClick={() => go({ view: "client", clientId: client.id })} className="flex w-full items-center gap-2.5 rounded-xl bg-[#F8F7F4] px-3 py-2.5 text-left text-[13px] font-semibold hover:bg-[#F1F0ED]"><ClientMark client={client} size={26} />{client.name}<span className="ml-auto text-[12px] text-[#8B867E]">{state.posts.filter((post) => post.clientId === client.id && turnOf(state, post).who === person.id).length} on desk</span></button></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </Shell>
  );
}
