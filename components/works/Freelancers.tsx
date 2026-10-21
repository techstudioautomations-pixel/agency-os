"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Plus, Search, ShieldCheck, ShieldX, Trash2, UserPlus, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { canBeAssigned, isHired, isOwner, missing, money, progress, shortDate, todayIso, turnOf } from "@/lib/works/logic";
import type { Freelancer } from "@/lib/works/types";
import { Shell } from "./Shell";
import { PhaseChecklist } from "./Checklist";
import { Avatar, Bar, Button, Card, CardHead, Chip, ClientMark, Empty, Field, Segmented, fieldClass, tone } from "./kit";

/** Services are stored one per line as "Service | price". */
const parseServices = (text: string) => text.split("\n").map((line) => line.split("|").map((part) => part.trim())).filter(([name]) => name).map(([name, price = ""]) => ({ name, price }));
const formatServices = (list: { name: string; price: string }[]) => list.map((item) => `${item.name} | ${item.price}`).join("\n");

const platforms = ["Fiverr", "Upwork", "Direct", "Other"];
const platformColor: Record<string, string> = { Fiverr: "#1DBF73", Upwork: "#14A800", Direct: "#2F6FDB", Other: "#8B867E" };
const statusChip = (status: Freelancer["status"]) => (status === "Active" ? { t: "green" as const, label: "Active" } : status === "Trial" ? { t: "blue" as const, label: "Trial" } : status === "Offboarded" ? { t: "amber" as const, label: "Past" } : { t: "grey" as const, label: "Not hired" });
const total = (person: Freelancer) => person.jobs.reduce((sum, job) => sum + (Number(job.amount) || 0), 0);

function PlatformTag({ name }: { name: string }) {
  if (!name) return null;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F0ED] px-2.5 py-0.5 text-[12px] font-bold text-[#3D4450]"><span className="h-2 w-2 rounded-full" style={{ background: platformColor[name] ?? platformColor.Other }} />{name}</span>;
}

export function Freelancers({ freelancerId }: { freelancerId?: string }) {
  const { state, go } = useStore();
  const selected = state.freelancers.find((person) => person.id === freelancerId);
  const [view, setView] = useState<"team" | "directory">("team");
  const [adding, setAdding] = useState(false);
  if (selected) return <FreelancerProfile person={selected} />;
  const team = state.freelancers.filter(isHired);
  return (
    <Shell
      title="Freelancers"
      sub="Our team, and a directory of everyone we know or have worked with. Nobody is assigned to a client before their NDA and contract are signed."
      actions={<Button kind="primary" onClick={() => setAdding(true)}><UserPlus size={15} />Add freelancer</Button>}
    >
      <div className="mb-5">
        <Segmented value={view} onChange={setView} options={[{ value: "team", label: "Our team", count: team.length }, { value: "directory", label: "Directory", count: state.freelancers.length }]} />
      </div>
      {view === "team" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {team.map((person) => {
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: ok ? tone.green.ink : tone.red.ink }}>
                      {ok ? <ShieldCheck size={16} /> : <ShieldX size={16} />}{ok ? "Ready to work" : "NDA or contract missing"}
                    </div>
                    <PlatformTag name={person.platform} />
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
      ) : (
        <Directory />
      )}
      {adding && <AddFreelancer onClose={() => setAdding(false)} />}
    </Shell>
  );
}

