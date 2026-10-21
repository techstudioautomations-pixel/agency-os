"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, ExternalLink, FileText, FolderOpen, KeyRound, Link2, Pencil, Plus, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { agreedFor, areaLabel, qaGroups, canBeAssigned, reportIn, isHired, approx, clientCurrency, currencies, freelancerCostBase, freelancerCurrency, incomeBase, firstMonthOf, gate, isFirstMonth, isFreelancer, isMarketing, isOwner, missing, money, monthName, monthlyAreas, nameOf, personById, progress, shiftMonth, shortDate, todayIso } from "@/lib/works/logic";
import type { AccessItem, ApprovalMode, Client, ClientFile } from "@/lib/works/types";
import { Shell } from "./Shell";
import { GateBanner } from "./Checklist";
import { AreaDetail, AreaGrid, AreaStrip } from "./Areas";
import { ClientShare, ProfileEditor, ServicesCard } from "./ClientServices";
import { MonthChecklist } from "./Monthly";
import { StarterPack } from "./StarterPack";
import { StrategyView } from "./Marketing";
import { PayButton } from "./Pay";
import { PaymentsCard } from "./FreelancerProfile";
import { AttachField, Avatar, Bar, Button, Card, CardHead, Chip, ClientMark, Empty, Field, Light, Ring, Segmented, fieldClass, tone } from "./kit";

export const modeText: Record<ApprovalMode, string> = {
  A: "Client reviews the plan and posts, if they ask",
  B: "Client reviews the plan, if they ask",
  C: "We approve internally",
};

// ─── List: just the clients ───
export function ClientsList() {
  const { state, go, openWizard } = useStore();
  const [filter, setFilter] = useState<"all" | "Onboarding" | "Live" | "attention">("all");
  const clients = state.clients;
  const needs = (client: Client) => gate(client.checklist).light !== "green" || !client.freelancerId;
  const shown = clients.filter((client) => filter === "all" || (filter === "attention" ? needs(client) : client.stage === filter));
  if (isFreelancer(state)) return <Shell title="Clients"><Empty title="Your clients are in Marketing" /></Shell>;

  return (
    <Shell title="Clients" sub={`${clients.filter((c) => c.stage === "Live").length} live · ${clients.filter((c) => c.stage === "Onboarding").length} onboarding`} actions={<Button kind="primary" onClick={() => openWizard()}><Plus size={15} />New client</Button>}>
      <div className="mb-4">
        <Segmented value={filter} onChange={setFilter} options={[
          { value: "all", label: "All", count: clients.length },
          { value: "Onboarding", label: "Onboarding", count: clients.filter((c) => c.stage === "Onboarding").length },
          { value: "Live", label: "Live", count: clients.filter((c) => c.stage === "Live").length },
          { value: "attention", label: "Needs attention", count: clients.filter(needs).length },
        ]} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((client) => {
          const g = gate(client.checklist);
          return (
            <button key={client.id} onClick={() => go({ view: "client", clientId: client.id })} className="group flex min-w-0 items-center gap-4 rounded-2xl border border-[#E9E6E0] bg-white p-4 text-left transition hover:border-[#D2CCC2] hover:shadow-[0_8px_24px_rgba(30,36,48,.07)]">
              <ClientMark client={client} size={56} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-bold">{client.name}</span>
                <span className="block truncate text-[13px] text-[#8B867E]">{client.sector}</span>
              </span>
              <span className="flex flex-col items-end gap-2"><Chip t={client.stage === "Live" ? "green" : client.stage === "Paused" ? "grey" : "blue"}>{client.stage}</Chip>{g.light !== "green" && <span title={g.label}><Light light={g.light} size={9} /></span>}</span>
            </button>
          );
        })}
      </div>
      {shown.length === 0 && <Empty title="No clients in this view" />}
    </Shell>
  );
}

