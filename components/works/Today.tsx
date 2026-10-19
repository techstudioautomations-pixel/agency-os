"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { buildQueue, canBeAssigned, gate, isFreelancer, isOwner, me, monthName, myClients, nameOf, personById, progress, shiftMonth, stageOf, todayIso, turnOf, type QueueItem } from "@/lib/works/logic";
import type { State } from "@/lib/works/types";
import { Shell } from "./Shell";
import { Avatar, Bar, Card, CardHead, Chip, ClientMark, Empty, Light, Segmented, tone, type Tone } from "./kit";

const kindTone: Record<QueueItem["kind"], Tone> = {
  Review: "purple", Fix: "amber", Client: "blue", Schedule: "green", Checklist: "grey", Report: "blue", Invoice: "amber", Lead: "green", Freelancer: "grey", Plan: "blue", Ideas: "purple",
};

export function QueueList({ items, showWho = false }: { items: QueueItem[]; showWho?: boolean }) {
  const { state, go } = useStore();
  if (!items.length) return <Empty title="You are clear">Nothing is waiting on you right now.</Empty>;
  return (
    <ul className="divide-y divide-[#F0EEE9]">
      {items.map((item) => {
        const client = state.clients.find((entry) => entry.id === item.clientId);
        const owner = personById(state, item.who);
        return (
          <li key={item.id}>
            <button onClick={() => go(item.route)} className="group flex w-full items-center gap-3 px-1 py-3 text-left">
              <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: item.severity === 2 ? tone.red.dot : item.severity === 1 ? tone.amber.dot : "#E2DED7" }} />
              {client ? <ClientMark client={client} size={34} /> : <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-xl bg-[#F1F0ED] text-[13px] font-bold text-[#6B6760]">{item.kind[0]}</span>}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold">{item.verb}</span>
                  <Chip t={kindTone[item.kind]}>{item.kind}</Chip>
                  {item.severity === 2 && <Chip t="red" dot>Overdue</Chip>}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-[#6B6760]">{client ? `${client.name} · ` : ""}{item.detail}</span>
              </span>
              {showWho && owner && <span className="hidden items-center gap-1.5 text-[12px] font-semibold text-[#55514B] sm:flex"><Avatar name={owner.name} color={owner.color} size={22} />{owner.name}</span>}
              <ArrowRight size={16} className="shrink-0 text-[#B5B0A8] transition group-hover:translate-x-0.5 group-hover:text-[#1E2430]" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MonthTimeline({ state }: { state: State }) {
  const { dates } = state.settings;
  const live = state.clients.filter((client) => client.stage === "Live");
  const monthPosts = state.posts.filter((post) => post.date.startsWith(state.month));
  const agreed = live.reduce((sum, client) => sum + client.agreedPosts, 0);
  const isCurrent = state.month === todayIso().slice(0, 7);
  const today = isCurrent ? Number(todayIso().slice(8, 10)) : state.month < todayIso().slice(0, 7) ? 99 : 0;
  const planned = live.filter((client) => client.approvalMode !== "C");
  const lastMonth = shiftMonth(state.month, -1);
  const reportClients = live.filter((client) => client.startDate.slice(0, 7) <= lastMonth);
  const steps = [
    { day: dates.plan, label: "Plan approved", done: planned.filter((client) => client.planApproval[state.month]?.status === "Approved").length, total: planned.length },
    { day: dates.design, label: "Designs done", done: monthPosts.filter((post) => stageOf(post.status) >= 2).length, total: agreed },
    { day: dates.approval, label: "Client approved", done: monthPosts.filter((post) => stageOf(post.status) >= 3).length, total: agreed },
    { day: dates.schedule, label: "Scheduled", done: monthPosts.filter((post) => ["Scheduled", "Published"].includes(post.status)).length, total: agreed },
    { day: 7, label: `${monthName(lastMonth).split(" ")[0]} reports sent`, done: state.reports.filter((report) => report.month === lastMonth && report.sentAt).length, total: reportClients.length, first: true },
  ];
  return (
    <Card>
      <CardHead title="The monthly cycle" sub={`Where all clients are against the dates we agreed for ${monthName(state.month).split(" ")[0]}.`} />
      <ol className="space-y-3.5">
        {steps.map((step) => {
          const percent = step.total ? Math.round((step.done / step.total) * 100) : 100;
          const late = today > step.day && percent < 100;
          return (
            <li key={step.label}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px]">
                <span className="flex items-center gap-2 font-semibold">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold ${late ? "bg-[#FDECEC] text-[#B83232]" : percent === 100 ? "bg-[#E7F6EE] text-[#17804A]" : "bg-[#F1F0ED] text-[#55514B]"}`}>{step.day}</span>
                  {step.label}
                </span>
                <span className={`font-bold ${late ? "text-[#B83232]" : "text-[#55514B]"}`}>{step.done} / {step.total}</span>
              </div>
              <Bar value={percent} color={late ? tone.red.dot : percent === 100 ? tone.green.dot : "#2F6FDB"} />
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-[12px] text-[#8B867E]">Capture call by the {dates.capture}th · plan by the {dates.plan}th · designs by the {dates.design}th · client approval by the {dates.approval}th · scheduled by the {dates.schedule}th · last month&apos;s report in the first week.</p>
    </Card>
  );
}

function ClientsGlance({ state }: { state: State }) {
  const { go } = useStore();
  const lastMonth = shiftMonth(state.month, -1);
  const freelancer = isFreelancer(state);
  const clients = myClients(state);
  return (
    <Card pad={false}>
      <div className="px-5 pt-5"><CardHead title={freelancer ? "My clients" : "Clients at a glance"} sub="Setup, this month's content and last month's report." /></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-y border-[#F0EEE9] text-[11px] font-bold uppercase tracking-wide text-[#8B867E]">
              <th className="px-5 py-2.5">Client</th>
              {!freelancer && <th className="px-3">Setup</th>}
              <th className="px-3">Content this month</th>
              <th className="px-3">Waiting on</th>
              <th className="px-3">{monthName(lastMonth).split(" ")[0]} report</th>
              {!freelancer && <th className="px-3">Freelancer</th>}
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const g = gate(client.checklist);
              const p = progress(client.checklist);
              const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(state.month));
              const ready = posts.filter((post) => ["Ready to schedule", "Scheduled", "Published"].includes(post.status)).length;
              const waiting = posts.map((post) => turnOf(state, post)).filter((turn) => turn.who);
              const byWho = Object.entries(waiting.reduce<Record<string, number>>((acc, turn) => ({ ...acc, [turn.who]: (acc[turn.who] ?? 0) + 1 }), {}));
              const report = state.reports.find((item) => item.clientId === client.id && item.month === lastMonth);
              const reportState = client.startDate.slice(0, 7) > lastMonth ? { label: "Not due", t: "grey" as const } : report?.sentAt ? { label: "Sent", t: "green" as const } : report?.approved ? { label: "Approved, not sent", t: "amber" as const } : report?.numbers ? { label: "Numbers in", t: "blue" as const } : { label: "Numbers missing", t: "red" as const };
              const fl = personById(state, client.freelancerId);
              return (
                <tr key={client.id} onClick={() => go({ view: "client", clientId: client.id })} className="cursor-pointer border-b border-[#F5F3EF] hover:bg-[#FBFAF8]">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5">
                      <ClientMark client={client} size={30} />
                      <span><span className="block font-bold">{client.name}</span><span className="text-[12px] text-[#8B867E]">{client.package} · {client.stage}</span></span>
                    </span>
                  </td>
                  {!freelancer && (
                    <td className="px-3"><span className="flex items-center gap-2"><Light light={g.light} /><span className="font-semibold">{p.percent}%</span>{g.light !== "green" && <span className="text-[12px] text-[#8B867E]">{g.label}</span>}</span></td>
                  )}
                  <td className="px-3">
                    <div className="flex items-center gap-2"><span className="w-16 font-semibold">{ready} / {client.agreedPosts}</span><span className="w-28"><Bar value={(ready / client.agreedPosts) * 100} color={tone.green.dot} /></span></div>
                    {posts.length < client.agreedPosts && <span className="text-[12px] text-[#B83232]">{client.agreedPosts - posts.length} not started</span>}
                  </td>
                  <td className="px-3">
                    <span className="flex flex-wrap gap-1">
                      {byWho.map(([who, count]) => <Chip key={who} t={who === state.me ? "blue" : "grey"}>{nameOf(state, who)} {count}</Chip>)}
                      {byWho.length === 0 && <span className="text-[12px] text-[#8B867E]">Nobody</span>}
                    </span>
                  </td>
                  <td className="px-3"><Chip t={reportState.t} dot>{reportState.label}</Chip></td>
                  {!freelancer && <td className="px-3">{fl ? <span className="flex items-center gap-1.5"><Avatar name={fl.name} color={fl.color} size={22} />{fl.name}</span> : <Chip t="red">Unassigned</Chip>}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TeamAllocation({ state }: { state: State }) {
  const { go } = useStore();
  const unassigned = state.clients.filter((client) => !client.freelancerId);
  return (
    <Card>
      <CardHead title="Who is on which account" sub="Freelancer allocation and what is on their desk now." right={<button onClick={() => go({ view: "freelancers" })} className="text-[13px] font-semibold text-[#1F5BC4]">All freelancers</button>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {state.freelancers.filter((person) => person.status !== "Offboarded").map((person) => {
          const accounts = state.clients.filter((client) => client.freelancerId === person.id);
          const onDesk = state.posts.filter((post) => turnOf(state, post).who === person.id).length;
          const ok = canBeAssigned(person);
          return (
            <button key={person.id} onClick={() => go({ view: "freelancers", freelancerId: person.id })} className="rounded-xl border border-[#EEEBE5] p-3.5 text-left hover:border-[#D5D0C7]">
              <div className="flex items-center gap-2.5">
                <Avatar name={person.name} color={person.color} size={34} />
                <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-bold">{person.name}</div><div className="truncate text-[12px] text-[#8B867E]">{person.speciality}</div></div>
                {!ok && <Chip t="red">Can&apos;t assign</Chip>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {accounts.map((client) => <span key={client.id} className="flex items-center gap-1.5 rounded-lg bg-[#F6F5F2] px-2 py-1 text-[12px] font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: client.color }} />{client.name}</span>)}
                {accounts.length === 0 && <span className="text-[12px] text-[#8B867E]">{ok ? "No accounts yet" : "NDA or contract missing"}</span>}
              </div>
              <div className="mt-3 flex items-center justify-between text-[12px] text-[#6B6760]"><span>{accounts.length} of {person.capacity} accounts</span><span className={onDesk ? "font-bold text-[#1F5BC4]" : ""}>{onDesk} on their desk</span></div>
            </button>
          );
        })}
      </div>
      {unassigned.length > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#FDECEC] px-3.5 py-2.5 text-[13px] font-semibold text-[#B83232]">
          <AlertTriangle size={15} /> No freelancer on {unassigned.map((client) => client.name).join(", ")}
        </div>
      )}
    </Card>
  );
}

export function Today() {
  const { state } = useStore();
  const person = me(state);
  const all = buildQueue(state);
  const mine = all.filter((item) => item.who === state.me);
  const [scope, setScope] = useState<"me" | "all">("me");
  const owner = isOwner(state);
  const freelancer = isFreelancer(state);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const overdue = mine.filter((item) => item.severity === 2).length;
  const shown = scope === "me" ? mine : all;

  return (
    <Shell
      title={`${greeting}, ${person.name.split(" ")[0]}`}
      sub={mine.length ? <>{mine.length} thing{mine.length === 1 ? " needs" : "s need"} you{overdue ? <> · <b className="text-[#B83232]">{overdue} overdue</b></> : null}</> : <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} className="text-[#1D9E5A]" />Nothing is waiting on you.</span>}
    >
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Card>
          <CardHead
            title={scope === "me" ? "Needs you" : "Everything waiting on someone"}
            sub={scope === "me" ? "Most urgent first. Click to go straight to it." : "The whole agency, most urgent first."}
            right={!freelancer && <Segmented value={scope} onChange={setScope} size="sm" options={[{ value: "me", label: "Me", count: mine.length }, { value: "all", label: "Everyone", count: all.length }]} />}
          />
          <QueueList items={shown.slice(0, scope === "me" ? 50 : 60)} showWho={scope === "all"} />
        </Card>
        <div className="space-y-5">
          {!freelancer && <MonthTimeline state={state} />}
          {!freelancer && owner && <WaitingOnOthers items={all.filter((item) => item.who !== state.me)} />}
          {freelancer && <FreelancerSummary />}
        </div>
      </div>
      <div className="mt-5 space-y-5">
        <ClientsGlance state={state} />
        {!freelancer && <TeamAllocation state={state} />}
      </div>
    </Shell>
  );
}

function WaitingOnOthers({ items }: { items: QueueItem[] }) {
  const { state } = useStore();
  const groups = Object.entries(items.reduce<Record<string, QueueItem[]>>((acc, item) => ({ ...acc, [item.who]: [...(acc[item.who] ?? []), item] }), {}));
  return (
    <Card>
      <CardHead title="Waiting on others" sub="Who is holding what." />
      <div className="space-y-2">
        {groups.map(([who, list]) => {
          const person = personById(state, who);
          const late = list.filter((item) => item.severity === 2).length;
          return (
            <div key={who} className="flex items-center gap-2.5 rounded-xl bg-[#F8F7F4] px-3 py-2.5">
              <Avatar name={person?.name ?? "?"} color={person?.color} size={28} />
              <span className="flex-1 text-[13px] font-semibold">{person?.name ?? "Unassigned"}</span>
              {late > 0 && <Chip t="red">{late} late</Chip>}
              <Chip>{list.length}</Chip>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function FreelancerSummary() {
  const { state } = useStore();
  const clients = myClients(state);
  const posts = state.posts.filter((post) => clients.some((client) => client.id === post.clientId) && post.date.startsWith(state.month));
  const counts = [
    { label: "On my desk", value: posts.filter((post) => turnOf(state, post).who === state.me).length, t: "blue" as const },
    { label: "With reviewer", value: posts.filter((post) => post.status.endsWith("review")).length, t: "purple" as const },
    { label: "With client", value: posts.filter((post) => post.status === "Client approval").length, t: "amber" as const },
    { label: "Scheduled or live", value: posts.filter((post) => ["Scheduled", "Published"].includes(post.status)).length, t: "green" as const },
  ];
  return (
    <Card>
      <CardHead title="My month" sub="All my posts this month, by where they are." />
      <div className="grid grid-cols-2 gap-2.5">
        {counts.map((count) => (
          <div key={count.label} className="rounded-xl p-3.5" style={{ background: tone[count.t].bg }}>
            <div className="text-[26px] font-extrabold" style={{ color: tone[count.t].ink }}>{count.value}</div>
            <div className="text-[12px] font-semibold text-[#55514B]">{count.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
