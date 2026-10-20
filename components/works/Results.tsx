"use client";

import { useState } from "react";
import { Check, Pencil, Send } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { isFreelancer, isMarketing, monthName, myClients, nameOf, shortDate } from "@/lib/works/logic";
import type { Client, MonthReport, ReportNumbers } from "@/lib/works/types";
import { AttachField, Button, Card, CardHead, Chip, ClientMark, Field, fieldClass } from "./kit";

const emptyNumbers: ReportNumbers = { followers: "", followerChange: "", reach: "", impressions: "", engagementRate: "", postsPublished: "", topPost: "", observations: "", screenshots: "" };
const allPlatforms = ["LinkedIn", "Instagram", "Facebook", "TikTok", "X", "YouTube", "Newsletter"];
const numberFields: [keyof ReportNumbers, string][] = [["followers", "Followers"], ["followerChange", "Change this month"], ["reach", "Reach"], ["impressions", "Impressions"], ["engagementRate", "Engagement %"], ["postsPublished", "Posts published"]];

/** Where the freelancer builds the month-end report: a checklist, the numbers per platform, and the document. */
export function Results({ client }: { client?: Client }) {
  const { state, go } = useStore();
  const clients = myClients(state).filter(isMarketing);
  if (!client) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {clients.map((item) => {
          const report = state.reports.find((entry) => entry.clientId === item.id && entry.month === state.month);
          const handed = Boolean(report?.submittedAt || report?.freelancerReport);
          return (
            <button key={item.id} onClick={() => go({ view: "marketing", clientId: item.id, tab: "results" })} className="flex items-center gap-3 rounded-2xl border border-[#E9E6E0] bg-white p-4 text-left hover:border-[#C9C3B8]">
              <ClientMark client={item} size={38} />
              <span className="flex-1"><b className="text-[14px]">{item.name}</b><span className="block text-[12px] text-[#8B867E]">{monthName(state.month)}</span></span>
              <Chip t={handed ? "green" : report?.byPlatform ? "amber" : "grey"} dot>{handed ? "Handed in" : report?.byPlatform ? "In progress" : "Not started"}</Chip>
            </button>
          );
        })}
      </div>
    );
  }
  return <ResultsForm key={`${client.id}-${state.month}`} client={client} />;
}

function reportSteps(client: Client, report?: MonthReport) {
  const platforms = client.platforms.length ? client.platforms : ["LinkedIn"];
  const saved = Object.values(report?.byPlatform ?? {});
  return [
    { id: "numbers", label: `Key numbers saved for ${platforms.join(" and ")}`, done: platforms.every((name) => report?.byPlatform?.[name]), manual: false },
    { id: "top", label: "Best post chosen, with why", done: saved.some((row) => row.topPost.trim()), manual: false },
    { id: "notes", label: "What you noticed written down", done: saved.some((row) => row.observations.trim()), manual: false },
    { id: "shots", label: "Screenshots of the analytics added to the Drive folder", done: Boolean(report?.checks?.shots), manual: true },
    { id: "file", label: "Report document attached (PDF or link)", done: Boolean(report?.freelancerReport), manual: false },
  ];
}