// ─── Profile ───
export function ClientProfile({ clientId, tab, sub }: { clientId: string; tab?: string; sub?: string }) {
  const { state, go } = useStore();
  const [editingProfile, setEditingProfile] = useState(false);
  const client = state.clients.find((item) => item.id === clientId);
  const owner = isOwner(state);
  if (!client || isFreelancer(state)) return <Shell title="Client"><Empty title="This client is not available to you." /></Shell>;

  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "checklists", label: "Checklists", count: missing(client.checklist).filter((item) => !item.soft && !item.detail).length },
    ...(isMarketing(client) ? [{ value: "strategy", label: "Strategy" }] : []),
    { value: "access", label: "Access" },
    { value: "reporting", label: "Reporting" },
    { value: "files", label: "Files & links" },
    ...(isMarketing(client) ? [{ value: "share", label: "Client view" }] : []),
    ...(owner ? [{ value: "finance", label: "Finance" }] : []),
  ];
  const current = tabs.some((item) => item.value === tab) ? tab! : "overview";
  const links: [string, string, ReactNode][] = [["Drive", client.links.drive, <FolderOpen key="d" size={15} />], ["Canva", client.links.canva, <Sparkles key="c" size={15} />], ["Publishing tool", client.links.publer, <Link2 key="p" size={15} />]];

  return (
    <Shell title={client.name} sub={client.sector}>
      <div className="-mt-2 mb-5 overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white">
        <div className="h-20" style={{ background: `linear-gradient(120deg, ${client.color}, ${client.color}99 60%, #1E2430)` }} />
        <div className="flex flex-wrap items-end gap-4 px-5 pb-4">
          <div className="-mt-9 rounded-2xl bg-white p-1 shadow-sm"><ClientMark client={client} size={64} /></div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pt-2">
            <Chip t={client.stage === "Live" ? "green" : "blue"}>{client.stage}</Chip>
            <Chip>{isMarketing(client) ? client.package : areaLabel(client)}</Chip>
            {client.approvalMode !== "C" && <Chip t="purple">{modeText[client.approvalMode]}</Chip>}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {links.filter(([, url]) => url).map(([label, url, icon]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2DED7] px-3 py-2 text-[12px] font-semibold hover:border-[#C9C3B8]">{icon}{label}</a>)}
            <Button onClick={() => setEditingProfile(!editingProfile)}><Pencil size={14} />Edit profile</Button>
            {isMarketing(client) && <Button kind="primary" onClick={() => go({ view: "marketing", clientId: client.id })}>Open marketing <ArrowRight size={15} /></Button>}
          </div>
        </div>
      </div>
      {editingProfile && <ProfileEditor client={client} onClose={() => setEditingProfile(false)} />}
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-[#E9E6E0]">
        {tabs.map((item) => (
          <button key={item.value} onClick={() => go({ view: "client", clientId, tab: item.value })} className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-[14px] font-semibold ${current === item.value ? "border-[#1E2430] text-[#1E2430]" : "border-transparent text-[#8B867E] hover:text-[#1E2430]"}`}>
            {item.label}
            {"count" in item && !!item.count && <span className="ml-1.5 rounded-full bg-[#FDECEC] px-1.5 py-0.5 text-[11px] font-bold text-[#B83232]">{item.count}</span>}
          </button>
        ))}
      </div>
      {current === "overview" && <Overview client={client} />}
      {current === "checklists" && <Checklists client={client} sub={sub} />}
      {current === "strategy" && isMarketing(client) && <StrategyView client={client} />}
      {current === "access" && <Access client={client} />}
      {current === "reporting" && <Reporting client={client} />}
      {current === "files" && <Files client={client} />}
      {current === "share" && <ClientShare client={client} />}
      {current === "finance" && owner && <ClientFinance client={client} />}
    </Shell>
  );
}

// ─── Overview: the client on one screen ───
function Row({ label, value, editing, children }: { label: string; value: ReactNode; editing: boolean; children?: ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-3 border-b border-[#F3F1ED] py-2.5 last:border-0">
      <span className="text-[12px] font-semibold text-[#8B867E]">{label}</span>
      {editing && children ? children : <span className="min-w-0 truncate text-[14px] font-semibold">{value || <span className="font-normal italic text-[#B5B0A8]">To add</span>}</span>}
    </div>
  );
}

function MonthPanel({ client }: { client: Client }) {
  const { state } = useStore();
  const areas = monthlyAreas(state, client);
  if (areas.length === 0) return null;
  return (
    <Card>
      <CardHead title={`This month · ${monthName(state.month)}`} sub={isFirstMonth(client, state.month) ? "Set-up month" : "What needs doing for this client"} />
      <div className={`grid gap-6 ${areas.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {areas.map((area) => <MonthChecklist key={area.id} client={client} area={area} month={state.month} />)}
      </div>
    </Card>
  );
}

function Overview({ client }: { client: Client }) {
  const { state, go, updateClient, assignFreelancer } = useStore();
  const [editing, setEditing] = useState(false);
  const owner = isOwner(state);
  const g = gate(client.checklist);
  const p = progress(client.checklist);
  const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(state.month) && !post.extra);
  const approved = posts.filter((post) => ["Ready to schedule", "Scheduled", "Published"].includes(post.status)).length;
  const lastMonth = shiftMonth(state.month, -1);
  const report = state.reports.find((item) => item.clientId === client.id && item.month === lastMonth);
  const fl = personById(state, client.freelancerId);
  const set = (patch: Partial<Client>) => updateClient(client.id, patch);
  const input = (value: string, onChange: (value: string) => void) => <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[#E2DED7] px-2.5 py-1.5 text-[14px] outline-none focus:border-[#2F6FDB]" />;
  const select = "rounded-lg border border-[#E2DED7] bg-white px-2.5 py-1.5 text-[14px]";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button onClick={() => go({ view: "client", clientId: client.id, tab: "checklists" })} className="flex items-center gap-3 rounded-2xl border border-[#E9E6E0] bg-white p-4 text-left">
          <Ring value={p.percent} size={48} color={tone[g.light].dot} />
          <span><span className="block text-[12px] font-semibold text-[#8B867E]">Checklists</span><span className="text-[14px] font-bold">{g.light === "green" ? "Ready for production" : `${g.blocking.length} key step${g.blocking.length === 1 ? "" : "s"} open`}</span></span>
        </button>
        {isMarketing(client) ? (
          <button onClick={() => go({ view: "marketing", clientId: client.id })} className="rounded-2xl border border-[#E9E6E0] bg-white p-4 text-left">
            <span className="block text-[12px] font-semibold text-[#8B867E]">{monthName(state.month).split(" ")[0]} posts approved</span>
            <span className="text-[22px] font-extrabold">{approved}<span className="text-[14px] text-[#8B867E]"> / {agreedFor(client, state.month)}</span></span>
            <Bar value={agreedFor(client, state.month) ? (approved / agreedFor(client, state.month)) * 100 : 0} color={tone.green.dot} />
          </button>
        ) : (
          <div className="rounded-2xl border border-[#E9E6E0] bg-white p-4">
            <span className="block text-[12px] font-semibold text-[#8B867E]">{areaLabel(client)}</span>
            <span className="text-[22px] font-extrabold">{client.assets.length}<span className="text-[14px] text-[#8B867E]"> deliverable{client.assets.length === 1 ? "" : "s"}</span></span>
          </div>
        )}
        <div className="rounded-2xl border border-[#E9E6E0] bg-white p-4">
          <span className="block text-[12px] font-semibold text-[#8B867E]">Freelancer</span>
          {fl ? <span className="mt-1 flex items-center gap-2 text-[14px] font-bold"><Avatar name={fl.name} color={fl.color} photo={fl.photo} size={28} />{fl.name}</span> : <span className="mt-1 block text-[14px] font-bold text-[#B83232]">Not assigned</span>}
        </div>
        <button onClick={() => go({ view: "client", clientId: client.id, tab: "reporting" })} className="rounded-2xl border border-[#E9E6E0] bg-white p-4 text-left">
          <span className="block text-[12px] font-semibold text-[#8B867E]">{monthName(lastMonth).split(" ")[0]} report</span>
          <span className={`mt-1 block text-[14px] font-bold ${report?.sentAt ? "text-[#17804A]" : client.startDate.slice(0, 7) > lastMonth ? "text-[#8B867E]" : "text-[#B83232]"}`}>{report?.sentAt ? `✓ Sent ${shortDate(report.sentAt)}` : client.startDate.slice(0, 7) > lastMonth ? "Not due yet" : "Not sent yet"}</span>
        </button>
      </div>

      {isMarketing(client) && isFirstMonth(client, state.month) && (
        <div className="rounded-2xl bg-[#F1ECFC] px-5 py-4 text-[14px] text-[#4A2F9A]"><b>Set-up month.</b> {monthName(firstMonthOf(client))} is mostly strategy and templates. We promised {client.setupPosts} post{client.setupPosts === 1 ? "" : "s"}. Full content ({client.agreedPosts} a month) starts in {monthName(shiftMonth(firstMonthOf(client), 1))}.</div>
      )}
      <MonthPanel client={client} />
      {isMarketing(client) && <StarterPack client={client} />}
      <AreaStrip client={client} />
      <ServicesCard client={client} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="People" right={<Button size="sm" kind={editing ? "primary" : "secondary"} onClick={() => setEditing(!editing)}>{editing ? <><Check size={13} />Done</> : <><Pencil size={13} />Edit</>}</Button>} />
          <Row label="Main contact" value={client.mainContact.name} editing={editing}>{input(client.mainContact.name, (value) => set({ mainContact: { ...client.mainContact, name: value } }))}</Row>
          <Row label="Email" value={client.mainContact.email} editing={editing}>{input(client.mainContact.email, (value) => set({ mainContact: { ...client.mainContact, email: value } }))}</Row>
          <Row label="Approver" value={client.approver.name} editing={editing}>{input(client.approver.name, (value) => set({ approver: { ...client.approver, name: value } }))}</Row>
          <Row label="Billing contact" value={client.billingContact} editing={editing}>{input(client.billingContact, (value) => set({ billingContact: value }))}</Row>
          <Row label="Technical expert" value={client.expertReviewer} editing={editing}>{input(client.expertReviewer, (value) => set({ expertReviewer: value }))}</Row>
          <Row label="We talk on" value={client.channel} editing={editing}><select value={client.channel} onChange={(event) => set({ channel: event.target.value as Client["channel"] })} className={select}><option>Google Chat</option><option>Email</option></select></Row>
          <Row label="Freelancer" value={fl?.name} editing={editing}>
            <select value={client.freelancerId ?? ""} onChange={(event) => assignFreelancer(client.id, event.target.value)} className={select}>
              <option value="">Not assigned</option>
              {state.freelancers.filter(isHired).map((person) => <option key={person.id} value={person.id}>{person.name}{canBeAssigned(state, person) ? "" : " · NDA/contract missing"}</option>)}
            </select>
          </Row>
        </Card>
        <Card>
          <CardHead title="How we run it" />
          {isMarketing(client) && <Row label="Approval" value={modeText[client.approvalMode]} editing={editing}><select value={client.approvalMode} onChange={(event) => set({ approvalMode: event.target.value as ApprovalMode })} className={select}>{(["C", "B", "A"] as ApprovalMode[]).map((mode) => <option key={mode} value={mode}>{modeText[mode]}</option>)}</select></Row>}
          {!isMarketing(client) && <Row label="About the work" value={client.description} editing={editing}>{input(client.description ?? "", (value) => set({ description: value }))}</Row>}
          <Row label="Stage" value={client.stage} editing={editing}><select value={client.stage} onChange={(event) => set({ stage: event.target.value as Client["stage"] })} className={select}><option>Onboarding</option><option>Live</option><option>Paused</option></select></Row>
          <Row label="Start date" value={shortDate(client.startDate)} editing={editing}><input type="date" value={client.startDate} onChange={(event) => set({ startDate: event.target.value })} className={select} /></Row>
          {isMarketing(client) && <Row label="Posts in month 1" value={String(client.setupPosts)} editing={editing}><input type="number" min={0} value={client.setupPosts} onChange={(event) => set({ setupPosts: Math.max(0, Number(event.target.value) || 0) })} className={`${select} w-24`} /></Row>}
          {owner && <Row label="Monthly fee" value={`${money(client.fee + client.addOnFee, clientCurrency(state, client))}${approx(state, client.fee + client.addOnFee, clientCurrency(state, client)) ? ` (${approx(state, client.fee + client.addOnFee, clientCurrency(state, client))})` : ""}`} editing={false} />}
          {g.blocking.length > 0 && (
            <button onClick={() => go({ view: "client", clientId: client.id, tab: "checklists" })} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-[#FDECEC] px-3 py-2.5 text-left text-[13px] font-semibold text-[#B83232]">
              <ShieldAlert size={15} className="shrink-0" /><span className="truncate">Still missing: {g.blocking.slice(0, 2).map((item) => item.label.split(":")[0]).join(", ")}{g.blocking.length > 2 ? ` +${g.blocking.length - 2}` : ""}</span>
              <ArrowRight size={14} className="ml-auto shrink-0" />
            </button>
          )}
        </Card>
      </div>
    </div>
  );
}

function Checklists({ client, sub }: { client: Client; sub?: string }) {
  return (
    <div className="space-y-4">
      {!sub && <GateBanner items={client.checklist} readyText="Ready for production: every key step is done" />}
      {sub ? <AreaDetail client={client} areaId={sub} /> : <AreaGrid client={client} />}
      {!sub && isMarketing(client) && <QualityReference client={client} />}
    </div>
  );
}

/** The standard every post for this client is checked against. It lives with the client, not on each post. */
function QualityReference({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const total = qaGroups.reduce((sum, group) => sum + group.items.length, 0);
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">Quality checklist for {client.name}</span><span className="block text-[12px] text-[#8B867E]">What we check on every post before it goes out. From the brand guide.</span></span>
        <span className="text-[13px] font-bold">{total} checks</span>
        <ChevronDown size={17} className={`text-[#8B867E] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid gap-5 border-t border-[#F0EEE9] px-5 py-4 md:grid-cols-3">
          {qaGroups.map((group) => (
            <div key={group.title}>
              <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-[#8B867E]">{group.title}</div>
              <ul className="space-y-1.5 text-[13px]">
                {group.items.map((item) => <li key={item.id} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-[#17804A]" /><span>{item.text}</span></li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Access ───
const platforms = ["LinkedIn page", "Instagram", "Facebook", "Meta Business", "TikTok", "Publishing tool", "Canva", "Newsletter tool", "Google Drive", "Website", "Other"];

function Access({ client }: { client: Client }) {
  const { addAccess, updateAccess, removeAccess } = useStore();
  const [draft, setDraft] = useState<Omit<AccessItem, "id">>({ platform: "LinkedIn page", account: "", ownedBy: "Client", people: "", status: "Requested", date: todayIso(), vaultRef: "" });
  const statusColors = (status: AccessItem["status"]) => (status === "Active" ? tone.green : status === "Requested" ? tone.amber : tone.grey);
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl bg-[#FFF3D9] p-4 text-[13px] text-[#6B4A06]">
        <KeyRound size={18} className="mt-0.5 shrink-0" />
        <span><b>Never store passwords here.</b> Use platform roles (page admin, Meta Business partner, publishing-tool editor) and keep any password in the agency vault. Record who has access and since when, and remove it the day work ends.</span>
      </div>
      {client.access.length === 0 ? <Empty title="No accounts recorded yet">Add each platform as access is granted.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2">
          {client.access.map((item) => (
            <div key={item.id} className="min-w-0 rounded-2xl border border-[#E9E6E0] bg-white p-4" style={{ borderLeft: `4px solid ${statusColors(item.status).dot}` }}>
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F6F5F2] text-[14px] font-extrabold text-[#55514B]">{item.platform[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold">{item.platform}</div>
                  <div className="truncate text-[13px] text-[#55514B]">{item.account}</div>
                </div>
                <select value={item.status} onChange={(event) => updateAccess(client.id, item.id, { status: event.target.value as AccessItem["status"], date: todayIso() })} aria-label="Access status" className="rounded-lg border-0 px-2 py-1 text-[12px] font-bold" style={{ background: statusColors(item.status).bg, color: statusColors(item.status).ink }}>
                  <option>Requested</option><option>Active</option><option>Removed</option>
                </select>
              </div>
              <div className="mt-3 space-y-1 text-[12px] text-[#55514B]">
                <div><b>Who has access:</b> {item.people || "—"}</div>
                <div><b>Owned by:</b> {item.ownedBy} · <b>since</b> {shortDate(item.date)}</div>
                {item.vaultRef && <div><b>Vault:</b> {item.vaultRef}</div>}
              </div>
              <button onClick={() => removeAccess(client.id, item.id)} className="mt-2 text-[12px] font-semibold text-[#B83232]">Remove record</button>
            </div>
          ))}
        </div>
      )}
      <Card>
        <CardHead title="Add an account" />
        <form onSubmit={(event) => { event.preventDefault(); if (!draft.account.trim()) return; addAccess(client.id, draft); setDraft({ ...draft, account: "", people: "", vaultRef: "" }); }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Platform"><select value={draft.platform} onChange={(event) => setDraft({ ...draft, platform: event.target.value })} className={fieldClass}>{platforms.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Account / handle"><input value={draft.account} onChange={(event) => setDraft({ ...draft, account: event.target.value })} placeholder="@handle or page name" className={fieldClass} /></Field>
          <Field label="Who has access"><input value={draft.people} onChange={(event) => setDraft({ ...draft, people: event.target.value })} placeholder="Niamh (admin), Velinda (editor)" className={fieldClass} /></Field>
          <Field label="Owned by"><select value={draft.ownedBy} onChange={(event) => setDraft({ ...draft, ownedBy: event.target.value as AccessItem["ownedBy"] })} className={fieldClass}><option>Client</option><option>Agency</option></select></Field>
          <Field label="Status"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as AccessItem["status"] })} className={fieldClass}><option>Requested</option><option>Active</option></select></Field>
          <Field label="Vault reference (no password)"><input value={draft.vaultRef} onChange={(event) => setDraft({ ...draft, vaultRef: event.target.value })} placeholder="e.g. 1Password · Client X" className={fieldClass} /></Field>
          <div className="sm:col-span-2 lg:col-span-3"><Button kind="primary" type="submit"><Plus size={14} />Add account</Button></div>
        </form>
      </Card>
    </div>
  );
}

// ─── Reporting: one row per month, attach and tick ───
function Reporting({ client }: { client: Client }) {
  const { state, go, attachReport, updateReport } = useStore();
  const owner = isOwner(state);
  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(state.month, -index)).filter((month) => month >= client.startDate.slice(0, 7));
  const tick = (done: boolean) => (done ? <Check size={14} className="text-[#1D9E5A]" /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-[#CFCAC2]" />);
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[#6B6760]">Each month: the freelancer&apos;s report comes in, we send the client their report{owner ? " and the finance statement" : ""}. Attach the file or link and tick it off.</p>
      {months.map((month) => {
        const report = state.reports.find((item) => item.clientId === client.id && item.month === month);
        const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(month) && !post.extra);
        const delivered = Math.max(posts.filter((post) => post.status === "Published").length, Number(report?.numbers?.postsPublished) || 0);
        const sent = Boolean(report?.sentAt);
        const steps = [reportIn(report), sent, ...(owner ? [Boolean(report?.financeSentAt)] : [])];
        const doneCount = steps.filter(Boolean).length;
        const complete = doneCount === steps.length;
        return (
          <div key={month} className="min-w-0 rounded-2xl border border-[#E9E6E0] bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${complete ? "bg-[#1D9E5A] text-white" : "bg-[#F1F0ED] text-[#55514B]"}`}>{complete ? <Check size={17} /> : <FileText size={16} />}</span>
              <div className="flex-1"><div className="text-[15px] font-bold">{monthName(month)}</div><div className="text-[12px] text-[#8B867E]">{delivered} of {client.agreedPosts} posts delivered{month === state.month ? " so far" : ""}</div></div>
              <Chip t={complete ? "green" : "grey"}>{doneCount}/{steps.length} done</Chip>
            </div>
            <div className={`mt-3 grid gap-3 ${owner ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
              <div className="rounded-xl bg-[#F8F7F4] p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold">{tick(reportIn(report))}Freelancer&apos;s report</div>
                <div className="flex flex-wrap items-center gap-2">
                  <AttachField value={report?.freelancerReport} onChange={(file) => attachReport(client.id, month, "freelancerReport", file)} compact />
                  <button onClick={() => go({ view: "reports", clientId: client.id, month })} className="rounded-lg px-2 py-1 text-[12px] font-semibold text-[#1F5BC4] hover:bg-[#EEF2FA]">Open numbers</button>
                </div>
              </div>
              <div className="rounded-xl bg-[#F8F7F4] p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold">{tick(sent)}Client report {sent && <span className="font-semibold text-[#17804A]">· sent {shortDate(report!.sentAt)}</span>}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <AttachField value={report?.clientReport} onChange={(file) => attachReport(client.id, month, "clientReport", file)} compact />
                  <button onClick={() => updateReport(client.id, month, { sentAt: sent ? "" : todayIso(), approved: true, checked: true })} className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${sent ? "bg-[#E7F6EE] text-[#17804A]" : "bg-[#1E2430] text-white"}`}>{sent ? "Undo sent" : "Mark sent"}</button>
                </div>
              </div>
              {owner && (
                <div className="rounded-xl bg-[#F8F7F4] p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold">{tick(Boolean(report?.financeSentAt))}Finance statement</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AttachField value={report?.financeReport} onChange={(file) => attachReport(client.id, month, "financeReport", file)} compact />
                    <button onClick={() => updateReport(client.id, month, { financeSentAt: report?.financeSentAt ? "" : todayIso() })} className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${report?.financeSentAt ? "bg-[#E7F6EE] text-[#17804A]" : "bg-[#1E2430] text-white"}`}>{report?.financeSentAt ? "Undo sent" : "Mark sent"}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Files & links ───
const categories: ClientFile["category"][] = ["Brand", "Contract", "Photos", "Report", "Other"];

function Files({ client }: { client: Client }) {
  const { state, addFile, removeFile, updateClient } = useStore();
  const [category, setCategory] = useState<ClientFile["category"]>("Brand");
  const setLink = (key: keyof Client["links"], value: string) => updateClient(client.id, { links: { ...client.links, [key]: value } });
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <Card>
        <CardHead title="Files" sub="Contracts, brand files, photo folders. Upload or paste a link." right={
          <span className="flex items-center gap-2">
            <select value={category} onChange={(event) => setCategory(event.target.value as ClientFile["category"])} aria-label="Category" className="rounded-xl border border-[#E2DED7] bg-white px-2.5 py-1.5 text-[12px] font-semibold">{categories.map((item) => <option key={item}>{item}</option>)}</select>
            <AttachField onChange={(file) => file && addFile(client.id, { ...file, category })} label="Upload file" />
          </span>
        } />
        {client.files.length === 0 ? <Empty title="No files yet" /> : (
          <div className="space-y-4">
            {categories.filter((item) => client.files.some((file) => file.category === item)).map((item) => (
              <div key={item}>
                <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-[#8B867E]">{item}</div>
                <ul className="divide-y divide-[#F3F1ED] rounded-xl border border-[#F0EEE9]">
                  {client.files.filter((file) => file.category === item).map((file) => (
                    <li key={file.id} className="flex items-center gap-3 px-3 py-2.5">
                      <FileText size={16} className="shrink-0 text-[#8B867E]" />
                      <a href={file.url} target="_blank" rel="noreferrer" download={file.url.startsWith("data:") ? file.name : undefined} className="min-w-0 flex-1 truncate text-[13px] font-semibold hover:text-[#1F5BC4]">{file.name}</a>
                      <span className="hidden text-[12px] text-[#9A958D] sm:inline">{nameOf(state, file.addedBy)} · {shortDate(file.addedAt)}</span>
                      <button onClick={() => removeFile(client.id, file.id)} aria-label={`Remove ${file.name}`} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <CardHead title="Workspace links" />
        {([["guide", "Brand guide"], ["brain", "Strategy brain"], ["canva", "Canva templates"], ["drive", "Drive folder"], ["brandKit", "Canva brand kit"], ["publer", "Publishing tool"], ["chat", client.channel === "Email" ? "Email thread" : `${client.channel} space`]] as [keyof Client["links"], string][]).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 border-b border-[#F3F1ED] py-2.5 last:border-0">
            <span className="w-28 shrink-0 text-[13px] font-semibold">{label}</span>
            <input value={client.links[key] ?? ""} onChange={(event) => setLink(key, event.target.value)} placeholder="https://…" aria-label={label} className="min-w-0 flex-1 rounded-lg border border-[#E2DED7] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#2F6FDB]" />
            {/^https?:/.test(client.links[key] ?? "") && <a href={client.links[key]} target="_blank" rel="noreferrer" aria-label={`Open ${label}`} className="text-[#1F5BC4]"><ExternalLink size={15} /></a>}
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Finance (owners) ───
function ClientFinance({ client }: { client: Client }) {
  const { state, updateClient, setInvoice, payFreelancer, addCost, removeCost } = useStore();
  const [cost, setCost] = useState({ label: "", amount: "", recurring: false });
  const cur = state.settings.currency;
  const invoice = state.invoices.find((item) => item.clientId === client.id && item.month === state.month);
  const paidOut = state.payouts.some((item) => item.clientId === client.id && item.month === state.month);
  const costs = client.costs.filter((item) => (item.recurring ? item.month <= state.month : item.month === state.month));
  const extra = costs.reduce((sum, item) => sum + item.amount, 0);
  const income = incomeBase(state, client);
  const freelance = freelancerCostBase(state, client);
  const margin = income - freelance - extra;
  const feeCur = clientCurrency(state, client);
  const payCur = freelancerCurrency(state, client);
  const payout = state.payouts.find((item) => item.clientId === client.id && item.month === state.month);
  const person = state.freelancers.find((item) => item.id === client.freelancerId);
  const hasFees = Boolean(person?.fees.some((fee) => fee.clientId === client.id));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Income", money(income, cur), "#EAF1FD", "#1F5BC4"], ["Freelancer", money(freelance, cur), "#FFF3D9", "#94600A"], ["Other costs", money(extra, cur), "#FFF3D9", "#94600A"], ["Margin", money(margin, cur), "#E7F6EE", "#17804A"]].map(([label, value, bg, ink]) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: bg }}><div className="text-[12px] font-bold" style={{ color: ink }}>{label}</div><div className="mt-1 text-[24px] font-extrabold" style={{ color: ink }}>{value}</div></div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHead title="Agreed amounts" sub="Changes update Finance straight away. Clients and freelancers never see this." />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={`Monthly fee · ${feeCur}`}><input type="number" min={0} value={client.fee} onChange={(event) => updateClient(client.id, { fee: Number(event.target.value) })} className={fieldClass} /></Field>
            <Field label={`Add-ons · ${feeCur}`}><input type="number" min={0} value={client.addOnFee} onChange={(event) => updateClient(client.id, { addOnFee: Number(event.target.value) })} className={fieldClass} /></Field>
            {hasFees ? <div className="rounded-xl bg-[#F8F7F4] p-3 text-[12px] text-[#6B6760]"><div className="font-semibold text-[#1E2430]">Freelancer</div>Set by the payments below.</div> : <Field label={`Freelancer · ${payCur}`}><input type="number" min={0} value={client.freelancerFee} onChange={(event) => updateClient(client.id, { freelancerFee: Number(event.target.value) })} className={fieldClass} /></Field>}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="The client pays in" hint={approx(state, client.fee + client.addOnFee, feeCur) ? `${money(client.fee + client.addOnFee, feeCur)} is ${approx(state, client.fee + client.addOnFee, feeCur).replace("≈ ", "about ")} at the rate in Settings.` : "Same as the main currency."}><select value={feeCur} onChange={(event) => updateClient(client.id, { currency: event.target.value })} className={fieldClass}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="We pay the freelancer in" hint={client.freelancerId && approx(state, client.freelancerFee, payCur) ? `${money(client.freelancerFee, payCur)} is ${approx(state, client.freelancerFee, payCur).replace("≈ ", "about ")}.` : "Their own currency by default."}><select value={payCur} onChange={(event) => updateClient(client.id, { freelancerCurrency: event.target.value })} className={fieldClass}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></Field>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#F8F7F4] p-3"><span className="flex-1 text-[13px] font-semibold">{monthName(state.month)} invoice</span><Segmented size="sm" value={invoice?.status ?? "Not sent"} onChange={(status) => setInvoice(client.id, status)} options={[{ value: "Not sent", label: "Not sent" }, { value: "Sent", label: "Sent" }, { value: "Paid", label: "Paid" }]} /></div>
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#F8F7F4] p-3"><span className="flex-1 text-[13px] font-semibold">Pay {nameOf(state, client.freelancerId)}</span>{!client.freelancerId ? <Chip>No freelancer</Chip> : paidOut ? <Chip t="green" dot>Paid{payout?.amount ? ` ${money(payout.amount, payout.currency ?? cur)}` : ""}</Chip> : invoice?.status === "Paid" ? <PayButton client={client} label="Mark paid" /> : <Chip t="amber">After the client pays</Chip>}</div>
          </div>
        </Card>
        {person && <PaymentsCard person={person} client={client} />}
        <Card>
          <CardHead title="Costs on this client" sub="Stock, ads, printing, extra freelance work… They also show in Finance." />
          <ul className="space-y-1.5">
            {costs.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-xl bg-[#F8F7F4] px-3 py-2 text-[13px]">
                <span className="flex-1 font-semibold">{item.label}{item.recurring && <span className="ml-1.5 text-[11px] font-normal text-[#8B867E]">monthly</span>}</span>
                <b>{money(item.amount, cur)}</b>
                <button onClick={() => removeCost(client.id, item.id)} aria-label={`Remove ${item.label}`} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>
              </li>
            ))}
            {costs.length === 0 && <li className="text-[13px] text-[#8B867E]">No costs this month.</li>}
          </ul>
          <form onSubmit={(event) => { event.preventDefault(); const amount = Number(cost.amount); if (!cost.label.trim() || !(amount > 0)) return; addCost(client.id, { label: cost.label.trim(), amount, recurring: cost.recurring }); setCost({ label: "", amount: "", recurring: false }); }} className="mt-3 flex flex-wrap items-center gap-2">
            <input value={cost.label} onChange={(event) => setCost({ ...cost, label: event.target.value })} placeholder="What for" aria-label="Cost description" className="min-w-[140px] flex-1 rounded-xl border border-[#E2DED7] px-3 py-2 text-[13px]" />
            <input type="number" min={0} value={cost.amount} onChange={(event) => setCost({ ...cost, amount: event.target.value })} placeholder={cur} aria-label="Amount" className="w-24 rounded-xl border border-[#E2DED7] px-3 py-2 text-[13px]" />
            <label className="flex items-center gap-1.5 text-[12px] font-semibold"><input type="checkbox" checked={cost.recurring} onChange={(event) => setCost({ ...cost, recurring: event.target.checked })} />Monthly</label>
            <Button type="submit" kind="primary" size="sm"><Plus size={13} />Add cost</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
