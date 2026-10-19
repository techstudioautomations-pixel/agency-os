"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { isFreelancer, isOwner, monthName, myClients, nameOf, shiftMonth, shortDate, todayIso } from "@/lib/works/logic";
import { monthFacts, reportHtml } from "@/lib/works/report";
import type { Client, MonthReport, ReportNumbers } from "@/lib/works/types";
import { Shell } from "./Shell";
import { Button, Card, CardHead, Chip, ClientMark, Empty, Field, fieldClass, tone } from "./kit";

const emptyNumbers: ReportNumbers = { followers: "", followerChange: "", reach: "", impressions: "", engagementRate: "", postsPublished: "", topPost: "", observations: "", screenshots: "" };

function steps(client: Client, report: MonthReport | undefined, published: number, byName = "") {
  return [
    { key: "delivered", label: "Content delivered", done: published >= client.agreedPosts, note: `${published} / ${client.agreedPosts}` },
    { key: "numbers", label: "Numbers in", done: Boolean(report?.numbers), note: report?.numbers && byName ? `by ${byName}` : "" },
    { key: "checked", label: "Checked", done: Boolean(report?.checked) },
    { key: "approved", label: "Approved", done: Boolean(report?.approved) },
    { key: "sent", label: "Sent to client", done: Boolean(report?.sentAt), note: report?.sentAt ? shortDate(report.sentAt) : "" },
  ];
}

