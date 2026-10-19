"use client";

import { useState } from "react";
import { ArrowRight, ExternalLink, Plus } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { canBeAssigned, gate, isFreelancer, isOwner, me, missing, money, monthName, myClients, nameOf, personById, progress, stageOf, stages, turnOf } from "@/lib/works/logic";
import type { ApprovalMode, Client } from "@/lib/works/types";
import { Shell } from "./Shell";
import { ChecklistView, GateBanner } from "./Checklist";
import { ClientMarketing } from "./Marketing";
import { ClientReporting } from "./Reports";
import { Avatar, Bar, Button, Card, CardHead, Chip, ClientMark, Empty, Field, Light, Segmented, fieldClass, tone } from "./kit";

export const modeText: Record<ApprovalMode, string> = {
  A: "A · Client approves the plan and every post",
  B: "B · Client approves the plan only",
  C: "C · Internal approval only",
};

// ─── Clients list ───
export function ClientsList() {
  const { state, go, addClient } = useStore();
  const [filter, setFilter] = useState<"all" | "Onboarding" | "Live" | "attention">("all");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const freelancer = isFreelancer(state);
  const clients = myClients(state);
  const needs = (client: Client) => gate(client.checklist).light !== "green" || !client.freelancerId;
  const shown = clients.filter((client) => filter === "all" || (filter === "attention" ? needs(client) : client.stage === filter));

  return (
    <Shell
      title={freelancer ? "My clients" : "Clients"}
      sub={freelancer ? "The accounts you work on." : `${clients.filter((c) => c.stage === "Live").length} live · ${clients.filter((c) => c.stage === "Onboarding").length} onboarding`}
      actions={!freelancer && <Button kind="primary" onClick={() => setAdding(true)}><Plus size={15} />New client</Button>}
    >
      {!freelancer && (
        <div className="mb-4">
          <Segmented value={filter} onChange={setFilter} options={[
            { value: "all", label: "All", count: clients.length },
            { value: "Onboarding", label: "Onboarding", count: clients.filter((c) => c.stage === "Onboarding").length },
            { value: "Live", label: "Live", count: clients.filter((c) => c.stage === "Live").length },
            { value: "attention", label: "Needs attention", count: clients.filter(needs).length },
          ]} />
        </div>
      )}
      {adding && (
        <Card className="mb-4">
          <form onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; const id = addClient(name.trim()); setAdding(false); setName(""); go({ view: "client", clientId: id, tab: "checklist" }); }} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1"><Field label="Client name"><input autoFocus value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} placeholder="Company name" /></Field></div>
            <Button kind="primary" type="submit">Create and open checklist</Button>
            <Button type="button" kind="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <p className="w-full text-[12px] text-[#8B867E]">Won a lead? Use Leads → Mark as won instead: it carries the package and fee across.</p>
          </form>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((client) => {
          const g = gate(client.checklist);
          const p = progress(client.checklist);
          const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(state.month));
          const ready = posts.filter((post) => stageOf(post.status) >= 3).length;
          const fl = personById(state, client.freelancerId);
          const blocking = g.blocking.slice(0, 2);
          return (
            <button key={client.id} onClick={() => go({ view: "client", clientId: client.id })} className="group flex min-w-0 flex-col rounded-2xl border border-[#E9E6E0] bg-white p-5 text-left transition hover:border-[#D2CCC2] hover:shadow-[0_8px_24px_rgba(30,36,48,.06)]">
              <div className="flex items-start gap-3">
                <ClientMark client={client} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-bold">{client.name}</div>
                  <div className="truncate text-[12px] text-[#8B867E]">{client.sector}</div>
                </div>
                <Chip t={client.stage === "Live" ? "green" : client.stage === "Onboarding" ? "blue" : "grey"}>{client.stage}</Chip>
              </div>
              {!freelancer && (
                <div className="mt-4 rounded-xl p-3" style={{ background: tone[g.light].bg }}>
                  <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: tone[g.light].ink }}>
                    <Light light={g.light} size={8} /> {g.light === "green" ? "Ready for production" : g.label}
                    <span className="ml-auto font-semibold text-[#55514B]">{p.percent}%</span>
                  </div>
                  {blocking.length > 0 && <div className="mt-1 truncate text-[12px] text-[#55514B]">{blocking.map((item) => item.label.split(":")[0]).join(" · ")}</div>}
                </div>
              )}
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-[12px] font-semibold text-[#55514B]"><span>{monthName(state.month).split(" ")[0]} content approved</span><span>{ready} / {client.agreedPosts}</span></div>
                <Bar value={(ready / client.agreedPosts) * 100} color={tone.green.dot} />
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-[#F0EEE9] pt-3 text-[12px] text-[#6B6760]">
                {fl ? <><Avatar name={fl.name} color={fl.color} size={22} />{fl.name}</> : <Chip t="red">No freelancer</Chip>}
                <span className="ml-auto">{client.package} · Mode {client.approvalMode}</span>
                <ArrowRight size={15} className="text-[#B5B0A8] transition group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>
      {shown.length === 0 && <Empty title="No clients in this view" />}
    </Shell>
  );
}

// ─── Client profile ───
export function ClientProfile({ clientId, tab, sub, postId }: { clientId: string; tab?: string; sub?: string; postId?: string }) {
  const { state, go } = useStore();
  const client = state.clients.find((item) => item.id === clientId);
  const freelancer = isFreelancer(state);
  const owner = isOwner(state);
  if (!client || (freelancer && client.freelancerId !== state.me)) return <Shell title="Client not found"><Empty title="This client is not available to you." /></Shell>;

  const tabs = freelancer
    ? [{ value: "marketing", label: "Marketing" }, { value: "reporting", label: "Reporting" }]
    : [
        { value: "overview", label: "Overview" },
        { value: "checklist", label: "Checklist", count: missing(client.checklist).length },
        { value: "marketing", label: "Marketing" },
        { value: "reporting", label: "Reporting" },
        { value: "files", label: "Files & links" },
        ...(owner ? [{ value: "finance", label: "Finance" }] : []),
      ];
  const current = tabs.some((item) => item.value === tab) ? tab! : tabs[0].value;
  const g = gate(client.checklist);
  const fl = personById(state, client.freelancerId);

  return (
    <Shell
      title={<span className="flex items-center gap-3"><ClientMark client={client} size={44} />{client.name}</span>}
      sub={
        <span className="flex flex-wrap items-center gap-2">
          <Chip t={client.stage === "Live" ? "green" : "blue"}>{client.stage}</Chip>
          <Chip>{client.package}{client.addOns.length ? ` + ${client.addOns.join(", ")}` : ""}</Chip>
          <Chip t="purple">Approval mode {client.approvalMode}</Chip>
          {!freelancer && <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: tone[g.light].ink }}><Light light={g.light} size={8} />{g.light === "green" ? "Ready for production" : g.label}</span>}
          {fl && <span className="flex items-center gap-1.5 text-[13px]"><Avatar name={fl.name} color={fl.color} size={20} />{fl.name}</span>}
        </span>
      }
    >
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-[#E9E6E0]">
        {tabs.map((item) => (
          <button key={item.value} onClick={() => go({ view: "client", clientId, tab: item.value })} className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-[14px] font-semibold ${current === item.value ? "border-[#1E2430] text-[#1E2430]" : "border-transparent text-[#8B867E] hover:text-[#1E2430]"}`}>
            {item.label}
            {"count" in item && !!item.count && <span className="ml-1.5 rounded-full bg-[#FDECEC] px-1.5 py-0.5 text-[11px] font-bold text-[#B83232]">{item.count}</span>}
          </button>
        ))}
      </div>
      {current === "overview" && <Overview client={client} />}
      {current === "checklist" && <ClientChecklist client={client} />}
      {current === "marketing" && <ClientMarketing client={client} sub={sub} postId={postId} />}
      {current === "reporting" && <ClientReporting client={client} />}
      {current === "files" && <FilesAndLinks client={client} />}
      {current === "finance" && owner && <ClientFinance client={client} />}
    </Shell>
  );
}

function ClientChecklist({ client }: { client: Client }) {
  const { updateCheck } = useStore();
  return (
    <div className="space-y-4">
      <GateBanner items={client.checklist} />
      <ChecklistView items={client.checklist} onChange={(id, patch) => updateCheck(client.id, id, patch)} copyGroup="Questionnaire" />
    </div>
  );
}

function Overview({ client }: { client: Client }) {
  const { state, go, updateClient, assignFreelancer, setHours } = useStore();
  const owner = isOwner(state);
  const g = gate(client.checklist);
  const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(state.month));
  const counts = stages.map((_, index) => posts.filter((post) => stageOf(post.status) === index).length);
  const plan = client.planApproval[state.month];
  const hours = client.hours[state.month] ?? { owner: 0, ops: 0, freelancer: 0 };
  const myTurn = posts.filter((post) => turnOf(state, post).who === state.me);
  const set = (patch: Partial<Client>) => updateClient(client.id, patch);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <div className="space-y-5">
        <Card>
          <CardHead title="What is still missing" sub="Essential items block production. Info items do not." right={<Button size="sm" onClick={() => go({ view: "client", clientId: client.id, tab: "checklist" })}>Open checklist</Button>} />
          {g.blocking.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#E7F6EE] px-4 py-3 text-[14px] font-semibold text-[#17804A]"><Light light="green" size={9} />Ready for production. {missing(client.checklist).length ? `${missing(client.checklist).length} info item${missing(client.checklist).length === 1 ? "" : "s"} still open.` : "Everything is in."}</div>
          ) : (
            <ul className="space-y-1.5">
              {g.blocking.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2.5 rounded-xl bg-[#F8F7F4] px-3.5 py-2.5 text-[13px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.status === "Requested" ? tone.amber.dot : tone.red.dot }} />
                  <span className="min-w-0 flex-1 font-semibold">{item.label}</span>
                  <span className="text-[12px] text-[#6B6760]">{item.group}</span>
                  <Chip t={item.status === "Requested" ? "amber" : "red"}>{item.owner === "client" ? (item.status === "Requested" ? "Asked client" : "Not asked") : item.status === "Requested" ? "In progress" : "To do"}</Chip>
                  <span className="w-16 text-right text-[12px] font-semibold text-[#55514B]">{nameOf(state, item.owner)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHead title={`${monthName(state.month)} content`} sub={`${posts.length} of ${client.agreedPosts} agreed posts started`} right={<Button size="sm" onClick={() => go({ view: "client", clientId: client.id, tab: "marketing", sub: "content" })}>Open content</Button>} />
          <div className="grid grid-cols-5 gap-2">
            {stages.map((stage, index) => (
              <div key={stage} className="rounded-xl bg-[#F8F7F4] p-3 text-center">
                <div className="text-[22px] font-extrabold">{counts[index]}</div>
                <div className="text-[12px] font-semibold text-[#6B6760]">{stage}</div>
              </div>
            ))}
          </div>
          {posts.length < client.agreedPosts && <p className="mt-3 text-[13px] font-semibold text-[#B83232]">{client.agreedPosts - posts.length} posts not started yet. Approve ideas to fill the gaps.</p>}
          {client.approvalMode !== "C" && (
            <div className="mt-3 flex items-center gap-2 text-[13px]">
              <span className="font-semibold">Month plan:</span>
              <Chip t={plan?.status === "Approved" ? "green" : plan?.status === "Sent" ? "amber" : "red"} dot>{plan?.status === "Approved" ? `Approved by client · ${plan.via}` : plan?.status === "Sent" ? "Sent, waiting for client" : "Not sent"}</Chip>
            </div>
          )}
          {myTurn.length > 0 && <p className="mt-3 text-[13px] text-[#1F5BC4]">{myTurn.length} post{myTurn.length === 1 ? " is" : "s are"} waiting on you.</p>}
        </Card>

        {owner || me(state).role === "ops" ? (
          <Card>
            <CardHead title="Hours this month" sub="Light tracking: total hours on this account by role." />
            <div className="grid grid-cols-3 gap-3">
              {(["owner", "ops", "freelancer"] as const).map((role) => (
                <Field key={role} label={role === "owner" ? "Partners" : role === "ops" ? "Operations" : "Freelancer"}>
                  <input type="number" min={0} step={0.5} value={hours[role]} onChange={(event) => setHours(client.id, state.month, role, Number(event.target.value))} className={fieldClass} />
                </Field>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      <div className="space-y-5">
        <Card>
          <CardHead title="The deal" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Package"><select value={client.package} onChange={(event) => set({ package: event.target.value as Client["package"], agreedPosts: event.target.value === "Growth" ? 12 : 8 })} className={fieldClass}><option>Essential</option><option>Growth</option></select></Field>
            <Field label="Posts agreed per month"><input type="number" min={1} value={client.agreedPosts} onChange={(event) => set({ agreedPosts: Number(event.target.value) })} className={fieldClass} /></Field>
            <Field label="Add-ons"><input value={client.addOns.join(", ")} onChange={(event) => set({ addOns: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} placeholder="Extra newsletter, brand setup…" className={fieldClass} /></Field>
            <Field label="Stage"><select value={client.stage} onChange={(event) => set({ stage: event.target.value as Client["stage"] })} className={fieldClass}><option>Onboarding</option><option>Live</option><option>Paused</option></select></Field>
          </div>
          <div className="mt-3"><Field label="Approval mode"><select value={client.approvalMode} onChange={(event) => set({ approvalMode: event.target.value as ApprovalMode })} className={fieldClass}>{(Object.keys(modeText) as ApprovalMode[]).map((mode) => <option key={mode} value={mode}>{modeText[mode]}</option>)}</select></Field></div>
        </Card>

        <Card>
          <CardHead title="People" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Main contact"><input value={client.mainContact.name} onChange={(event) => set({ mainContact: { ...client.mainContact, name: event.target.value } })} className={fieldClass} /></Field>
            <Field label="Contact email"><input value={client.mainContact.email} onChange={(event) => set({ mainContact: { ...client.mainContact, email: event.target.value } })} className={fieldClass} /></Field>
            <Field label="The one named approver"><input value={client.approver.name} onChange={(event) => set({ approver: { ...client.approver, name: event.target.value } })} className={fieldClass} /></Field>
            <Field label="Billing contact"><input value={client.billingContact} onChange={(event) => set({ billingContact: event.target.value })} className={fieldClass} /></Field>
            <Field label="Expert who checks technical copy" hint="An engineer or specialist on the client's side."><input value={client.expertReviewer} onChange={(event) => set({ expertReviewer: event.target.value })} className={fieldClass} /></Field>
            <Field label="Where we talk"><select value={client.channel} onChange={(event) => set({ channel: event.target.value as Client["channel"] })} className={fieldClass}><option>Email</option><option>Slack</option><option>Google Chat</option></select></Field>
          </div>
          <div className="mt-4 grid gap-3 border-t border-[#F0EEE9] pt-4 sm:grid-cols-2">
            <Field label="Freelancer" hint="Only freelancers with NDA and contract signed can be assigned.">
              <select value={client.freelancerId ?? ""} onChange={(event) => assignFreelancer(client.id, event.target.value)} className={fieldClass}>
                <option value="">Not assigned</option>
                {state.freelancers.filter((person) => person.status !== "Offboarded").map((person) => <option key={person.id} value={person.id}>{person.name}{canBeAssigned(person) ? "" : " · NDA/contract missing"}</option>)}
              </select>
            </Field>
            <Field label="Operations"><select value={client.opsId} onChange={(event) => set({ opsId: event.target.value })} className={fieldClass}>{state.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
          </div>
        </Card>
      </div>
    </div>
  );
}

function LinkRow({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[#F5F3EF] py-3 last:border-0">
      <span className="w-40 text-[13px] font-semibold">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={label} className="min-w-[220px] flex-1 rounded-xl border border-[#E2DED7] px-3 py-2 text-[13px] outline-none focus:border-[#2F6FDB]" />
      {/^https?:\/\//.test(value) ? <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-[#EEF2FA] px-3 py-2 text-[12px] font-semibold text-[#1F5BC4]">Open <ExternalLink size={12} /></a> : <span className="w-[66px]" />}
    </div>
  );
}

function FilesAndLinks({ client }: { client: Client }) {
  const { state, updateClient, updateCheck } = useStore();
  const setLink = (key: keyof Client["links"], value: string) => updateClient(client.id, { links: { ...client.links, [key]: value } });
  const brandItems = client.checklist.filter((item) => item.group === "Brand assets");
  const designs = state.posts.filter((post) => post.clientId === client.id && (post.designLink || post.driveLink));
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHead title="Workspace links" sub="Everything for this client, one click away." />
        <LinkRow label="Drive folder" value={client.links.drive} onChange={(value) => setLink("drive", value)} placeholder="https://drive.google.com/…" />
        <LinkRow label="Canva folder" value={client.links.canva} onChange={(value) => setLink("canva", value)} placeholder="https://www.canva.com/…" />
        <LinkRow label="Brand kit" value={client.links.brandKit} onChange={(value) => setLink("brandKit", value)} placeholder="Canva brand kit or guidelines PDF" />
        <LinkRow label="Publer workspace" value={client.links.publer} onChange={(value) => setLink("publer", value)} placeholder="https://app.publer.com/…" />
        <LinkRow label={`${client.channel} channel`} value={client.links.chat} onChange={(value) => setLink("chat", value)} placeholder="Link to the channel or email thread" />
      </Card>
      <Card>
        <CardHead title="Brand assets" sub="From the checklist. Paste the link to each one." />
        {brandItems.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-3 border-b border-[#F5F3EF] py-3 last:border-0">
            <span className="h-2 w-2 rounded-full" style={{ background: item.status === "Received" ? tone.green.dot : item.status === "Requested" ? tone.amber.dot : tone.red.dot }} />
            <span className="w-48 text-[13px] font-semibold">{item.label.split(",")[0]}</span>
            <input value={item.note} onChange={(event) => updateCheck(client.id, item.id, { note: event.target.value, status: event.target.value.trim() ? "Received" : item.status })} placeholder="Link" aria-label={item.label} className="min-w-[180px] flex-1 rounded-xl border border-[#E2DED7] px-3 py-2 text-[13px] outline-none focus:border-[#2F6FDB]" />
          </div>
        ))}
      </Card>
      <Card className="xl:col-span-2">
        <CardHead title="Editable design files" sub="Canva / Adobe and Drive links attached to posts." />
        {designs.length === 0 ? <Empty title="No design links yet">They appear here when a freelancer attaches a Canva or Drive link to a post.</Empty> : (
          <ul className="divide-y divide-[#F5F3EF]">
            {designs.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]">
                <span className="flex-1 font-semibold">{post.title}</span>
                {post.designLink && <a href={post.designLink} target="_blank" rel="noreferrer" className="font-semibold text-[#1F5BC4]">Editable design ↗</a>}
                {post.driveLink && <a href={post.driveLink} target="_blank" rel="noreferrer" className="font-semibold text-[#1F5BC4]">Final files ↗</a>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ClientFinance({ client }: { client: Client }) {
  const { state, updateClient, setInvoice, payFreelancer } = useStore();
  const invoice = state.invoices.find((item) => item.clientId === client.id && item.month === state.month);
  const paidOut = state.payouts.some((item) => item.clientId === client.id && item.month === state.month);
  const income = client.fee + client.addOnFee;
  const margin = income - client.freelancerFee;
  const cur = state.settings.currency;
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHead title="Fee and cost" sub="Owners only. Changes here update Finance straight away. Clients and freelancers never see this." />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={`Monthly fee · ${cur}`}><input type="number" min={0} value={client.fee} onChange={(event) => updateClient(client.id, { fee: Number(event.target.value) })} className={fieldClass} /></Field>
          <Field label={`Add-ons · ${cur}`}><input type="number" min={0} value={client.addOnFee} onChange={(event) => updateClient(client.id, { addOnFee: Number(event.target.value) })} className={fieldClass} /></Field>
          <Field label={`Freelancer · ${cur}`}><input type="number" min={0} value={client.freelancerFee} onChange={(event) => updateClient(client.id, { freelancerFee: Number(event.target.value) })} className={fieldClass} /></Field>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[["Income", money(income, cur)], ["Freelancer", money(client.freelancerFee, cur)], ["Margin", money(margin, cur)]].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#F8F7F4] p-3"><div className="text-[12px] font-semibold text-[#6B6760]">{label}</div><div className="text-[20px] font-extrabold">{value}</div></div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHead title={`${monthName(state.month)}`} sub="Freelancers are paid after the client pays." />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#F8F7F4] p-3.5">
            <span className="flex-1 text-[14px] font-semibold">Client invoice</span>
            <Segmented size="sm" value={invoice?.status ?? "Not sent"} onChange={(status) => setInvoice(client.id, status)} options={[{ value: "Not sent", label: "Not sent" }, { value: "Sent", label: "Sent" }, { value: "Paid", label: "Paid" }]} />
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#F8F7F4] p-3.5">
            <span className="flex-1 text-[14px] font-semibold">Pay {nameOf(state, client.freelancerId)} · {money(client.freelancerFee, cur)}</span>
            {!client.freelancerId ? <Chip>No freelancer</Chip> : paidOut ? <Chip t="green" dot>Paid</Chip> : invoice?.status === "Paid" ? <Button size="sm" kind="good" onClick={() => payFreelancer(client.id)}>Mark paid</Button> : <Chip t="amber">Waiting for client payment</Chip>}
          </div>
        </div>
      </Card>
    </div>
  );
}

