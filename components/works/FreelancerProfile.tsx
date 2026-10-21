"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, ExternalLink, FolderOpen, Pause, Play, Plus, ShieldCheck, ShieldX, Trash2, Upload } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { canBeAssigned, clientCurrency, currencies, fileLabels, isFreelancer, isHired, isOwner, money, nextPayment, payChannels, serviceList, setupProgress, setupSteps, shortDate, specialityOptions, todayIso, toBase, toolChoices, turnOf } from "@/lib/works/logic";
import { fileToPhoto } from "@/lib/works/image";
import type { Client, Freelancer, FreelancerFee } from "@/lib/works/types";
import { Shell } from "./Shell";
import { PlatformTag, formatServices, jobsTotal, platforms, priceOf, statusChip } from "./FreelancerBits";
import { Avatar, Button, Card, CardHead, Chip, ClientMark, Field, Segmented, fieldClass } from "./kit";

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
const smallInput = "rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#2F6FDB]";

/** Keeps a file on a profile under a name such as CV or NDA. Small files are saved in the browser, larger ones only for this visit. */
function useAddFile(person: Freelancer) {
  const store = useStore();
  return (label: string, file: File) => {
    const finish = (url: string) => store.updateFreelancer(person.id, { files: [...person.files, { id: uid("file"), label, name: file.name, url, addedAt: todayIso() }] });
    if (file.size < 1_500_000) {
      const reader = new FileReader();
      reader.onload = () => finish(String(reader.result));
      reader.readAsDataURL(file);
    } else {
      finish(URL.createObjectURL(file));
      store.ping("That file is large, so it only lasts until you close this page. Put it in Drive and add the Drive link.");
    }
  };
}

function PhotoPicker({ person, size = 72 }: { person: Freelancer; size?: number }) {
  const store = useStore();
  const input = useRef<HTMLInputElement>(null);
  const choose = async (file?: File) => { if (!file) return; try { store.updateFreelancer(person.id, { photo: await fileToPhoto(file) }); } catch { store.ping("Could not read that picture. Try a PNG or JPG."); } };
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Avatar name={person.name} color={person.color} photo={person.photo} size={size} />
      <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} />
      <span className="flex items-center gap-2 text-[12px] font-semibold text-[#1F5BC4]">
        <button onClick={() => input.current?.click()} className="inline-flex items-center gap-1 hover:underline"><Camera size={12} />{person.photo ? "Change" : "Add photo"}</button>
        {person.photo && <button onClick={() => store.updateFreelancer(person.id, { photo: undefined })} className="text-[#8B867E] hover:text-[#B83232]">Remove</button>}
      </span>
    </div>
  );
}