/** Everyone: the team, past freelancers and people we only know about. Search by name, skill or service. */
function Directory() {
  const { state, go } = useStore();
  const owner = isOwner(state);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("");
  const [group, setGroup] = useState("");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const list = state.freelancers
    .filter((person) => !platform || person.platform === platform)
    .filter((person) => !group || (group === "hired" ? isHired(person) : group === "past" ? person.status === "Offboarded" : person.status === "Directory"))
    .filter((person) => { const text = [person.name, person.speciality, person.services, person.notes, person.platform, person.jobs.map((job) => job.what).join(" ")].join(" ").toLowerCase(); return words.every((word) => text.includes(word)); });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B867E]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, skill or service" aria-label="Search the directory" className="w-full rounded-xl border border-[#E2DED7] bg-white py-2.5 pl-9 pr-3 text-[14px] outline-none focus:border-[#2F6FDB]" />
        </label>
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Platform" className="rounded-xl border border-[#E2DED7] bg-white px-3 py-2.5 text-[14px] font-semibold"><option value="">All platforms</option>{platforms.map((name) => <option key={name}>{name}</option>)}</select>
        <select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Who" className="rounded-xl border border-[#E2DED7] bg-white px-3 py-2.5 text-[14px] font-semibold"><option value="">Everyone</option><option value="hired">Hired now</option><option value="past">Worked for us before</option><option value="directory">Not hired yet</option></select>
      </div>
      {list.length === 0 ? <Empty title="Nobody matches">Try a different word, or add them with Add freelancer.</Empty> : (
        <ul className="space-y-2.5">
          {list.map((person) => {
            const status = statusChip(person.status);
            const services = parseServices(person.services);
            const sum = total(person);
            return (
              <li key={person.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[#E9E6E0] bg-white p-4">
                <button onClick={() => go({ view: "freelancers", freelancerId: person.id })} className="flex min-w-[220px] flex-1 items-center gap-3 text-left">
                  <Avatar name={person.name} color={person.color} size={42} />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold hover:text-[#1F5BC4]">{person.name}</span>
                    <span className="block truncate text-[12px] text-[#6B6760]">{person.speciality || "No speciality yet"}</span>
                  </span>
                </button>
                <div className="flex min-w-[150px] flex-col items-start gap-1"><PlatformTag name={person.platform} /><span className="truncate text-[12px] text-[#6B6760]">{person.email}</span></div>
                <div className="min-w-[200px] flex-1 text-[12px] text-[#55514B]">
                  {services.slice(0, 2).map((item) => <div key={item.name} className="truncate">{item.name}{owner && item.price ? <b> · {item.price}</b> : ""}</div>)}
                  {services.length > 2 && <div className="text-[#8B867E]">+{services.length - 2} more</div>}
                  {services.length === 0 && <span className="text-[#8B867E]">No services listed</span>}
                </div>
                <div className="min-w-[110px] text-[12px] text-[#55514B]">{person.jobs.length ? <><b className="text-[13px]">{person.jobs.length}</b> job{person.jobs.length === 1 ? "" : "s"} for us{owner && sum > 0 ? <div className="font-bold">{money(sum, person.currency)}</div> : null}</> : <span className="text-[#8B867E]">No work yet</span>}</div>
                <div className="flex items-center gap-2">
                  <Chip t={status.t}>{status.label}</Chip>
                  {person.profileUrl && <a href={person.profileUrl} target="_blank" rel="noreferrer" aria-label={`${person.name} on ${person.platform || "their profile"}`} title="Open their profile" className="rounded-lg p-1.5 text-[#1F5BC4] hover:bg-[#EEF2FA]"><ExternalLink size={15} /></a>}
                  <button onClick={() => go({ view: "freelancers", freelancerId: person.id })} aria-label={`Open ${person.name}`} className="rounded-lg p-1.5 text-[#B5B0A8] hover:bg-[#F1F0ED]"><ArrowRight size={15} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AddFreelancer({ onClose }: { onClose: () => void }) {
  const { addFreelancer, go } = useStore();
  const [draft, setDraft] = useState({ name: "", platform: "Fiverr", profileUrl: "", email: "", speciality: "" });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const id = addFreelancer({ ...draft, name: draft.name.trim() });
    onClose();
    go({ view: "freelancers", freelancerId: id });
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <form onSubmit={submit} role="dialog" aria-label="Add freelancer" className="relative w-full max-w-[460px] space-y-3 rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex-1"><h2 className="text-[18px] font-extrabold">Add to the directory</h2><p className="text-[13px] text-[#6B6760]">Just the basics. You can add services, prices and past work on their page.</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[#6B6760] hover:bg-[#F1F0ED]"><X size={18} /></button>
        </div>
        <Field label="Name"><input autoFocus required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={fieldClass} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Found on"><select value={draft.platform} onChange={(event) => setDraft({ ...draft, platform: event.target.value })} className={fieldClass}>{platforms.map((name) => <option key={name}>{name}</option>)}</select></Field>
          <Field label="What they do"><input value={draft.speciality} onChange={(event) => setDraft({ ...draft, speciality: event.target.value })} placeholder="Reels, copy…" className={fieldClass} /></Field>
        </div>
        <Field label="Profile link"><input value={draft.profileUrl} onChange={(event) => setDraft({ ...draft, profileUrl: event.target.value })} placeholder="https://www.fiverr.com/…" className={fieldClass} /></Field>
        <Field label="Email"><input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={fieldClass} /></Field>
        <div className="flex justify-end gap-2 pt-1"><Button type="button" onClick={onClose}>Cancel</Button><Button kind="primary" type="submit"><Plus size={14} />Add</Button></div>
      </form>
    </div>
  );
}

function FreelancerProfile({ person }: { person: Freelancer }) {
  const store = useStore();
  const { state, go } = store;
  const owner = isOwner(state);
  const ok = canBeAssigned(person);
  const hired = isHired(person);
  const accounts = state.clients.filter((client) => client.freelancerId === person.id);
  const set = (patch: Partial<Freelancer>) => store.updateFreelancer(person.id, patch);
  const services = parseServices(person.services);
  const [service, setService] = useState({ name: "", price: "" });
  const open = missing(person.checklist);
  const status = statusChip(person.status);
  const sum = total(person);

  return (
    <Shell title={person.name} sub={person.speciality || "Not in a role yet"} actions={<Button kind="ghost" onClick={() => go({ view: "freelancers" })}><ArrowLeft size={15} />All freelancers</Button>}>
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl p-5" style={{ background: `linear-gradient(120deg, ${person.color}22, #ffffff)` }}>
        <Avatar name={person.name} color={person.color} size={64} />
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Chip t={status.t}>{status.label}</Chip>
            <PlatformTag name={person.platform} />
            {hired && <Chip t={ok ? "green" : "red"}>{ok ? <><ShieldCheck size={12} />NDA and contract signed</> : <><ShieldX size={12} />Cannot be assigned yet</>}</Chip>}
          </div>
          <div className="mt-2 text-[13px] text-[#55514B]">{[person.email, person.phone, owner && person.rate ? person.rate : "", owner && person.paymentMethod ? `paid by ${person.paymentMethod}` : ""].filter(Boolean).join(" · ") || "No contact yet"}</div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold">
            {person.profileUrl && <a href={person.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1F5BC4] hover:underline"><ExternalLink size={13} />{person.platform ? `${person.platform} profile` : "Profile"}</a>}
            {person.portfolio && <a href={person.portfolio} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1F5BC4] hover:underline"><ExternalLink size={13} />Portfolio</a>}
          </div>
        </div>
        {hired && <div className="text-right"><div className="text-[26px] font-extrabold">{accounts.length}<span className="text-[15px] text-[#8B867E]">/{person.capacity}</span></div><div className="text-[12px] font-semibold text-[#6B6760]">accounts</div></div>}
      </div>

      {!hired && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E9E6E0] bg-white p-4">
          <div className="min-w-[220px] flex-1 text-[13px] text-[#55514B]">
            <b className="text-[14px] text-[#1E2430]">{person.status === "Offboarded" ? "Worked for us before." : "In the directory, not hired."}</b> {person.status === "Offboarded" ? "Their past work is below." : "Starting a trial opens the NDA and contract checklist, and lets you assign them to a client once those are signed."}
          </div>
          <Button kind="primary" onClick={() => set({ status: "Trial" })}>{person.status === "Offboarded" ? "Hire again (trial)" : "Start trial"}</Button>
          {person.status === "Directory" && accounts.length === 0 && <Button onClick={() => { store.deleteFreelancer(person.id); go({ view: "freelancers" }); }}><Trash2 size={14} />Remove</Button>}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="min-w-0 space-y-5">
          <WorkForUs person={person} sum={sum} />
          {hired && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-extrabold">Setup checklist</h2>
                <span className={`text-[13px] font-semibold ${open.length ? "text-[#94600A]" : "text-[#17804A]"}`}>{open.length ? `${open.length} still to do` : <><Check size={14} className="inline" /> All done</>}</span>
              </div>
              <PhaseChecklist items={person.checklist} onToggle={(id) => store.toggleFreelancerCheck(person.id, id)} onUpdate={(id, patch) => store.updateFreelancerCheck(person.id, id, patch)} />
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          {hired && (
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
          )}

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
              <div className="grid grid-cols-2 gap-3">
                <Field label="Found on"><select value={person.platform} onChange={(event) => set({ platform: event.target.value })} className={fieldClass}><option value="">Not set</option>{platforms.map((name) => <option key={name}>{name}</option>)}</select></Field>
                <Field label="Phone or WhatsApp"><input value={person.phone} onChange={(event) => set({ phone: event.target.value })} className={fieldClass} /></Field>
              </div>
              <Field label="Profile link (Fiverr, Upwork…)"><input value={person.profileUrl} onChange={(event) => set({ profileUrl: event.target.value })} className={fieldClass} placeholder="https://…" /></Field>
              <Field label="Portfolio"><input value={person.portfolio} onChange={(event) => set({ portfolio: event.target.value })} className={fieldClass} placeholder="https://…" /></Field>
              <Field label="Email (for notifications)"><input value={person.email} onChange={(event) => set({ email: event.target.value })} className={fieldClass} /></Field>
              {owner && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rate"><input value={person.rate} onChange={(event) => set({ rate: event.target.value })} className={fieldClass} /></Field>
                  <Field label="Paid by"><input value={person.paymentMethod} onChange={(event) => set({ paymentMethod: event.target.value })} className={fieldClass} placeholder="Revolut, bank…" /></Field>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Capacity (accounts)"><input type="number" min={0} value={person.capacity} onChange={(event) => set({ capacity: Number(event.target.value) })} className={fieldClass} /></Field>
                <Field label="Status"><select value={person.status} onChange={(event) => set({ status: event.target.value as Freelancer["status"] })} className={fieldClass}><option value="Directory">Not hired</option><option value="Trial">Trial</option><option value="Active">Active</option><option value="Offboarded">Past</option></select></Field>
              </div>
              <Field label="Notes"><textarea value={person.notes} onChange={(event) => set({ notes: event.target.value })} rows={3} className={fieldClass} placeholder="How good they were, how fast, anything to remember" /></Field>
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}

/** What this person did for us and what it cost, so we can come back to it. */
function WorkForUs({ person, sum }: { person: Freelancer; sum: number }) {
  const store = useStore();
  const { state } = store;
  const owner = isOwner(state);
  const [job, setJob] = useState({ what: "", clientId: "", amount: "", date: todayIso(), link: "" });
  const jobs = [...person.jobs].sort((a, b) => b.date.localeCompare(a.date));
  const clientName = (item: Freelancer["jobs"][number]) => state.clients.find((client) => client.id === item.clientId)?.name ?? item.client ?? "The Works";
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    if (!job.what.trim()) return;
    store.updateFreelancer(person.id, { jobs: [{ id: `job-${Date.now().toString(36)}`, date: job.date || todayIso(), clientId: job.clientId || undefined, client: job.clientId ? undefined : "The Works", what: job.what.trim(), amount: Number(job.amount) || 0, link: job.link.trim() || undefined }, ...person.jobs] });
    setJob({ what: "", clientId: "", amount: "", date: todayIso(), link: "" });
  };
  return (
    <Card>
      <CardHead title="Work for us" sub={person.jobs.length ? `${person.jobs.length} job${person.jobs.length === 1 ? "" : "s"}${owner && sum > 0 ? ` · ${money(sum, person.currency)} in total` : ""}` : "Nothing logged yet. Add each job so we can find it again."} />
      {jobs.length > 0 && (
        <ul className="mb-4 divide-y divide-[#F3F1ED] rounded-xl border border-[#F0EEE9]">
          {jobs.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 text-[13px]">
              <span className="w-14 shrink-0 text-[12px] font-semibold text-[#8B867E]">{shortDate(item.date)}</span>
              <span className="min-w-[160px] flex-1"><b className="block text-[14px]">{item.what}</b><span className="text-[12px] text-[#6B6760]">{clientName(item)}</span></span>
              {owner && item.amount > 0 && <b>{money(item.amount, person.currency)}</b>}
              {item.link && <a href={item.link} target="_blank" rel="noreferrer" aria-label={`Open ${item.what}`} className="text-[#1F5BC4]"><ExternalLink size={14} /></a>}
              <button onClick={() => store.updateFreelancer(person.id, { jobs: person.jobs.filter((entry) => entry.id !== item.id) })} aria-label={`Remove ${item.what}`} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="space-y-2.5 rounded-xl bg-[#F8F7F4] p-3.5">
        <div className="text-[12px] font-bold text-[#55514B]">Add a job</div>
        <input value={job.what} onChange={(event) => setJob({ ...job, what: event.target.value })} placeholder="What they did, for example 3 LinkedIn carousels" aria-label="What they did" className="w-full rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[13px]" />
        <div className="flex flex-wrap gap-2">
          <select value={job.clientId} onChange={(event) => setJob({ ...job, clientId: event.target.value })} aria-label="For which client" className="min-w-[150px] flex-1 rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[13px]"><option value="">The Works (not a client)</option>{state.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
          <input type="date" value={job.date} onChange={(event) => setJob({ ...job, date: event.target.value })} aria-label="Date" className="rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[13px]" />
          {owner && <input value={job.amount} inputMode="decimal" onChange={(event) => setJob({ ...job, amount: event.target.value })} placeholder={`Charged (${person.currency})`} aria-label="How much they charged" className="w-32 rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[13px]" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={job.link} onChange={(event) => setJob({ ...job, link: event.target.value })} placeholder="Link to the work (optional)" aria-label="Link to the work" className="min-w-[200px] flex-1 rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[13px]" />
          <Button type="submit" kind="primary" size="sm"><Plus size={13} />Add job</Button>
        </div>
      </form>
    </Card>
  );
}
