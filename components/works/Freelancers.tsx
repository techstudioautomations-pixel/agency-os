"use client";

import { useState } from "react";
import { ArrowRight, ExternalLink, FolderOpen, Plus, Search, ShieldCheck, ShieldX, UserPlus, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { isExpert, worksOn, canBeAssigned, currencies, isFreelancer, isHired, isOnTeam, isOwner, money, payChannels, serviceList, setupProgress, specialityOptions, todayIso, turnOf } from "@/lib/works/logic";
import type { Freelancer } from "@/lib/works/types";
import { Shell } from "./Shell";
import { FreelancerProfile } from "./FreelancerProfile";
import { ExpertProfile, Experts } from "./Experts";
import { AvailabilityDot } from "./Availability";
import { PlatformTag, jobsTotal, platforms, priceOf, statusChip } from "./FreelancerBits";
import { Avatar, Bar, Button, Chip, ClientMark, Empty, Field, Segmented, fieldClass, tone } from "./kit";

export function Freelancers({ freelancerId }: { freelancerId?: string }) {
  const { state, go } = useStore();
  // A freelancer sees only their own profile. The team sees everyone.
  const expertSelected = isExpert(state) ? state.experts.find((person) => person.id === state.me) : !isFreelancer(state) ? state.experts.find((person) => person.id === freelancerId) : undefined;
  const selected = isFreelancer(state) ? state.freelancers.find((person) => person.id === state.me) : state.freelancers.find((person) => person.id === freelancerId);
  const [view, setView] = useState<"team" | "experts" | "directory">("team");
  const [adding, setAdding] = useState(false);
  if (expertSelected) return <ExpertProfile expert={expertSelected} />;
  if (selected) return <FreelancerProfile person={selected} />;
  const team = state.freelancers.filter(isOnTeam);
  return (
    <Shell
      title="Freelancers"
      sub="Our team, and a directory of everyone we know or have worked with. Nobody is assigned to a client before their NDA and contract are signed."
      actions={<Button kind="primary" onClick={() => setAdding(true)}><UserPlus size={15} />Add freelancer</Button>}
    >
      <div className="mb-5">
        <Segmented value={view} onChange={setView} options={[{ value: "team", label: "Our team", count: team.length }, { value: "experts", label: "Experts", count: state.experts.length }, { value: "directory", label: "Directory", count: state.freelancers.length }]} />
      </div>
      {view === "team" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {team.map((person) => {
            const p = setupProgress(state, person);
            const ok = canBeAssigned(state, person);
            const accounts = state.clients.filter((client) => worksOn(client, person.id));
            const desk = state.posts.filter((post) => post.date.startsWith(state.month) && turnOf(state, post).who === person.id).length;
            return (
              <button key={person.id} onClick={() => go({ view: "freelancers", freelancerId: person.id })} className="group min-w-0 overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white text-left transition hover:border-[#D2CCC2] hover:shadow-[0_8px_24px_rgba(30,36,48,.07)]">
                <div className="flex items-center gap-3 p-4" style={{ background: `${person.color}12` }}>
                  <Avatar name={person.name} color={person.color} photo={person.photo} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 truncate text-[16px] font-bold">{person.name}<AvailabilityDot person={person} size={9} /></div>
                    <div className="truncate text-[12px] text-[#6B6760]">{person.speciality}</div>
                  </div>
                  <Chip t={statusChip(person.status).t}>{statusChip(person.status).label}</Chip>
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
      ) : view === "experts" ? (
        <Experts />
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
    .filter((person) => !group || (group === "hired" ? isOnTeam(person) : group === "past" ? person.status === "Offboarded" : person.status === "Directory"))
    .filter((person) => { const text = [person.name, person.speciality, person.services, person.notes, person.platform, person.jobs.map((job) => job.what).join(" ")].join(" ").toLowerCase(); return words.every((word) => text.includes(word)); });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B867E]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, skill or service" aria-label="Search the directory" className="w-full rounded-xl border border-[#E2DED7] bg-white py-2.5 pl-9 pr-3 text-[14px] outline-none focus:border-[#2F6FDB]" />
        </label>
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Platform" className="rounded-xl border border-[#E2DED7] bg-white px-3 py-2.5 text-[14px] font-semibold"><option value="">All platforms</option>{platforms.map((name) => <option key={name}>{name}</option>)}</select>
        <select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Who" className="rounded-xl border border-[#E2DED7] bg-white px-3 py-2.5 text-[14px] font-semibold"><option value="">Everyone</option><option value="hired">On the team</option><option value="past">Worked for us before</option><option value="directory">Not hired yet</option></select>
      </div>
      {list.length === 0 ? <Empty title="Nobody matches">Try a different word, or add them with Add freelancer.</Empty> : (
        <ul className="space-y-2.5">
          {list.map((person) => {
            const status = statusChip(person.status);
            const services = serviceList(person.services);
            const sum = jobsTotal(person);
            return (
              <li key={person.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[#E9E6E0] bg-white p-4">
                <button onClick={() => go({ view: "freelancers", freelancerId: person.id })} className="flex min-w-[220px] flex-1 items-center gap-3 text-left">
                  <Avatar name={person.name} color={person.color} photo={person.photo} size={42} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 truncate text-[15px] font-bold hover:text-[#1F5BC4]">{person.name}<AvailabilityDot person={person} size={9} /></span>
                    <span className="block truncate text-[12px] text-[#6B6760]">{person.speciality || "No speciality yet"}</span>
                  </span>
                </button>
                <div className="flex min-w-[150px] flex-col items-start gap-1"><PlatformTag name={person.platform} /><span className="truncate text-[12px] text-[#6B6760]">{person.email}</span></div>
                <div className="min-w-[200px] flex-1 text-[12px] text-[#55514B]">
                  {services.slice(0, 2).map((item) => <div key={item.name} className="truncate">{item.name}{owner && item.price ? <b> · {priceOf(item)}</b> : ""}</div>)}
                  {services.length > 2 && <div className="text-[#8B867E]">+{services.length - 2} more</div>}
                  {services.length === 0 && <span className="text-[#8B867E]">No services listed</span>}
                </div>
                <div className="min-w-[110px] text-[12px] text-[#55514B]">{person.jobs.length ? <><b className="text-[13px]">{person.jobs.length}</b> job{person.jobs.length === 1 ? "" : "s"} for us{owner && sum > 0 ? <div className="font-bold">{money(sum, person.currency)}</div> : null}</> : <span className="text-[#8B867E]">No work yet</span>}</div>
                <div className="flex items-center gap-2">
                  <Chip t={status.t}>{status.label}</Chip>
                  {person.driveUrl && <a href={person.driveUrl} target="_blank" rel="noreferrer" aria-label={`Drive folder of ${person.name}`} title="Open their Drive folder" className="rounded-lg p-1.5 text-[#1F5BC4] hover:bg-[#EEF2FA]"><FolderOpen size={15} /></a>}
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
  const [draft, setDraft] = useState({ name: "", platform: "Fiverr", profileUrl: "", driveUrl: "", email: "" });
  const [onlyThere, setOnlyThere] = useState(false);
  const [specialities, setSpecialities] = useState<string[]>([]);
  const [pay, setPay] = useState({ what: "", amount: "", currency: "USD", channel: payChannels[0], frequency: "monthly" as "monthly" | "one-time", date: todayIso() });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const amount = Number(pay.amount);
    const id = addFreelancer({ ...draft, reachVia: onlyThere && ["Fiverr", "Upwork"].includes(draft.platform) ? draft.platform : "App", name: draft.name.trim(), specialities, fee: amount > 0 ? { what: pay.what.trim(), kind: "standard", amount, currency: pay.currency, channel: pay.channel, frequency: pay.frequency, date: pay.date || todayIso(), custom: pay.what.trim() ? undefined : undefined } : undefined });
    onClose();
    go({ view: "freelancers", freelancerId: id });
  };
  const smallField = "w-full rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#2F6FDB]";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <form onSubmit={submit} role="dialog" aria-label="Add freelancer" className="relative max-h-[94vh] w-full max-w-[520px] space-y-3 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex-1"><h2 className="text-[18px] font-extrabold">Add to the directory</h2><p className="text-[13px] text-[#6B6760]">The basics. Everything else is on their page, and you can hire them from there.</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[#6B6760] hover:bg-[#F1F0ED]"><X size={18} /></button>
        </div>
        <Field label="Name"><input autoFocus required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={fieldClass} /></Field>
        <div>
          <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">What they do</div>
          <div className="flex flex-wrap gap-1.5">{specialityOptions.map((name) => { const on = specialities.includes(name); return <button key={name} type="button" onClick={() => setSpecialities((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]))} aria-pressed={on} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${on ? "bg-[#1E2430] text-white" : "bg-[#F1F0ED] text-[#55514B]"}`}>{name}</button>; })}</div>
        </div>
        <Field label="Found on"><select value={draft.platform} onChange={(event) => setDraft({ ...draft, platform: event.target.value })} className={fieldClass}>{platforms.map((name) => <option key={name}>{name}</option>)}</select></Field>
        <Field label="Profile link (Fiverr or Upwork, if it applies)"><input value={draft.profileUrl} onChange={(event) => setDraft({ ...draft, profileUrl: event.target.value })} placeholder="https://www.fiverr.com/…" className={fieldClass} /></Field>
        <Field label="Drive link"><input value={draft.driveUrl} onChange={(event) => setDraft({ ...draft, driveUrl: event.target.value })} placeholder="https://drive.google.com/…" className={fieldClass} /></Field>
        {["Fiverr", "Upwork"].includes(draft.platform) && <label className="flex items-start gap-2 rounded-xl bg-[#F8F7F4] px-3 py-2.5 text-[13px]"><input type="checkbox" checked={onlyThere} onChange={(event) => setOnlyThere(event.target.checked)} className="mt-0.5 h-4 w-4" /><span><b>Only reachable on {draft.platform}.</b> They do not use the app, so messages for them are queued on Today to send there by hand.</span></label>}
        <Field label="Email"><input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={fieldClass} /></Field>
        <div className="space-y-2 rounded-2xl bg-[#F8F7F4] p-3.5">
          <div className="text-[12px] font-bold text-[#55514B]">How we pay them (optional, owners only)</div>
          <input value={pay.what} onChange={(event) => setPay({ ...pay, what: event.target.value })} placeholder="What it covers" aria-label="What the payment covers" className={smallField} />
          <div className="flex flex-wrap gap-2">
            <input value={pay.amount} inputMode="decimal" onChange={(event) => setPay({ ...pay, amount: event.target.value.replace(/[^\d.]/g, "") })} placeholder="Amount" aria-label="Amount" className={`${smallField} !w-28`} />
            <select value={pay.currency} onChange={(event) => setPay({ ...pay, currency: event.target.value })} aria-label="Currency" className={`${smallField} !w-auto font-bold`}>{currencies.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={pay.channel} onChange={(event) => setPay({ ...pay, channel: event.target.value })} aria-label="How we pay" className={`${smallField} !w-auto`}>{payChannels.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented size="sm" value={pay.frequency} onChange={(frequency) => setPay({ ...pay, frequency })} options={[{ value: "monthly", label: "Monthly" }, { value: "one-time", label: "One time" }]} />
            <input type="date" value={pay.date} onChange={(event) => setPay({ ...pay, date: event.target.value })} aria-label="Date" className={`${smallField} !w-auto`} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1"><Button type="button" onClick={onClose}>Cancel</Button><Button kind="primary" type="submit"><Plus size={14} />Add</Button></div>
      </form>
    </div>
  );
}
