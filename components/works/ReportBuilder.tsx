"use client";

import { useState } from "react";
import { Check, FileUp, Loader2, Pencil, Send, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { coveredWeeks, isFreelancer, nameOf, partHasContent, periodKey, periodName, periodWeeks, reportParts, shortDate, weekDays } from "@/lib/works/logic";
import { findNumbers, type FoundNumbers } from "@/lib/works/reportNumbers";
import { reportText } from "@/lib/works/readReport";
import type { Client, ReportNumbers, ReportPeriod } from "@/lib/works/types";
import { AttachField, Button, Card, CardHead, Chip, Field, fieldClass } from "./kit";
import { ChannelIcon } from "./ChannelIcon";

const emptyNumbers: ReportNumbers = { followers: "", followerChange: "", reach: "", impressions: "", engagementRate: "", postsPublished: "", topPost: "", observations: "", screenshots: "" };
const allPlatforms = ["LinkedIn", "Instagram", "Facebook", "TikTok", "X", "YouTube", "Newsletter"];
const numberFields: [keyof ReportNumbers, string][] = [["followers", "Followers"], ["followerChange", "Change in the period"], ["reach", "Reach"], ["impressions", "Impressions"], ["engagementRate", "Engagement %"], ["postsPublished", "Posts published"]];

type PeriodView = { byPlatform?: Record<string, ReportNumbers & { savedAt: string; savedBy: string }>; checks?: Record<string, string>; submittedAt?: string; freelancerReport?: { name: string; url: string } };
type Selection = "month" | [number, number];

function reportSteps(client: Client, view?: PeriodView) {
  const platforms = client.platforms.length ? client.platforms : ["LinkedIn"];
  const saved = Object.values(view?.byPlatform ?? {});
  return [
    { id: "numbers", label: `Key numbers saved for ${platforms.join(" and ")}`, done: platforms.every((name) => view?.byPlatform?.[name]), manual: false },
    { id: "top", label: "Best post chosen, with why", done: saved.some((row) => row.topPost.trim()), manual: false },
    { id: "notes", label: "What you noticed written down", done: saved.some((row) => row.observations.trim()), manual: false },
    { id: "shots", label: "Screenshots of the analytics added to the Drive folder", done: Boolean(view?.checks?.shots), manual: true },
    { id: "file", label: "Report document attached (PDF or link)", done: Boolean(view?.freelancerReport), manual: false },
  ];
}

/** The freelancer's report for one client and month. It can cover one week, weeks in a row, or the full month. */
export function ReportBuilder({ client, month }: { client: Client; month: string }) {
  const { state, attachReport, toggleReportCheck, submitReport, saveNumbers } = useStore();
  const freelancer = isFreelancer(state);
  const report = state.reports.find((item) => item.clientId === client.id && item.month === month);
  const [selection, setSelection] = useState<Selection>("month");
  const period: ReportPeriod = selection === "month" ? "month" : periodKey(selection[0], selection[1]);
  const view: PeriodView | undefined = period === "month" ? report : report?.weekly?.[period];
  const steps = reportSteps(client, view);
  const done = steps.filter((step) => step.done).length;
  const ready = done === steps.length;
  const submitted = Boolean(view?.submittedAt);
  const platforms = [...new Set([...(client.platforms.length ? client.platforms : ["LinkedIn"]), ...allPlatforms])];
  const [platform, setPlatform] = useState(platforms[0]);
  const covered = coveredWeeks(report);
  const parts = reportParts(report);
  const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(month));
  const live = posts.filter((post) => post.status === "Published").length;
  const weeks = periodWeeks(period);
  const overlapping = weeks ? Object.entries(report?.weekly ?? {}).filter(([key, part]) => { const other = periodWeeks(key); return key !== period && other && partHasContent(part) && other[0] <= weeks[1] && other[1] >= weeks[0]; }).map(([key]) => periodName(key, month)) : [];

  // One click picks a week. The next week along is added to it. A week further away starts again. An end week clicked again comes off.
  const pickWeek = (n: number) => {
    if (selection === "month") return setSelection([n, n]);
    const [from, to] = selection;
    if (n < from - 1 || n > to + 1) setSelection([n, n]);
    else if (n < from) setSelection([n, to]);
    else if (n > to) setSelection([from, n]);
    else if (from !== to && n === from) setSelection([from + 1, to]);
    else if (from !== to && n === to) setSelection([from, to - 1]);
    else if (from !== to) setSelection([n, n]);
  };
  const choose = (key: string) => { const range = periodWeeks(key); setSelection(range ?? "month"); };

  return (
    <div className="space-y-5">
      <Card>
        <h3 className="text-[16px] font-bold">What does this report cover?</h3>
        <p className="mt-0.5 text-[13px] text-[#6B6760]">Pick one week, or weeks in a row (week 1 and week 2 makes one report). Or send the full month. Whatever you pick counts for those weeks.</p>
        <div className="mt-3 flex flex-wrap items-stretch gap-2" role="group" aria-label="Weeks covered by this report">
          {[1, 2, 3, 4].map((n) => {
            const on = selection !== "month" && n >= selection[0] && n <= selection[1];
            const [first, last] = weekDays(month, n);
            return (
              <button key={n} onClick={() => pickWeek(n)} aria-pressed={on} className={`min-w-[104px] rounded-xl border-2 px-3.5 py-2 text-left transition ${on ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E9E6E0] bg-white hover:border-[#C9C3B8]"}`}>
                <span className="flex items-center justify-between gap-2 text-[14px] font-bold">Week {n}{covered.has(n) && <Check size={14} strokeWidth={3} className="text-[#17804A]" />}</span>
                <span className="text-[12px] text-[#8B867E]">{first}-{last}</span>
              </button>
            );
          })}
          <button onClick={() => setSelection("month")} aria-pressed={selection === "month"} className={`min-w-[116px] rounded-xl border-2 px-3.5 py-2 text-left transition ${selection === "month" ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E9E6E0] bg-white hover:border-[#C9C3B8]"}`}>
            <span className="flex items-center justify-between gap-2 text-[14px] font-bold">Full month{(report?.freelancerReport || Object.keys(report?.byPlatform ?? {}).length > 0) && <Check size={14} strokeWidth={3} className="text-[#17804A]" />}</span>
            <span className="text-[12px] text-[#8B867E]">{weekDays(month, 1)[0]}-{weekDays(month, 4)[1]}</span>
          </button>
        </div>
        <p className="mt-2 text-[12px] text-[#8B867E]">Click a week to pick it. Click the next week to add it to the same report. Click an end week again to take it off. The client report uses the full-month report if there is one, otherwise the numbers from the last week reported.</p>
        {overlapping.length > 0 && <p className="mt-3 rounded-xl bg-[#FFF3D9] px-3.5 py-2.5 text-[13px] text-[#6B4A06]">{overlapping.join(" and ")} already has its own report. This one will count for those weeks too.</p>}
        {parts.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-[#6B6760]">
            <span className="font-semibold">Saved for this month:</span>
            {parts.map((part) => (
              <button key={part.key} onClick={() => choose(part.key)} className={`rounded-full px-2.5 py-0.5 font-bold ${part.key === period ? "bg-[#1E2430] text-white" : part.submitted ? "bg-[#E6F5EC] text-[#17804A]" : "bg-[#EEECE7] text-[#55514B]"}`}>{part.label}{part.submitted ? " ✓" : ""}</button>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-bold">{periodName(period, month)} report</h3>
            <p className="text-[13px] text-[#6B6760]">{live} post{live === 1 ? "" : "s"} live in {new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IE", { month: "long" })}. Upload the report, check the numbers, then hand it to operations.</p>
          </div>
          {submitted ? <Chip t="green" dot>Handed in {shortDate(view!.submittedAt!)}</Chip> : <Chip t={ready ? "green" : "amber"}>{done}/{steps.length} done</Chip>}
        </div>

        <UploadReport key={period} client={client} month={month} period={period} platforms={platforms} view={view} onUsed={setPlatform} />

        <ul className="mt-4 divide-y divide-[#F3F1ED] rounded-xl border border-[#F0EEE9]">
          {steps.map((step) => (
            <li key={step.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
              {step.manual ? (
                <button onClick={() => toggleReportCheck(client.id, month, step.id, period)} aria-pressed={step.done} aria-label={`${step.done ? "Untick" : "Tick"} ${step.label}`} className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${step.done ? "border-[#1D9E5A] bg-[#1D9E5A] text-white" : "border-[#D9D5CE] bg-white hover:border-[#2F6FDB]"}`}>{step.done && <Check size={15} strokeWidth={3} />}</button>
              ) : (
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${step.done ? "border-[#1D9E5A] bg-[#1D9E5A] text-white" : "border-dashed border-[#D9D5CE] bg-[#FBFAF8]"}`} title="Ticks itself">{step.done && <Check size={15} strokeWidth={3} />}</span>
              )}
              <span className={`min-w-0 flex-1 text-[14px] ${step.done ? "text-[#9A958D] line-through" : "font-semibold"}`}>{step.label}</span>
              {step.id === "file" && <AttachField value={view?.freelancerReport} onChange={(file) => attachReport(client.id, month, "freelancerReport", file, period)} label="Attach report" compact />}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button kind="primary" disabled={!ready || submitted} onClick={() => submitReport(client.id, month, period)}><Send size={14} />{submitted ? "Handed in" : "Hand to operations"}</Button>
          <span className="text-[12px] text-[#8B867E]">{submitted ? "Operations has been told." : ready ? "Operations is notified when you hand it in." : "Finish the steps above first. Steps with a dashed box tick themselves."}</span>
        </div>
        {freelancer && !submitted && <p className="mt-2 text-[12px] text-[#8B867E]">Saving numbers does not tell anyone yet. Only “Hand to operations” does.</p>}
      </Card>

      <Card>
        <CardHead title={`Key numbers · ${periodName(period, month)}`} sub="Pick the platform, check or enter its numbers, save. Then the next platform." />
        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Platform">
          {platforms.map((name) => (
            <button key={name} onClick={() => setPlatform(name)} aria-pressed={platform === name} className={`inline-flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-[13px] font-bold ${platform === name ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E9E6E0] hover:border-[#C9C3B8]"}`}>
              <ChannelIcon name={name} size={18} />{name}{view?.byPlatform?.[name] && <Check size={13} strokeWidth={3} className="text-[#17804A]" />}
            </button>
          ))}
        </div>
        <NumbersForm key={`${period}-${platform}-${view?.byPlatform?.[platform]?.savedAt ?? ""}`} client={client} month={month} platform={platform} period={period} saved={view?.byPlatform?.[platform]} />
      </Card>

      {view?.byPlatform && Object.keys(view.byPlatform).length > 0 && (
        <Card>
          <CardHead title={`Saved for ${periodName(period, month)}`} />
          <ul className="divide-y divide-[#F3F1ED]">
            {Object.entries(view.byPlatform).map(([name, row]) => (
              <li key={name} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-[13px]">
                <b className="flex w-28 items-center gap-2 text-[14px]"><ChannelIcon name={name} size={18} />{name}</b>
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

/** Upload the report: it is attached, and the key numbers are read out of it for checking. */
function UploadReport({ client, month, period, platforms, view, onUsed }: { client: Client; month: string; period: ReportPeriod; platforms: string[]; view?: PeriodView; onUsed: (platform: string) => void }) {
  const { attachReport, saveNumbers } = useStore();
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Record<string, FoundNumbers> | null>(null);
  const [note, setNote] = useState("");
  const fallback = client.platforms[0] ?? "LinkedIn";

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setNote("");
    setFound(null);
    // Keep the file with the report. Small files are saved in the browser, larger ones only for this visit.
    const url = file.size < 1_500_000 ? await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); }) : URL.createObjectURL(file);
    attachReport(client.id, month, "freelancerReport", { name: file.name, url }, period);
    try {
      const result = findNumbers(await reportText(file), fallback);
      if (Object.keys(result).length) setFound(result);
      else setNote("The report is attached, but no key numbers could be found in it. Type them in below.");
    } catch (error) {
      setNote(`The report is attached. ${error instanceof Error && !/Word file/.test(error.message) ? error.message : "The numbers could not be read from it."} Type them in below.`);
    } finally {
      setBusy(false);
    }
  };

  const use = () => {
    if (!found) return;
    for (const [name, values] of Object.entries(found)) saveNumbers(client.id, month, name, { ...emptyNumbers, ...(view?.byPlatform?.[name] ?? {}), ...values }, period);
    onUsed(Object.keys(found)[0]);
    setFound(null);
  };

  return (
    <div className="mt-4 rounded-2xl border-2 border-dashed border-[#D6D1C8] bg-[#FBFAF8] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E8F0FD] text-[#1F5BC4]">{busy ? <Loader2 size={18} className="animate-spin" /> : <FileUp size={18} />}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold">{view?.freelancerReport ? "Replace the report" : "Upload the report"}</div>
          <div className="text-[12px] text-[#6B6760]">PDF, Word, Excel or CSV. It is attached here and the key numbers are read out of it for you to check. Pictures and screenshots are attached but not read.</div>
        </div>
        <label className="cursor-pointer rounded-xl bg-[#1E2430] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#2E3542]">
          {busy ? "Reading…" : "Choose file"}
          <input type="file" accept=".pdf,.docx,.xlsx,.csv,.txt,.tsv,.md,image/*" className="sr-only" disabled={busy} onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
        </label>
      </div>
      {note && <p className="mt-3 rounded-xl bg-[#FFF3D9] px-3.5 py-2.5 text-[13px] text-[#6B4A06]">{note}</p>}
      {found && (
        <div className="mt-3 space-y-2.5 rounded-xl bg-white p-3.5 ring-1 ring-[#E9E6E0]">
          <div className="text-[13px] font-bold">We found these numbers. Check them, then use them. You can still edit every one.</div>
          {Object.entries(found).map(([name, values]) => {
            const lost = numberFields.filter(([key]) => !values[key]).map(([, label]) => label);
            return (
              <div key={name} className="rounded-xl bg-[#F8F7F4] p-3">
                <div className="mb-1.5 flex items-center gap-2 text-[14px] font-bold"><ChannelIcon name={name} size={18} />{name}</div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
                  {numberFields.filter(([key]) => values[key]).map(([key, label]) => <span key={key} className="text-[#6B6760]">{label} <b className="text-[#1E2430]">{values[key]}{key === "engagementRate" ? "%" : ""}</b></span>)}
                </div>
                {(values.topPost || values.observations) && <div className="mt-1.5 space-y-0.5 text-[12px] text-[#6B6760]">{values.topPost && <div>Best post: {values.topPost}</div>}{values.observations && <div>Noticed: {values.observations}</div>}</div>}
                {lost.length > 0 && <div className="mt-1.5 text-[12px] text-[#94600A]">Not found: {lost.join(", ")}. Add them after.</div>}
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <Button kind="primary" size="sm" onClick={use}><Check size={13} />Use these numbers</Button>
            <Button size="sm" onClick={() => setFound(null)}><X size={13} />Not these</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function NumbersForm({ client, month, platform, period, saved }: { client: Client; month: string; platform: string; period: ReportPeriod; saved?: ReportNumbers & { savedAt: string; savedBy: string } }) {
  const { saveNumbers } = useStore();
  const [numbers, setNumbers] = useState<ReportNumbers>(saved ? { ...saved } : emptyNumbers);
  return (
    <form onSubmit={(event) => { event.preventDefault(); saveNumbers(client.id, month, platform, numbers, period); }} className="space-y-3">
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
