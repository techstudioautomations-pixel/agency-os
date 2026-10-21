"use client";

import { ArrowRight, Check } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { isFreelancer, monthName, shiftMonth, type MonthArea } from "@/lib/works/logic";
import type { Client } from "@/lib/works/types";
import { Button, Chip } from "./kit";

/** Can this person tick by hand in this list? Freelancers tick theirs. Operations and owners can tick either. */
export function useCanTick(areaId: MonthArea["id"]) {
  const { state } = useStore();
  return isFreelancer(state) ? areaId === "freelancer" : true;
}

/** One monthly checklist. Steps that can be worked out from the posts and reports tick themselves. */
export function MonthChecklist({ client, area, month }: { client: Client; area: MonthArea; month: string }) {
  const { go, toggleMonthStep } = useStore();
  const openReport = () => go({ view: "reports", clientId: client.id, month: shiftMonth(month, -1) });
  const canTick = useCanTick(area.id);
  const done = area.steps.filter((step) => step.done).length;
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-bold">{area.label}</h3>
          <p className="text-[12px] text-[#6B6760]">{area.blurb} {monthName(month)}.</p>
        </div>
        <Chip t={done === area.steps.length ? "green" : "grey"}>{done}/{area.steps.length}</Chip>
      </div>
      <ul className="divide-y divide-[#F3F1ED] rounded-xl border border-[#F0EEE9] bg-white">
        {area.steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3 px-3.5 py-2.5">
            {step.manual ? (
              <button onClick={() => toggleMonthStep(client.id, month, step.id)} disabled={!canTick} aria-pressed={step.done} aria-label={`${step.done ? "Untick" : "Tick"} ${step.label}`} className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition ${step.done ? "border-[#1D9E5A] bg-[#1D9E5A] text-white" : "border-[#D9D5CE] bg-white hover:border-[#2F6FDB]"} ${canTick ? "" : "cursor-not-allowed opacity-50"}`}>{step.done && <Check size={15} strokeWidth={3} />}</button>
            ) : (
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${step.done ? "border-[#1D9E5A] bg-[#1D9E5A] text-white" : "border-dashed border-[#D9D5CE] bg-[#FBFAF8]"}`} title="Ticks itself from the work">{step.done && <Check size={15} strokeWidth={3} />}</span>
            )}
            <span className="min-w-0 flex-1">
              <span className={`block text-[14px] ${step.done ? "text-[#9A958D] line-through" : "font-semibold"}`}>{step.label}</span>
              {step.hint && !step.done && <span className="block text-[12px] text-[#8B867E]">{step.hint}</span>}
            </span>
            {step.key === "report-in" ? (
              <Button size="sm" kind={step.done ? "secondary" : "primary"} onClick={openReport}>{step.done ? "Edit report" : "Add report"} <ArrowRight size={13} /></Button>
            ) : step.go ? <Button size="sm" onClick={() => go(step.go!)}>Open <ArrowRight size={13} /></Button> : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] text-[#8B867E]">Steps with a dashed box tick themselves when the work is done. The others are ticked by hand.</p>
    </div>
  );
}