function ResultsForm({ client }: { client: Client }) {
  const { state, attachReport, toggleReportCheck, submitReport } = useStore();
  const freelancer = isFreelancer(state);
  const report = state.reports.find((item) => item.clientId === client.id && item.month === state.month);
  const steps = reportSteps(client, report);
  const done = steps.filter((step) => step.done).length;
  const ready = done === steps.length;
  const platforms = [...new Set([...(client.platforms.length ? client.platforms : ["LinkedIn"]), ...allPlatforms])];
  const [platform, setPlatform] = useState(platforms[0]);
  const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(state.month));
  const live = posts.filter((post) => post.status === "Published").length;
  const submitted = Boolean(report?.submittedAt);

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-bold">{monthName(state.month)} report</h3>
            <p className="text-[13px] text-[#6B6760]">{live} post{live === 1 ? "" : "s"} live this month. Work down the list, then hand it to operations.</p>
          </div>
          {submitted ? <Chip t="green" dot>Handed in {shortDate(report!.submittedAt!)}</Chip> : <Chip t={ready ? "green" : "amber"}>{done}/{steps.length} done</Chip>}
        </div>
        <ul className="mt-4 divide-y divide-[#F3F1ED] rounded-xl border border-[#F0EEE9]">
          {steps.map((step) => (
            <li key={step.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
              {step.manual ? (
                <button onClick={() => toggleReportCheck(client.id, state.month, step.id)} aria-pressed={step.done} aria-label={`${step.done ? "Untick" : "Tick"} ${step.label}`} className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${step.done ? "border-[#1D9E5A] bg-[#1D9E5A] text-white" : "border-[#D9D5CE] bg-white hover:border-[#2F6FDB]"}`}>{step.done && <Check size={15} strokeWidth={3} />}</button>
              ) : (
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${step.done ? "border-[#1D9E5A] bg-[#1D9E5A] text-white" : "border-dashed border-[#D9D5CE] bg-[#FBFAF8]"}`} title="Ticks itself">{step.done && <Check size={15} strokeWidth={3} />}</span>
              )}
              <span className={`min-w-0 flex-1 text-[14px] ${step.done ? "text-[#9A958D] line-through" : "font-semibold"}`}>{step.label}</span>
              {step.id === "file" && <AttachField value={report?.freelancerReport} onChange={(file) => attachReport(client.id, state.month, "freelancerReport", file)} label="Attach report" compact />}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button kind="primary" disabled={!ready || submitted} onClick={() => submitReport(client.id, state.month)}><Send size={14} />{submitted ? "Handed in" : "Hand to operations"}</Button>
          <span className="text-[12px] text-[#8B867E]">{submitted ? "Operations has been told. The client report is sent from the client's Reporting tab." : ready ? "Operations is notified when you hand it in." : "Finish the steps above first. Steps with a dashed box tick themselves."}</span>
        </div>
        {freelancer && !submitted && <p className="mt-2 text-[12px] text-[#8B867E]">Saving numbers does not tell anyone yet. Only “Hand to operations” does.</p>}
      </Card>

      <Card>
        <CardHead title="Key numbers" sub="Choose the platform, enter its numbers, save. Do the next platform after." />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label htmlFor="results-platform" className="text-[13px] font-semibold">Platform</label>
          <select id="results-platform" value={platform} onChange={(event) => setPlatform(event.target.value)} className="rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[14px] font-semibold">
            {platforms.map((name) => <option key={name} value={name}>{name}{report?.byPlatform?.[name] ? "  ✓ saved" : ""}</option>)}
          </select>
        </div>
        <NumbersForm key={`${platform}-${report?.byPlatform?.[platform]?.savedAt ?? ""}`} client={client} platform={platform} saved={report?.byPlatform?.[platform]} />
      </Card>

      {report?.byPlatform && Object.keys(report.byPlatform).length > 0 && (
        <Card>
          <CardHead title="Saved this month" />
          <ul className="divide-y divide-[#F3F1ED]">
            {Object.entries(report.byPlatform).map(([name, row]) => (
              <li key={name} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-[13px]">
                <b className="w-24 text-[14px]">{name}</b>
                <span>Followers <b>{row.followers || "—"}</b>{row.followerChange && <span className="text-[#17804A]"> {row.followerChange}</span>}</span>
                <span>Reach <b>{row.reach || "—"}</b></span>
                <span>Engagement <b>{row.engagementRate ? `${row.engagementRate}%` : "—"}</b></span>
                <span className="text-[12px] text-[#8B867E]">Saved {shortDate(row.savedAt)} by {nameOf(state, row.savedBy)}</span>
                <button onClick={() => setPlatform(name)} className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-[#1F5BC4]"><Pencil size={12} />Edit</button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function NumbersForm({ client, platform, saved }: { client: Client; platform: string; saved?: ReportNumbers & { savedAt: string; savedBy: string } }) {
  const { state, saveNumbers } = useStore();
  const [numbers, setNumbers] = useState<ReportNumbers>(saved ? { ...saved } : emptyNumbers);
  return (
    <form onSubmit={(event) => { event.preventDefault(); saveNumbers(client.id, state.month, platform, numbers); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {numberFields.map(([key, label]) => (
          <Field key={key} label={label}><input value={numbers[key]} onChange={(event) => setNumbers({ ...numbers, [key]: event.target.value })} className={fieldClass} /></Field>
        ))}
      </div>
      <Field label="Best post and why"><input value={numbers.topPost} onChange={(event) => setNumbers({ ...numbers, topPost: event.target.value })} className={fieldClass} /></Field>
      <Field label="What you noticed"><textarea value={numbers.observations} onChange={(event) => setNumbers({ ...numbers, observations: event.target.value })} rows={3} className={fieldClass} /></Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button kind="primary" type="submit"><Check size={14} />Save {platform} numbers</Button>
        {saved && <span className="text-[12px] text-[#8B867E]">Saved {shortDate(saved.savedAt)}. Saving again replaces it.</span>}
      </div>
    </form>
  );
}