function MonthPicker({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-[#E2DED7] bg-white p-1">
      <button onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous report month" className="rounded-lg p-1.5 hover:bg-[#F1F0ED]"><ChevronLeft size={16} /></button>
      <span className="min-w-[118px] text-center text-[13px] font-bold">{monthName(month)}</span>
      <button onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next report month" className="rounded-lg p-1.5 hover:bg-[#F1F0ED]"><ChevronRight size={16} /></button>
    </div>
  );
}

export function ClientReporting({ client }: { client: Client }) {
  const store = useStore();
  const { state } = store;
  const [month, setMonth] = useState(shiftMonth(state.month, -1));
  const report = state.reports.find((item) => item.clientId === client.id && item.month === month);
  const facts = monthFacts(client, month, state.posts);
  const [numbers, setNumbers] = useState<ReportNumbers>(report?.numbers ?? emptyNumbers);
  const [editing, setEditing] = useState(!report?.numbers);
  const [link, setLink] = useState(report?.reportLink ?? "");
  const freelancer = isFreelancer(state);
  const owner = isOwner(state);
  const list = steps(client, report, Math.max(facts.published, Number(report?.numbers?.postsPublished) || 0), nameOf(state, report?.numbersBy));
  const revisionTotal = Object.values(facts.revisions).reduce((sum, value) => sum + value, 0);
  const update = (patch: Partial<MonthReport>) => store.updateReport(client.id, month, patch);

  const changeMonth = (next: string) => {
    setMonth(next);
    const nextReport = state.reports.find((item) => item.clientId === client.id && item.month === next);
    setNumbers(nextReport?.numbers ?? emptyNumbers);
    setEditing(!nextReport?.numbers);
    setLink(nextReport?.reportLink ?? "");
  };

  const download = () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([reportHtml(client, report, facts)], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client.name.replace(/\W+/g, "-")}-${month}-report.html`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <MonthPicker month={month} onChange={changeMonth} />
        <span className="text-[13px] text-[#6B6760]">Month-end for {client.name} · {client.package === "Growth" ? "full report with recommendations" : "one-page snapshot"}</span>
      </div>

      <Card>
        <div className="grid gap-2 sm:grid-cols-5">
          {list.map((step, index) => (
            <div key={step.key} className="rounded-xl p-3" style={{ background: step.done ? tone.green.bg : "#F8F7F4" }}>
              <div className="flex items-center gap-2">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${step.done ? "bg-[#1D9E5A] text-white" : "bg-white text-[#8B867E]"}`}>{step.done ? <Check size={13} /> : index + 1}</span>
                <span className="text-[13px] font-bold">{step.label}</span>
              </div>
              {step.note && <div className="mt-1 pl-8 text-[12px] text-[#6B6760]">{step.note}</div>}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHead title="1 · The month's numbers" sub="From LinkedIn / Instagram analytics or Publer. Freelancer hands these in by the 5th." right={report?.numbers && !editing && <Button size="sm" onClick={() => setEditing(true)}>Edit</Button>} />
          {editing ? (
            <form onSubmit={(event) => { event.preventDefault(); store.saveNumbers(client.id, month, numbers); setEditing(false); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {([["followers", "Followers"], ["followerChange", "Change"], ["reach", "Reach"], ["impressions", "Impressions"], ["engagementRate", "Engagement %"], ["postsPublished", "Posts published"]] as [keyof ReportNumbers, string][]).map(([key, label]) => (
                  <Field key={key} label={label}><input value={numbers[key]} onChange={(event) => setNumbers({ ...numbers, [key]: event.target.value })} className={fieldClass} /></Field>
                ))}
              </div>
              <Field label="Best post and why"><input value={numbers.topPost} onChange={(event) => setNumbers({ ...numbers, topPost: event.target.value })} className={fieldClass} /></Field>
              <Field label="Observations"><textarea value={numbers.observations} onChange={(event) => setNumbers({ ...numbers, observations: event.target.value })} rows={3} className={fieldClass} placeholder="What worked, what didn't, what you noticed" /></Field>
              <Field label="Screenshots folder" hint="A Drive link to the analytics screenshots."><input value={numbers.screenshots} onChange={(event) => setNumbers({ ...numbers, screenshots: event.target.value })} className={fieldClass} placeholder="https://drive.google.com/…" /></Field>
              <Button kind="primary" type="submit">Hand in numbers</Button>
            </form>
          ) : report?.numbers ? (
            <div>
              <div className="grid grid-cols-3 gap-2">
                {[["Followers", report.numbers.followers], ["Change", report.numbers.followerChange], ["Reach", report.numbers.reach], ["Engagement", report.numbers.engagementRate ? `${report.numbers.engagementRate}%` : ""], ["Published", report.numbers.postsPublished], ["Impressions", report.numbers.impressions]].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#F8F7F4] p-3"><div className="text-[11px] font-semibold text-[#8B867E]">{label}</div><div className="text-[18px] font-extrabold">{value || "—"}</div></div>
                ))}
              </div>
              {report.numbers.topPost && <p className="mt-3 text-[13px]"><b>Best post:</b> {report.numbers.topPost}</p>}
              {report.numbers.observations && <p className="mt-1 text-[13px] text-[#55514B]">{report.numbers.observations}</p>}
              <p className="mt-3 text-[12px] text-[#8B867E]">Handed in by {nameOf(state, report.numbersBy)} {report.numbersAt ? `on ${shortDate(report.numbersAt)}` : ""}{report.numbers.screenshots && <> · <a className="font-semibold text-[#1F5BC4]" href={report.numbers.screenshots} target="_blank" rel="noreferrer">screenshots</a></>}</p>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHead title="2 · Check, write, approve, send" sub="Operations checks the numbers, María approves, operations sends." />
          {freelancer ? (
            <p className="text-[13px] text-[#55514B]">{report?.numbers ? "Thanks. Operations takes it from here." : "Hand in the numbers on the left. Operations and María take it from there."}</p>
          ) : !report?.numbers ? (
            <Empty title="Waiting for the numbers">{nameOf(state, client.freelancerId)} hands them in first.</Empty>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#F8F7F4] p-3 text-[13px]">
                <span className="flex-1"><b>Revisions logged this month:</b> {revisionTotal ? Object.entries(facts.revisions).filter(([, value]) => value).map(([key, value]) => `${key} ${value}`).join(" · ") : "none"}</span>
                <Button size="sm" kind={report.checked ? "good" : "secondary"} onClick={() => update({ checked: !report.checked })}>{report.checked ? <><Check size={13} />Numbers checked</> : "Mark numbers checked"}</Button>
              </div>
              <Field label="Summary for the client"><textarea value={report.summary} onChange={(event) => update({ summary: event.target.value })} rows={3} className={fieldClass} placeholder="Two or three plain sentences: what we did and what it achieved." /></Field>
              {client.package === "Growth" && <Field label="Recommendations"><textarea value={report.recommendations} onChange={(event) => update({ recommendations: event.target.value })} rows={3} className={fieldClass} /></Field>}
              <div className="flex flex-wrap gap-2">
                {owner ? (
                  <Button kind={report.approved ? "good" : "primary"} disabled={!report.checked} onClick={() => update({ approved: !report.approved })}>{report.approved ? <><Check size={14} />Approved by María</> : "Approve report"}</Button>
                ) : (
                  <Chip t={report.approved ? "green" : "amber"}>{report.approved ? "Approved" : "Waiting for María's approval"}</Chip>
                )}
                <Button onClick={download}><Download size={14} />Download report</Button>
              </div>
              <div className="border-t border-[#F0EEE9] pt-3">
                <Field label="Final report link (optional)" hint="If you build a bigger report in Canva or Docs, attach it here."><input value={link} onChange={(event) => setLink(event.target.value)} onBlur={() => update({ reportLink: link })} className={fieldClass} placeholder="https://…" /></Field>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {report.sentAt ? <Chip t="green" dot>Sent {shortDate(report.sentAt)}</Chip> : <Button kind="good" disabled={!report.approved} onClick={() => update({ sentAt: todayIso(), reportLink: link })}>Mark as sent to client</Button>}
                  {report.reportLink && <a href={report.reportLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1F5BC4]">Open final report <ExternalLink size={12} /></a>}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {report?.numbers && !freelancer && (
        <Card pad={false}>
          <div className="px-5 pt-5"><CardHead title="Preview" sub="What the client receives. Download it, or use it as the base for a bigger report." /></div>
          <iframe title="Report preview" srcDoc={reportHtml(client, report, facts)} className="h-[640px] w-full rounded-b-2xl border-t border-[#F0EEE9]" />
        </Card>
      )}
    </div>
  );
}

export function ReportsPage() {
  const { state, go } = useStore();
  const [month, setMonth] = useState(shiftMonth(state.month, -1));
  const freelancer = isFreelancer(state);
  const clients = myClients(state).filter((client) => client.startDate.slice(0, 7) <= month);
  const rows = clients.map((client) => {
    const report = state.reports.find((item) => item.clientId === client.id && item.month === month);
    const facts = monthFacts(client, month, state.posts);
    return { client, report, list: steps(client, report, Math.max(facts.published, Number(report?.numbers?.postsPublished) || 0), nameOf(state, report?.numbersBy)) };
  });
  const sent = rows.filter((row) => row.report?.sentAt).length;
  const numbersIn = rows.filter((row) => row.report?.numbers).length;

  return (
    <Shell title={freelancer ? "Month-end numbers" : "Reports"} sub={freelancer ? "Hand in each client's numbers by the 5th." : `${monthName(month)}: ${numbersIn} of ${rows.length} numbers in · ${sent} of ${rows.length} reports sent`} actions={<MonthPicker month={month} onChange={setMonth} />}>
      {rows.length === 0 ? <Empty title="No clients due a report for this month" /> : (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#F0EEE9] text-[11px] font-bold uppercase tracking-wide text-[#8B867E]">
                  <th className="px-5 py-3">Client</th>
                  {rows[0].list.map((step) => <th key={step.key} className="px-3">{step.label}</th>)}
                  <th className="px-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ client, list }) => (
                  <tr key={client.id} className="border-b border-[#F5F3EF] hover:bg-[#FBFAF8]">
                    <td className="px-5 py-3"><span className="flex items-center gap-2.5"><ClientMark client={client} size={28} /><span><b>{client.name}</b><span className="block text-[12px] text-[#8B867E]">{nameOf(state, client.freelancerId)}</span></span></span></td>
                    {list.map((step) => (
                      <td key={step.key} className="px-3">
                        {step.done ? <span className="inline-flex items-center gap-1.5 font-semibold text-[#17804A]"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#1D9E5A] text-white"><Check size={12} /></span>{step.note}</span> : <span className="inline-flex items-center gap-1.5 text-[#B5B0A8]"><span className="h-5 w-5 rounded-full border-2 border-dashed border-[#D6D1C8]" />{step.note}</span>}
                      </td>
                    ))}
                    <td className="px-3"><Button size="sm" onClick={() => go({ view: "client", clientId: client.id, tab: "reporting" })}>Open</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!freelancer && sent === rows.length && <div className="m-5 rounded-xl bg-[#E7F6EE] p-4 text-[14px] font-semibold text-[#17804A]">Every {monthName(month).split(" ")[0]} report is sent. Month closed.</div>}
        </Card>
      )}
    </Shell>
  );
}
