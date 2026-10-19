"use client";

import { Bell, CalendarDays, ClipboardCheck, FileBarChart2, Handshake, Lightbulb, PenLine, Palette, Rocket, Send, ShieldCheck, UserCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/works/store";
import { isFreelancer, isOwner, todayIso } from "@/lib/works/logic";
import { asset, Button, Card, Chip, Field, fieldClass } from "./kit";
import { Shell } from "./Shell";

type Node = { icon: ReactNode; title: string; who: string; color: string; rule: string };

function Flow({ title, sub, nodes }: { title: string; sub: string; nodes: Node[] }) {
  return (
    <Card>
      <h3 className="text-[18px] font-extrabold">{title}</h3>
      <p className="mt-0.5 text-[13px] text-[#6B6760]">{sub}</p>
      <ol className="mt-5 grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))` }}>
        {nodes.map((node, index) => (
          <li key={node.title} className="relative">
            <div className="h-full rounded-2xl border-2 p-3.5" style={{ borderColor: `${node.color}40`, background: `${node.color}0D` }}>
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: node.color }}>{node.icon}</span>
                <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: node.color }}>Step {index + 1}</span>
              </div>
              <div className="mt-2.5 text-[14px] font-bold leading-snug">{node.title}</div>
              <div className="mt-1 text-[12px] font-semibold text-[#55514B]">{node.who}</div>
              <div className="mt-2 text-[12px] leading-snug text-[#6B6760]">{node.rule}</div>
            </div>
            {index < nodes.length - 1 && <span aria-hidden className="absolute -right-[10px] top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-white text-[12px] font-bold text-[#A8A39B] shadow sm:grid">›</span>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function MonthRibbon() {
  const { state } = useStore();
  const d = state.settings.dates;
  const today = Number(todayIso().slice(8, 10));
  const marks = [
    { day: d.capture, label: "Capture call", who: "Client + María", color: "#2F6FDB" },
    { day: d.plan, label: "Plan approved", who: "Reviewer → client", color: "#7C5CD6" },
    { day: d.design, label: "Designs done", who: "Freelancer", color: "#E08A1E" },
    { day: d.approval, label: "Client approval", who: "Operations logs it", color: "#E0567A" },
    { day: d.schedule, label: "All scheduled", who: "Freelancer", color: "#1D9E5A" },
  ];
  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-[18px] font-extrabold">The month on one line</h3>
          <p className="mt-0.5 text-[13px] text-[#6B6760]">Every client runs on the same dates. Last month&apos;s report goes out in the first week.</p>
        </div>
        <Chip t="blue">Today is the {today}th</Chip>
      </div>
      <div className="relative mt-8 mb-2 h-2 rounded-full bg-[#EEECE7]">
        <div className="absolute inset-y-0 left-0 rounded-full bg-[#C9D9F6]" style={{ width: `${Math.min(100, (today / 31) * 100)}%` }} />
        {marks.map((mark) => (
          <div key={mark.label} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${(mark.day / 31) * 100}%` }}>
            <span className="grid h-8 w-8 place-items-center rounded-full border-4 border-white text-[11px] font-extrabold text-white shadow" style={{ background: mark.color }}>{mark.day}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-5">
        {marks.map((mark) => (
          <div key={mark.label} className="rounded-xl p-3" style={{ background: `${mark.color}12` }}>
            <div className="text-[13px] font-bold" style={{ color: mark.color }}>By the {mark.day}th</div>
            <div className="text-[13px] font-semibold">{mark.label}</div>
            <div className="text-[12px] text-[#6B6760]">{mark.who}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const notifications = [
  ["Freelancer submits copy or design", "Reviewer", "Email + in app + short Slack ping"],
  ["Changes requested", "Freelancer", "Email + in app"],
  ["Approved", "Freelancer, and whoever schedules", "Email + in app"],
  ["Client approval due in 1 day", "Operations for that client", "In app"],
  ["Nothing reviewed after the agreed days", "Reviewer, then María", "In app"],
  ["Monthly report not handed in", "Freelancer, then operations", "In app"],
  ["Lead marked as won", "María and operations", "Email + in app"],
];

function SettingsPanel() {
  const { state, updateSettings, reset } = useStore();
  const settings = state.settings;
  const setDate = (key: keyof typeof settings.dates, value: number) => updateSettings({ dates: { ...settings.dates, [key]: Math.max(1, Math.min(28, value || 1)) } });
  return (
    <Card>
      <div className="mb-1 flex items-center gap-2"><CalendarDays size={18} className="text-[#1F5BC4]" /><h3 className="text-[17px] font-bold">Rules we agreed</h3></div>
      <p className="mb-5 text-[13px] text-[#6B6760]">These drive the Today queue and the escalations. Change them here and everything follows.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Default approval for new clients"><select value={settings.defaultApprovalMode} onChange={(event) => updateSettings({ defaultApprovalMode: event.target.value as typeof settings.defaultApprovalMode })} className={fieldClass}><option value="A">A · Plan and posts</option><option value="B">B · Plan only</option><option value="C">C · Internal only</option></select></Field>
        <Field label="Who reviews copy and design"><select value={settings.reviewer} onChange={(event) => updateSettings({ reviewer: event.target.value as typeof settings.reviewer })} className={fieldClass}><option value="ops-first">Operations first, María samples</option><option value="maria-all">María reviews everything</option></select></Field>
        <Field label="Escalate an unreviewed item after (days)"><input type="number" min={1} max={30} value={settings.escalationDays} onChange={(event) => updateSettings({ escalationDays: Number(event.target.value) || 1 })} className={fieldClass} /></Field>
        <Field label="Client has this many days to approve"><input type="number" min={1} max={14} value={settings.clientApprovalDays} onChange={(event) => updateSettings({ clientApprovalDays: Number(event.target.value) || 1 })} className={fieldClass} /></Field>
        <Field label="Lead follow-up after (days)"><input type="number" min={1} max={30} value={settings.followUpDays} onChange={(event) => updateSettings({ followUpDays: Number(event.target.value) || 1 })} className={fieldClass} /></Field>
        <Field label="Tax set-aside (%)" hint="A saving rule, not tax advice."><input type="number" min={0} max={60} value={settings.taxSetAside} onChange={(event) => updateSettings({ taxSetAside: Number(event.target.value) || 0 })} className={fieldClass} /></Field>
      </div>
      <div className="mt-5 border-t border-[#F0EEE9] pt-5">
        <h4 className="mb-3 text-[13px] font-bold">Monthly dates · day of month</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([["capture", "Capture call"], ["plan", "Plan approved"], ["design", "Designs done"], ["approval", "Client approval"], ["schedule", "All scheduled"]] as [keyof typeof settings.dates, string][]).map(([key, label]) => (
            <Field key={key} label={label}><input type="number" min={1} max={28} value={settings.dates[key]} onChange={(event) => setDate(key, Number(event.target.value))} className={fieldClass} /></Field>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#F0EEE9] pt-5">
        <Button kind="danger" onClick={() => { if (window.confirm("Replace everything in this browser with the sample data?")) reset(); }}>Reset sample data</Button>
        <a href={asset("/classic/")} className="text-[13px] font-semibold text-[#1F5BC4]">Open the previous version</a>
      </div>
    </Card>
  );
}

export function How() {
  const { state } = useStore();
  const freelancer = isFreelancer(state);
  const owner = isOwner(state);
  return (
    <Shell title="How we work" sub="The agency on one page. Every flow below is what the OS enforces.">
      <div className="space-y-5">
        <MonthRibbon />

        {!freelancer && (
          <Flow
            title="From lead to live client"
            sub="Gareth wins it, María sets it up, operations makes it run. The checklist light turns green when production can start."
            nodes={[
              { icon: <Handshake size={17} />, title: "Lead to proposal", who: "Gareth", color: "#2F6FDB", rule: "New → contacted → discovery call → proposal. Follow-up reminder after the agreed days." },
              { icon: <UserCheck size={17} />, title: "Won: hand over", who: "Gareth → María", color: "#1D9E5A", rule: "Mark as won. The client and its checklist are created with the package filled in." },
              { icon: <ClipboardCheck size={17} />, title: "Kick-off and questionnaire", who: "María + client", color: "#7C5CD6", rule: "Call or questionnaire. Agree the one approver and the approval mode." },
              { icon: <Users size={17} />, title: "Set up the workspace", who: "Operations", color: "#E08A1E", rule: "Drive, chat channel, Publer, Canva. Assign a freelancer with NDA and contract signed." },
              { icon: <Rocket size={17} />, title: "Ready for production", who: "Everyone", color: "#E0567A", rule: "Green light: every essential item is in. Soft questions only inform the strategy." },
            ]}
          />
        )}

        <Flow
          title="A post's journey"
          sub="One post, one page: copy, artwork, comments, decisions and links all stay together."
          nodes={[
            { icon: <Lightbulb size={17} />, title: "Idea approved", who: "Reviewer", color: "#7C5CD6", rule: "Ideas arrive as cards. Approve, maybe or reject, and give each a pillar and format." },
            { icon: <PenLine size={17} />, title: "Copy, then review", who: "Freelancer → reviewer", color: "#2F6FDB", rule: "Copy is approved before design starts. Changes come back as a ticklist with a category." },
            { icon: <Palette size={17} />, title: "Design, then review", who: "Freelancer → reviewer", color: "#E08A1E", rule: "Upload artwork and the editable Canva link. Technical claims need the expert tick first." },
            { icon: <Send size={17} />, title: "Client approves", who: "Operations logs it", color: "#E0567A", rule: `Mode A only. ${state.settings.clientApprovalDays} working days, one consolidated round per batch.` },
            { icon: <CalendarDays size={17} />, title: "Scheduled, then live", who: "Freelancer", color: "#1D9E5A", rule: "Schedule in Publer, final files in the client's Drive, then add the live link." },
          ]}
        />

        <Flow
          title="Month-end report"
          sub="Each client gets a row on the Reports page. Attach the file, tick it sent, and the month is closed."
          nodes={[
            { icon: <FileBarChart2 size={17} />, title: "Freelancer report in", who: "Freelancer, by the 5th", color: "#2F6FDB", rule: "Uploaded in Marketing → Results as a file or link, with key numbers if available." },
            { icon: <ClipboardCheck size={17} />, title: "Client report built", who: "Operations", color: "#E08A1E", rule: "From the freelancer report. A starter report can be downloaded from Reports." },
            { icon: <Send size={17} />, title: "Client report sent", who: "Operations", color: "#1D9E5A", rule: "Attach the final report and tick it sent." },
            { icon: <ShieldCheck size={17} />, title: "Finance statement sent", who: "María", color: "#7C5CD6", rule: "Owners only: download, attach and tick per client in Finance." },
          ]}
        />

        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <div className="flex items-center gap-2"><Bell size={18} className="text-[#1F5BC4]" /><h3 className="text-[18px] font-extrabold">Who gets notified</h3></div>
            <ul className="mt-4 divide-y divide-[#F0EEE9]">
              {notifications.map(([event, who, how]) => (
                <li key={event} className="grid gap-1 py-2.5 text-[13px] sm:grid-cols-[1.3fr_1fr_1fr]"><b>{event}</b><span>{who}</span><span className="text-[#6B6760]">{how}</span></li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-[#8B867E]">In this preview, notifications appear in the bell. Email and Slack sending switch on once the database is connected.</p>
          </Card>
          <Card>
            <h3 className="text-[18px] font-extrabold">Approval modes</h3>
            <p className="mt-0.5 text-[13px] text-[#6B6760]">Agreed with each client at kick-off.</p>
            <div className="mt-4 space-y-2.5">
              {[["A", "Plan and posts", "The client approves the monthly plan and every finished post."], ["B", "Plan only", "The client approves the plan. We approve the posts."], ["C", "Internal only", "We approve the plan and the posts ourselves."]].map(([code, title, detail]) => (
                <div key={code} className="flex items-start gap-3 rounded-xl bg-[#F6F5F2] p-3.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#1E2430] text-[13px] font-bold text-white">{code}</span>
                  <span><b className="text-[14px]">{title}</b><span className="block text-[13px] text-[#6B6760]">{detail}</span></span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-[#F1ECFC] p-3.5 text-[13px] text-[#4A3596]"><b>Freelancer gate:</b> nobody is assigned to a client until their NDA and contract are signed. Access is removed the same day they leave.</div>
          </Card>
        </div>

        {owner && <SettingsPanel />}
      </div>
    </Shell>
  );
}