/** Files kept on the profile, each under a name chosen from a list: CV, Portfolio, NDA, Contract, or something else. */
function ProfileFiles({ person }: { person: Freelancer }) {
  const store = useStore();
  const add = useAddFile(person);
  const [label, setLabel] = useState("CV");
  const [other, setOther] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const name = label === "Other" ? other.trim() || "File" : label;
  return (
    <Card>
      <CardHead title="Files" sub="CV, portfolio and anything worth keeping. Choose what it is, then add it." />
      {person.files.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {person.files.map((file) => (
            <li key={file.id} className="flex items-center gap-2 rounded-xl bg-[#F8F7F4] px-3 py-2 text-[13px]">
              <a href={file.url} target="_blank" rel="noreferrer" download={file.url.startsWith("data:") ? file.name : undefined} className="min-w-0 flex-1 truncate"><b className="text-[#1F5BC4] hover:underline">{file.label}</b><span className="ml-2 text-[12px] text-[#8B867E]">{file.name} · {shortDate(file.addedAt)}</span></a>
              <button onClick={() => store.updateFreelancer(person.id, { files: person.files.filter((entry) => entry.id !== file.id) })} aria-label={`Remove ${file.label}`} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select value={label} onChange={(event) => setLabel(event.target.value)} aria-label="What the file is" className={`${smallInput} font-semibold`}>{fileLabels.map((item) => <option key={item}>{item}</option>)}</select>
        {label === "Other" && <input value={other} onChange={(event) => setOther(event.target.value)} placeholder="Name it" aria-label="Name of the file" className={`${smallInput} w-36`} />}
        <Button size="sm" onClick={() => input.current?.click()}><Plus size={13} />Add a file</Button>
        <button onClick={() => { const url = window.prompt("Paste the link (Drive, Docs, a website…)"); if (url && /^https?:\/\//.test(url.trim())) store.updateFreelancer(person.id, { files: [...person.files, { id: uid("file"), label: name, name: "link", url: url.trim(), addedAt: todayIso() }] }); }} className="rounded-xl px-2.5 py-1.5 text-[12px] font-semibold text-[#1F5BC4] hover:bg-[#EEF2FA]">or add a link</button>
        <input ref={input} type="file" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) add(name, file); event.target.value = ""; }} />
      </div>
    </Card>
  );
}

// ─── The setup checklist: each line checks itself from what is on the profile ───
function StepRow({ done, title, optional, hint, children }: { done: boolean; title: string; optional?: boolean; hint?: string; children?: React.ReactNode }) {
  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${done ? "bg-[#1D9E5A] text-white" : "border-2 border-dashed border-[#CFCAC2]"}`} title={done ? "Done" : "Not done yet"}>{done && <Check size={14} strokeWidth={3} />}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className={`text-[14px] font-bold ${done ? "text-[#55514B]" : ""}`}>{title}</span>{optional && <Chip t="grey">Not required</Chip>}</div>
          {hint && !done && <div className="text-[12px] text-[#8B867E]">{hint}</div>}
          {children && <div className="mt-2.5 space-y-2.5">{children}</div>}
        </div>
      </div>
    </li>
  );
}

function SetupChecklist({ person }: { person: Freelancer }) {
  const store = useStore();
  const { state } = store;
  const owner = isOwner(state);
  const add = useAddFile(person);
  const set = (patch: Partial<Freelancer>) => store.updateFreelancer(person.id, patch);
  const steps = setupSteps(state, person);
  const done = (id: string) => steps.find((step) => step.id === id)?.done ?? false;
  const progress = setupProgress(state, person);
  const [custom, setCustom] = useState("");
  const [toolPick, setToolPick] = useState("");
  const ndaFile = useRef<HTMLInputElement>(null);
  const contractFile = useRef<HTMLInputElement>(null);
  const specialities = [...new Set([...specialityOptions, ...person.specialities])];
  const pickSpeciality = (name: string) => { const next = person.specialities.includes(name) ? person.specialities.filter((item) => item !== name) : [...person.specialities, name]; set({ specialities: next, speciality: next.join(", "), title: next.join(", ") }); };
  const setTool = (id: string, patch: Partial<Freelancer["tools"][number]>) => set({ tools: person.tools.map((tool) => (tool.id === id ? { ...tool, ...patch } : tool)) });
  const addTool = (name: string) => { if (!name.trim() || person.tools.some((tool) => tool.name.toLowerCase() === name.trim().toLowerCase())) return; set({ tools: [...person.tools, { id: uid("tool"), name: name.trim(), done: false, login: "", link: "", kept: "" }] }); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-extrabold">Setup checklist</h2>
        <span className={`text-[13px] font-semibold ${progress.percent === 100 ? "text-[#17804A]" : "text-[#94600A]"}`}>{progress.percent === 100 ? "All done" : `${progress.complete} of ${progress.total} done`}</span>
      </div>
      <ul className="divide-y divide-[#F3F1ED] rounded-2xl border border-[#E9E6E0] bg-white">
        <StepRow done={done("profile")} title="Contact, role and speciality">
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={person.email} onChange={(event) => set({ email: event.target.value })} placeholder="Email" aria-label="Email" className={smallInput} />
            <input value={person.phone} onChange={(event) => set({ phone: event.target.value })} placeholder="Phone or WhatsApp" aria-label="Phone or WhatsApp" className={smallInput} />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Speciality">
            {specialities.map((name) => { const on = person.specialities.includes(name); return <button key={name} onClick={() => pickSpeciality(name)} aria-pressed={on} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${on ? "bg-[#1E2430] text-white" : "bg-[#F1F0ED] text-[#55514B] hover:bg-[#E9E6E0]"}`}>{name}</button>; })}
            <form onSubmit={(event) => { event.preventDefault(); if (custom.trim() && !person.specialities.includes(custom.trim())) pickSpeciality(custom.trim()); setCustom(""); }} className="flex gap-1"><input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Other…" aria-label="Another speciality" className="w-28 rounded-full border border-[#E2DED7] px-3 py-1 text-[12px]" /><button type="submit" aria-label="Add speciality" className="rounded-full bg-[#F1F0ED] px-2 text-[#55514B]"><Plus size={13} /></button></form>
          </div>
        </StepRow>

        <StepRow done={done("pay")} title="Rate, currency and payment method" hint={owner ? "Add a payment in Payments below." : "The owners set this up."} />

        <StepRow done={done("availability")} title="Capacity and availability">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented size="sm" value={person.availability.mode} onChange={(mode) => set({ availability: { ...person.availability, mode } })} options={[{ value: "hours", label: "Per hour" }, { value: "projects", label: "Per project" }]} />
            <input type="number" min={0} value={person.availability.amount || ""} onChange={(event) => set({ availability: { ...person.availability, amount: Number(event.target.value) || 0 } })} aria-label="How much they are available" placeholder="0" className={`${smallInput} w-20`} />
            <span className="text-[13px] text-[#6B6760]">{person.availability.mode === "hours" ? "hours a week" : "projects at a time"}</span>
          </div>
        </StepRow>

        <StepRow done={done("services")} title="Service list" hint="Add them under Services and prices." />

        <StepRow done={done("portfolio")} title="Portfolio" hint="A link here, or a file named Portfolio under Files.">
          <input value={person.portfolio} onChange={(event) => set({ portfolio: event.target.value })} placeholder="https://…" aria-label="Portfolio link" className={`${smallInput} w-full`} />
        </StepRow>

        <StepRow done={done("trial")} title="Trial" optional>
          <label className="flex items-center gap-2 text-[13px] font-semibold"><input type="checkbox" checked={person.trialDone} onChange={(event) => set({ trialDone: event.target.checked })} className="h-4 w-4" />A trial or sample was done</label>
        </StepRow>

        <StepRow done={done("nda")} title="NDA signed" hint="Needed before they can be given a client.">
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={person.ndaDate} onChange={(event) => set({ ndaDate: event.target.value })} aria-label="Date the NDA was signed" className={smallInput} />
            <Button size="sm" onClick={() => ndaFile.current?.click()}><Upload size={13} />Upload it</Button>
            <input ref={ndaFile} type="file" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) add("NDA", file); event.target.value = ""; }} />
            {person.files.some((file) => /nda/i.test(file.label)) && <span className="text-[12px] font-semibold text-[#17804A]">File added</span>}
          </div>
        </StepRow>

        <StepRow done={done("contract")} title="Contract and payment agreement signed" hint="Needed before they can be given a client.">
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={person.contractDate} onChange={(event) => set({ contractDate: event.target.value })} aria-label="Date the contract was signed" className={smallInput} />
            <Button size="sm" onClick={() => contractFile.current?.click()}><Upload size={13} />Upload it</Button>
            <input ref={contractFile} type="file" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) add("Contract", file); event.target.value = ""; }} />
            {person.files.some((file) => /contract/i.test(file.label)) && <span className="text-[12px] font-semibold text-[#17804A]">File added</span>}
          </div>
        </StepRow>

        <StepRow done={done("tools")} title="Tools and access" hint="Tick each one once they have it.">
          <ul className="space-y-2">
            {person.tools.map((tool) => (
              <li key={tool.id} className="rounded-xl bg-[#F8F7F4] p-2.5">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={tool.done} onChange={(event) => setTool(tool.id, { done: event.target.checked })} aria-label={`${tool.name} is set up`} className="h-4 w-4" />
                  <span className="flex-1 text-[13px] font-bold">{tool.name}</span>
                  <button onClick={() => set({ tools: person.tools.filter((entry) => entry.id !== tool.id) })} aria-label={`Remove ${tool.name}`} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={13} /></button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input value={tool.login} onChange={(event) => setTool(tool.id, { login: event.target.value })} placeholder="Login or email" aria-label={`${tool.name} login`} className={smallInput} />
                  <input value={tool.link} onChange={(event) => setTool(tool.id, { link: event.target.value })} placeholder="Link" aria-label={`${tool.name} link`} className={smallInput} />
                  <input value={tool.kept} onChange={(event) => setTool(tool.id, { kept: event.target.value })} placeholder="Where the password is kept" aria-label={`${tool.name} password location`} className={smallInput} />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <select value={toolPick} onChange={(event) => { if (event.target.value === "__other") { const name = window.prompt("Name of the tool"); if (name) addTool(name); } else if (event.target.value) addTool(event.target.value); setToolPick(""); }} aria-label="Add a tool" className={`${smallInput} font-semibold`}>
              <option value="">Add a tool…</option>
              {toolChoices.filter((name) => !person.tools.some((tool) => tool.name === name)).map((name) => <option key={name}>{name}</option>)}
              <option value="__other">Another…</option>
            </select>
          </div>
          <p className="text-[12px] text-[#8B867E]">Passwords are not saved here. Say where each one is kept, for example in the password manager.</p>
        </StepRow>

        <StepRow done={done("accounts")} title="A client assigned" hint="Assign from the client page. It can be more than one." />
      </ul>
    </div>
  );
}

// ─── Payments: what we pay, for what, how, and how often ───
export function PaymentsCard({ person, client }: { person: Freelancer; client?: Client }) {
  const store = useStore();
  const { state } = store;
  const base = state.settings.currency;
  const [form, setForm] = useState({ what: "", kind: "standard" as FreelancerFee["kind"], forId: client?.id ?? "", custom: "", amount: "", currency: person.currency || "USD", channel: payChannels[0], frequency: "monthly" as FreelancerFee["frequency"], date: todayIso() });
  const list = person.fees.filter((fee) => !client || fee.clientId === client.id).sort((a, b) => a.date.localeCompare(b.date));
  const monthly = person.fees.filter((fee) => fee.frequency === "monthly" && (!client || fee.clientId === client.id));
  const monthlyTotal = monthly.reduce((sum, fee) => sum + toBase(state, fee.amount, fee.currency), 0);
  const today = todayIso();
  const forName = (fee: FreelancerFee) => state.clients.find((item) => item.id === fee.clientId)?.name ?? fee.custom ?? "General";
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) return;
    const fee: FreelancerFee = { id: uid("fee"), what: form.what.trim(), clientId: client?.id ?? (form.forId || undefined), custom: client || form.forId ? undefined : form.custom.trim() || undefined, kind: form.kind, amount, currency: form.currency, channel: form.channel, frequency: form.frequency, date: form.date || today };
    store.updateFreelancer(person.id, { fees: [...person.fees, fee] });
    setForm({ ...form, what: "", amount: "" });
  };
  return (
    <Card>
      <CardHead title={client ? `Payments to ${person.name} for ${client.name}` : "Payments"} sub={monthly.length ? `${money(monthlyTotal, base)} a month in regular payments${monthly.some((fee) => fee.currency !== base) ? ", worked out at the rate in Settings" : ""}.` : "What we pay, for what, how, and how often. Only owners see this."} />
      {list.length > 0 && (
        <ul className="mb-3 divide-y divide-[#F3F1ED] rounded-xl border border-[#F0EEE9]">
          {list.map((fee) => {
            const next = nextPayment(fee, today);
            return (
              <li key={fee.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 text-[13px]">
                <span className="min-w-[160px] flex-1">
                  <b className="block text-[14px]">{fee.what || "Payment"}{fee.kind === "add-on" && <span className="ml-2 align-middle"><Chip t="purple">Add-on</Chip></span>}</b>
                  <span className="text-[12px] text-[#6B6760]">{forName(fee)} · {fee.frequency === "monthly" ? `monthly from ${shortDate(fee.date)}` : `one time, ${shortDate(fee.date)}`} · {fee.channel}</span>
                </span>
                <span className="text-right"><b className="block text-[14px]">{money(fee.amount, fee.currency)}</b>{next && <span className="text-[11px] font-semibold text-[#1F5BC4]">Next {shortDate(next)}</span>}</span>
                <button onClick={() => store.updateFreelancer(person.id, { fees: person.fees.filter((entry) => entry.id !== fee.id) })} aria-label={`Remove ${fee.what || "payment"}`} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={submit} className="space-y-2.5 rounded-xl bg-[#F8F7F4] p-3.5">
        <div className="text-[12px] font-bold text-[#55514B]">Add a payment</div>
        <input value={form.what} onChange={(event) => setForm({ ...form, what: event.target.value })} placeholder="What it covers, for example 8 posts and a newsletter a month" aria-label="What the payment covers" className={`${smallInput} w-full`} />
        <div className="flex flex-wrap gap-2">
          <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as FreelancerFee["kind"] })} aria-label="Kind of payment" className={`${smallInput} font-semibold`}><option value="standard">Regular fee</option><option value="add-on">Add-on</option></select>
          {!client && (
            <>
              <select value={form.forId} onChange={(event) => setForm({ ...form, forId: event.target.value })} aria-label="For which client" className={`${smallInput} min-w-[150px] flex-1`}><option value="">Custom (not a client)</option>{state.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              {!form.forId && <input value={form.custom} onChange={(event) => setForm({ ...form, custom: event.target.value })} placeholder="What for" aria-label="What it is for" className={`${smallInput} w-40`} />}
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={form.amount} inputMode="decimal" onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/[^\d.]/g, "") })} placeholder="Amount" aria-label="Amount" className={`${smallInput} w-28`} />
          <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} aria-label="Currency" className={`${smallInput} font-bold`}>{currencies.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} aria-label="How we pay" className={smallInput}>{payChannels.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented size="sm" value={form.frequency} onChange={(frequency) => setForm({ ...form, frequency })} options={[{ value: "monthly", label: "Monthly" }, { value: "one-time", label: "One time" }]} />
          <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#55514B]">{form.frequency === "monthly" ? "First paid on" : "Paid on"}<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} aria-label="Date" className={smallInput} /></label>
          <Button type="submit" kind="primary" size="sm" className="ml-auto"><Plus size={13} />Add payment</Button>
        </div>
      </form>
    </Card>
  );
}

/** What this person did for us and what it cost, so we can come back to it. */
function WorkForUs({ person }: { person: Freelancer }) {
  const store = useStore();
  const { state } = store;
  const owner = isOwner(state);
  const sum = jobsTotal(person);
  const [job, setJob] = useState({ what: "", clientId: "", amount: "", date: todayIso(), link: "" });
  const jobs = [...person.jobs].sort((a, b) => b.date.localeCompare(a.date));
  const clientName = (item: Freelancer["jobs"][number]) => state.clients.find((client) => client.id === item.clientId)?.name ?? item.client ?? "The Works";
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    if (!job.what.trim()) return;
    store.updateFreelancer(person.id, { jobs: [{ id: uid("job"), date: job.date || todayIso(), clientId: job.clientId || undefined, client: job.clientId ? undefined : "The Works", what: job.what.trim(), amount: Number(job.amount) || 0, link: job.link.trim() || undefined }, ...person.jobs] });
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
        <input value={job.what} onChange={(event) => setJob({ ...job, what: event.target.value })} placeholder="What they did, for example 3 LinkedIn carousels" aria-label="What they did" className={`${smallInput} w-full`} />
        <div className="flex flex-wrap gap-2">
          <select value={job.clientId} onChange={(event) => setJob({ ...job, clientId: event.target.value })} aria-label="For which client" className={`${smallInput} min-w-[150px] flex-1`}><option value="">The Works (not a client)</option>{state.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
          <input type="date" value={job.date} onChange={(event) => setJob({ ...job, date: event.target.value })} aria-label="Date" className={smallInput} />
          {owner && <input value={job.amount} inputMode="decimal" onChange={(event) => setJob({ ...job, amount: event.target.value })} placeholder={`Charged (${person.currency})`} aria-label="How much they charged" className={`${smallInput} w-32`} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={job.link} onChange={(event) => setJob({ ...job, link: event.target.value })} placeholder="Link to the work (optional)" aria-label="Link to the work" className={`${smallInput} min-w-[200px] flex-1`} />
          <Button type="submit" kind="primary" size="sm"><Plus size={13} />Add job</Button>
        </div>
      </form>
    </Card>
  );
}

/** What the freelancer sees: their picture, status, their files, and quick links for each of their clients. Nothing about prices or payments. */
function SelfProfile({ person }: { person: Freelancer }) {
  const { state, go } = useStore();
  const status = statusChip(person.status);
  const clients = state.clients.filter((client) => client.freelancerId === person.id);
  const links = (client: Client): [string, string | undefined][] => [["Drive", client.links.drive], ["Canva", client.links.canva], ["Publishing tool", client.links.publer], ["Chat", client.links.chat], ["Brand kit", client.links.brandKit], ["Brand guide", client.links.guide], ["Strategy brain", client.links.brain]];
  return (
    <Shell title={person.name} sub="Your profile">
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl p-5" style={{ background: `linear-gradient(120deg, ${person.color}22, #ffffff)` }}>
        <PhotoPicker person={person} />
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2"><Chip t={status.t}>{status.label}</Chip></div>
          <div className="mt-2 text-[13px] text-[#55514B]">{[person.email, person.phone].filter(Boolean).join(" · ") || "No contact yet"}</div>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <ProfileFiles person={person} />
        <Card>
          <CardHead title="Quick links" sub="For each of your clients." />
          {clients.length === 0 ? <p className="text-[13px] text-[#8B867E]">No clients yet. They show here once you are given one.</p> : (
            <ul className="space-y-3">
              {clients.map((client) => {
                const set = links(client).filter(([, url]) => url);
                return (
                  <li key={client.id} className="rounded-xl border border-[#F0EEE9] p-3">
                    <button onClick={() => go({ view: "marketing", clientId: client.id })} className="flex w-full items-center gap-2.5 text-left"><ClientMark client={client} size={30} /><span className="flex-1 text-[14px] font-bold">{client.name}</span><ArrowRight size={14} className="text-[#B5B0A8]" /></button>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {set.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FA] px-2.5 py-1 text-[12px] font-semibold text-[#1F5BC4] hover:bg-[#E2EAF7]"><ExternalLink size={11} />{label}</a>)}
                      {set.length === 0 && <span className="text-[12px] text-[#8B867E]">No links added to this client yet.</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}

export function FreelancerProfile({ person }: { person: Freelancer }) {
  const store = useStore();
  const { state, go } = store;
  const owner = isOwner(state);
  if (isFreelancer(state)) return <SelfProfile person={person} />;
  const hired = isHired(person);
  const ok = canBeAssigned(state, person);
  const accounts = state.clients.filter((client) => client.freelancerId === person.id);
  const set = (patch: Partial<Freelancer>) => store.updateFreelancer(person.id, patch);
  const services = serviceList(person.services);
  const [service, setService] = useState({ name: "", price: "", currency: person.currency || "USD" });
  const status = statusChip(person.status);

  return (
    <Shell title={person.name} sub={person.speciality || "Not in a role yet"} actions={<Button kind="ghost" onClick={() => go({ view: "freelancers" })}><ArrowLeft size={15} />All freelancers</Button>}>
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl p-5" style={{ background: `linear-gradient(120deg, ${person.color}22, #ffffff)` }}>
        <PhotoPicker person={person} />
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Chip t={status.t}>{status.label}</Chip>
            <PlatformTag name={person.platform} />
            {hired && <Chip t={ok ? "green" : "red"}>{ok ? <><ShieldCheck size={12} />NDA and contract signed</> : <><ShieldX size={12} />Cannot be assigned yet</>}</Chip>}
          </div>
          <div className="mt-2 text-[13px] text-[#55514B]">{[person.email, person.phone].filter(Boolean).join(" · ") || "No contact yet"}</div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold">
            {person.profileUrl && <a href={person.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1F5BC4] hover:underline"><ExternalLink size={13} />{person.platform ? `${person.platform} profile` : "Profile"}</a>}
            {person.driveUrl && <a href={person.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1F5BC4] hover:underline"><FolderOpen size={13} />Drive folder</a>}
            {person.portfolio && <a href={person.portfolio} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1F5BC4] hover:underline"><ExternalLink size={13} />Portfolio</a>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {(hired || person.status === "Paused") && (
            <Button onClick={() => set({ status: person.status === "Paused" ? "Active" : "Paused" })}>{person.status === "Paused" ? <><Play size={14} />Resume</> : <><Pause size={14} />Pause</>}</Button>
          )}
          {hired && <div className="text-right"><div className="text-[26px] font-extrabold">{accounts.length}<span className="text-[15px] text-[#8B867E]">/{person.capacity}</span></div><div className="text-[12px] font-semibold text-[#6B6760]">accounts</div></div>}
        </div>
      </div>

      {!hired && person.status !== "Paused" && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E9E6E0] bg-white p-4">
          <div className="min-w-[220px] flex-1 text-[13px] text-[#55514B]">
            <b className="text-[14px] text-[#1E2430]">{person.status === "Offboarded" ? "Worked for us before." : "In the directory, not hired."}</b> {person.status === "Offboarded" ? "Their past work is below." : "Hiring opens the setup checklist, with the NDA and contract, and lets you assign them to a client once those are signed."}
          </div>
          <Button kind="primary" onClick={() => set({ status: "Active" })}>{person.status === "Offboarded" ? "Hire again" : "Hire"}</Button>
          {person.status === "Directory" && accounts.length === 0 && <Button onClick={() => { store.deleteFreelancer(person.id); go({ view: "freelancers" }); }}><Trash2 size={14} />Remove</Button>}
        </div>
      )}
      {person.status === "Paused" && <p className="mb-5 rounded-2xl bg-[#FFF3D9] px-4 py-3 text-[13px] text-[#6B4A06]">Paused. They are kept here with everything on their profile, but cannot be given a client until you resume them.</p>}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="min-w-0 space-y-5">
          {(hired || person.status === "Paused") && <SetupChecklist person={person} />}
          {owner && <PaymentsCard person={person} />}
          <ProfileFiles person={person} />
          <WorkForUs person={person} />
        </div>

        <div className="min-w-0 space-y-5">
          {(hired || person.status === "Paused") && (
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
                          <span className="flex-1"><span className="block text-[14px] font-bold">{client.name}</span><span className="text-[12px] text-[#8B867E]">{client.package} · {client.agreedPosts} posts a month · {clientCurrency(state, client)}</span></span>
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
            <CardHead title="Services and prices" sub={owner ? "Internal. Only owners see the prices." : "Internal. Prices are for owners only."} />
            <ul className="space-y-1.5">
              {services.map((item, index) => (
                <li key={index} className="flex items-center gap-2 rounded-xl bg-[#F8F7F4] px-3 py-2 text-[13px]">
                  <span className="flex-1 font-semibold">{item.name}</span>
                  {owner && <span className="font-bold">{priceOf(item)}</span>}
                  <button onClick={() => set({ services: formatServices(services.filter((_, i) => i !== index)) })} aria-label={`Remove ${item.name}`} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>
                </li>
              ))}
              {services.length === 0 && <li className="text-[13px] text-[#8B867E]">No services listed yet.</li>}
            </ul>
            <form onSubmit={(event) => { event.preventDefault(); if (!service.name.trim()) return; set({ services: formatServices([...services, { name: service.name.trim(), price: service.price.trim(), currency: service.price.trim() ? service.currency : "" }]) }); setService({ ...service, name: "", price: "" }); }} className="mt-3 flex flex-wrap gap-2">
              <input value={service.name} onChange={(event) => setService({ ...service, name: event.target.value })} placeholder="Carousel design" aria-label="Service" className={`${smallInput} min-w-0 flex-1`} />
              {owner && <><input value={service.price} inputMode="decimal" onChange={(event) => setService({ ...service, price: event.target.value.replace(/[^\d.]/g, "") })} placeholder="Amount" aria-label="Amount" className={`${smallInput} w-24`} /><select value={service.currency} onChange={(event) => setService({ ...service, currency: event.target.value })} aria-label="Currency" className={`${smallInput} font-bold`}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></>}
              <Button type="submit" size="sm"><Plus size={13} /></Button>
            </form>
          </Card>

          <Card>
            <CardHead title="Details" />
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Found on"><select value={person.platform} onChange={(event) => set({ platform: event.target.value })} className={fieldClass}><option value="">Not set</option>{platforms.map((name) => <option key={name}>{name}</option>)}</select></Field>
                <Field label="Status"><select value={person.status} onChange={(event) => set({ status: event.target.value as Freelancer["status"] })} className={fieldClass}><option value="Directory">Not hired</option><option value="Trial">Trial</option><option value="Active">Active</option><option value="Paused">Paused</option><option value="Offboarded">Past</option></select></Field>
              </div>
              <Field label="Profile link (Fiverr or Upwork, if it applies)"><input value={person.profileUrl} onChange={(event) => set({ profileUrl: event.target.value })} className={fieldClass} placeholder="https://…" /></Field>
              <Field label="Drive link"><input value={person.driveUrl} onChange={(event) => set({ driveUrl: event.target.value })} className={fieldClass} placeholder="https://drive.google.com/…" /></Field>
              <Field label="Most accounts at once"><input type="number" min={0} value={person.capacity} onChange={(event) => set({ capacity: Number(event.target.value) })} className={fieldClass} /></Field>
              <Field label="Notes"><textarea value={person.notes} onChange={(event) => set({ notes: event.target.value })} rows={3} className={fieldClass} placeholder="How good they were, how fast, anything to remember" /></Field>
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
