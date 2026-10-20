"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { isFreelancer, isFullReport, isOwner, monthName, myClients, nameOf, shiftMonth, shortDate, todayIso } from "@/lib/works/logic";
import { monthFacts, reportHtml } from "@/lib/works/report";
import type { Client } from "@/lib/works/types";
import { Shell } from "./Shell";
import { AttachField, Bar, Card, Chip, ClientMark, Empty, tone } from "./kit";

function MonthPicker({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-[#E2DED7] bg-white p-1">
      <button onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous report month" className="rounded-lg p-1.5 hover:bg-[#F1F0ED]"><ChevronLeft size={16} /></button>
      <span className="min-w-[118px] text-center text-[13px] font-bold">{monthName(month)}</span>
      <button onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next report month" className="rounded-lg p-1.5 hover:bg-[#F1F0ED]"><ChevronRight size={16} /></button>
    </div>
  );
}

const Tick = ({ done }: { done: boolean }) => (done ? <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#1D9E5A] text-white"><Check size={12} strokeWidth={3} /></span> : <span className="h-5 w-5 shrink-0 rounded-full border-2 border-dashed border-[#CFCAC2]" />);

export function ReportsPage() {
  const { state, go, attachReport, updateReport } = useStore();
  const [month, setMonth] = useState(shiftMonth(state.month, -1));
  const freelancer = isFreelancer(state);
  const owner = isOwner(state);
  const clients = myClients(state).filter((client) => client.startDate.slice(0, 7) <= month);
  const rows = clients.map((client) => ({ client, report: state.reports.find((item) => item.clientId === client.id && item.month === month), facts: monthFacts(client, month, state.posts) }));
  const inCount = rows.filter((row) => row.report?.freelancerReport || row.report?.numbers).length;
  const sentCount = rows.filter((row) => row.report?.sentAt).length;
  const financeCount = rows.filter((row) => row.report?.financeSentAt).length;

  const download = (client: Client) => {
    const row = rows.find((item) => item.client.id === client.id)!;
    const report = row.report ?? { id: "", clientId: client.id, month, checked: false, summary: "", recommendations: "", approved: false, sentAt: "", reportLink: "" };
    const url = URL.createObjectURL(new Blob([reportHtml(client, report, row.facts, isFullReport(state, client))], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client.name.replace(/\W+/g, "-")}-${month}-report.html`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const summary = [
    { label: freelancer ? "Reports handed in" : "Freelancer reports in", value: inCount, t: "blue" as const },
    ...(!freelancer ? [{ label: "Client reports sent", value: sentCount, t: "green" as const }] : []),
    ...(owner ? [{ label: "Finance statements sent", value: financeCount, t: "purple" as const }] : []),
  ];

  return (
    <Shell title={freelancer ? "Monthly reports" : "Reports"} sub={freelancer ? "Hand in each client's monthly report by the 5th." : `${monthName(month)} month-end for every client.`} actions={<MonthPicker month={month} onChange={setMonth} />}>
      <div className={`mb-5 grid gap-3 ${summary.length === 3 ? "sm:grid-cols-3" : summary.length === 2 ? "sm:grid-cols-2" : ""}`}>
        {summary.map((item) => (
          <div key={item.label} className="rounded-2xl p-4" style={{ background: tone[item.t].bg }}>
            <div className="flex items-end justify-between"><span className="text-[13px] font-bold" style={{ color: tone[item.t].ink }}>{item.label}</span><span className="text-[24px] font-extrabold" style={{ color: tone[item.t].ink }}>{item.value}<span className="text-[14px] opacity-60"> / {rows.length}</span></span></div>
            <div className="mt-2"><Bar value={rows.length ? (item.value / rows.length) * 100 : 0} color={tone[item.t].dot} track="#FFFFFF" /></div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? <Empty title="No clients due a report for this month" /> : (
        <div className="space-y-3">
          {rows.map(({ client, report, facts }) => {
            const delivered = Math.max(facts.published, Number(report?.numbers?.postsPublished) || 0);
            const done = [Boolean(report?.freelancerReport || report?.numbers), ...(!freelancer ? [Boolean(report?.sentAt)] : []), ...(owner ? [Boolean(report?.financeSentAt)] : [])];
            const complete = done.every(Boolean);
            return (
              <Card key={client.id} className={complete ? "border-[#BFE6CF]" : ""}>
                <div className="flex flex-wrap items-center gap-3">
                  <ClientMark client={client} size={38} />
                  <button onClick={() => go(freelancer ? { view: "marketing", clientId: client.id, tab: "results" } : { view: "client", clientId: client.id, tab: "reporting" })} className="min-w-0 flex-1 text-left">
                    <div className="text-[15px] font-bold hover:text-[#1F5BC4]">{client.name}</div>
                    <div className="text-[12px] text-[#8B867E]">{delivered} of {client.agreedPosts} posts delivered · {nameOf(state, client.freelancerId)}</div>
                  </button>
                  {complete ? <Chip t="green" dot>Month closed</Chip> : <Chip>{done.filter(Boolean).length}/{done.length}</Chip>}
                </div>
                <div className={`mt-3 grid gap-2.5 ${done.length === 3 ? "lg:grid-cols-3" : done.length === 2 ? "md:grid-cols-2" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#F8F7F4] px-3 py-2.5">
                    <Tick done={Boolean(report?.freelancerReport || report?.numbers)} />
                    <span className="text-[13px] font-semibold">Freelancer report</span>
                    {(["w1", "w2", "w3"] as const).some((week) => report?.weekly?.[week]) && (
                      <span className="flex gap-1">{(["w1", "w2", "w3"] as const).map((week) => <span key={week} title={`Week ${week.slice(1)} report`} className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${report?.weekly?.[week]?.submittedAt ? "bg-[#E6F5EC] text-[#17804A]" : "bg-[#EEECE7] text-[#8B867E]"}`}>W{week.slice(1)}</span>)}</span>
                    )}
                    <span className="ml-auto"><AttachField value={report?.freelancerReport} onChange={(file) => attachReport(client.id, month, "freelancerReport", file)} compact /></span>
                  </div>
                  {!freelancer && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#F8F7F4] px-3 py-2.5">
                      <Tick done={Boolean(report?.sentAt)} />
                      <span className="text-[13px] font-semibold">Client report{report?.sentAt ? ` · sent ${shortDate(report.sentAt)}` : ""}</span>
                      <span className="ml-auto flex flex-wrap items-center gap-1.5">
                        <AttachField value={report?.clientReport} onChange={(file) => attachReport(client.id, month, "clientReport", file)} compact />
                        {!report?.clientReport && <button onClick={() => download(client)} title="Download a starter report built from the month's posts and numbers" className="rounded-lg p-1.5 text-[#1F5BC4] hover:bg-[#EEF2FA]" aria-label="Download starter report"><Download size={14} /></button>}
                        <button onClick={() => updateReport(client.id, month, { sentAt: report?.sentAt ? "" : todayIso(), approved: true, checked: true })} className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${report?.sentAt ? "bg-[#E7F6EE] text-[#17804A]" : "bg-[#1E2430] text-white"}`}>{report?.sentAt ? "Sent ✓" : "Mark sent"}</button>
                      </span>
                    </div>
                  )}
                  {owner && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#F8F7F4] px-3 py-2.5">
                      <Tick done={Boolean(report?.financeSentAt)} />
                      <span className="text-[13px] font-semibold">Finance statement</span>
                      <span className="ml-auto flex flex-wrap items-center gap-1.5">
                        <AttachField value={report?.financeReport} onChange={(file) => attachReport(client.id, month, "financeReport", file)} compact />
                        <button onClick={() => updateReport(client.id, month, { financeSentAt: report?.financeSentAt ? "" : todayIso() })} className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${report?.financeSentAt ? "bg-[#E7F6EE] text-[#17804A]" : "bg-[#1E2430] text-white"}`}>{report?.financeSentAt ? "Sent ✓" : "Mark sent"}</button>
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
          {!freelancer && sentCount === rows.length && <div className="rounded-2xl bg-[#E7F6EE] p-4 text-[14px] font-semibold text-[#17804A]">Every {monthName(month).split(" ")[0]} client report is sent.</div>}
        </div>
      )}
    </Shell>
  );
}
