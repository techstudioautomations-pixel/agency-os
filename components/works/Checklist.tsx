"use client";

import { useState } from "react";
import { Check, ChevronDown, ClipboardCopy } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { gate, nameOf, personById, progress, shortDate } from "@/lib/works/logic";
import type { CheckItem } from "@/lib/works/types";
import { Avatar, Bar, Button, Chip, Light, tone } from "./kit";

const isDone = (item: CheckItem) => item.status === "Received" || item.status === "N/A";

export function GateBanner({ items, readyText = "Ready for production", what = "client" }: { items: CheckItem[]; readyText?: string; what?: string }) {
  const g = gate(items);
  const p = progress(items);
  const text = g.light === "green" ? readyText : g.light === "amber" ? `Almost there · waiting on ${g.blocking.length}` : `${g.blocking.length} essential item${g.blocking.length === 1 ? "" : "s"} still to do`;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl p-4" style={{ background: tone[g.light].bg }}>
      <Light light={g.light} size={14} />
      <div className="min-w-[200px] flex-1">
        <div className="text-[15px] font-bold" style={{ color: tone[g.light].ink }}>{text}</div>
        <div className="mt-0.5 text-[12px] text-[#55514B]">{p.complete} of {p.total} done · items marked “info” don&apos;t block this {what}</div>
      </div>
      <div className="flex w-full max-w-[240px] items-center gap-2"><Bar value={p.percent} color={tone[g.light].dot} track="#FFFFFF" height={8} /><b className="text-[13px]">{p.percent}%</b></div>
    </div>
  );
}

/** A plain tick-list, grouped by phase. Click an item's text for notes and options. */
export function PhaseChecklist({
  items,
  onToggle,
  onUpdate,
  copyGroup,
}: {
  items: CheckItem[];
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CheckItem>) => void;
  copyGroup?: string;
}) {
  const { state, ping } = useStore();
  const [hideDone, setHideDone] = useState(false);
  const [open, setOpen] = useState("");
  const phases = [...new Set(items.map((item) => item.group))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <label className="flex items-center gap-2 text-[13px] font-semibold text-[#55514B]"><input type="checkbox" checked={hideDone} onChange={(event) => setHideDone(event.target.checked)} className="h-4 w-4" />Hide what&apos;s done</label>
      </div>
      {phases.map((phase) => {
        const all = items.filter((item) => item.group === phase);
        const p = progress(all);
        const list = all.filter((item) => !hideDone || !isDone(item));
        const complete = p.percent === 100;
        if (hideDone && list.length === 0) return null;
        return (
          <section key={phase} className="min-w-0 overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white">
            <div className="flex flex-wrap items-center gap-3 px-5 py-3.5" style={{ background: complete ? tone.green.bg : "#FBFAF8" }}>
              {complete && <span className="grid h-6 w-6 place-items-center rounded-full bg-[#1D9E5A] text-white"><Check size={14} /></span>}
              <h3 className="text-[15px] font-bold">{phase}</h3>
              <span className="text-[12px] font-semibold text-[#8B867E]">{p.complete}/{p.total}</span>
              <span className="w-24"><Bar value={p.percent} color={complete ? tone.green.dot : "#2F6FDB"} /></span>
              {phase === copyGroup && (
                <Button size="sm" className="ml-auto" onClick={async () => {
                  const text = ["A few questions so we can do great work for you:", "", ...all.map((item, index) => `${index + 1}. ${item.label}`), "", "Short answers are fine. Links to documents are perfect."].join("\n");
                  try { await navigator.clipboard.writeText(text); ping("Questions copied. Paste them into an email."); } catch { ping("Copy was blocked by the browser"); }
                }}><ClipboardCopy size={13} />Copy questions for the client</Button>
              )}
            </div>
            <ul>
              {list.map((item) => {
                const done = isDone(item);
                const owner = personById(state, item.owner);
                const expanded = open === item.id;
                return (
                  <li key={item.id} className="border-t border-[#F3F1ED] px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <button onClick={() => onToggle(item.id)} role="checkbox" aria-checked={done} aria-label={item.label} className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition ${done ? "border-[#1D9E5A] bg-[#1D9E5A] text-white" : "border-[#CFCAC2] bg-white hover:border-[#1D9E5A]"}`}>
                        {done && <Check size={15} strokeWidth={3} />}
                      </button>
                      <button onClick={() => setOpen(expanded ? "" : item.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <span className={`text-[14px] ${done ? "text-[#9A958D] line-through" : "font-semibold"}`}>{item.label}</span>
                        {item.soft && <Chip className="!py-0 !text-[10px]">info</Chip>}
                        {item.status === "Requested" && <Chip t="amber" className="!py-0 !text-[10px]">asked</Chip>}
                        {item.status === "N/A" && <Chip className="!py-0 !text-[10px]">N/A</Chip>}
                        <ChevronDown size={14} className={`shrink-0 text-[#B5B0A8] transition ${expanded ? "rotate-180" : ""}`} />
                      </button>
                      <span className="hidden items-center gap-1.5 text-[12px] font-semibold text-[#6B6760] sm:flex">
                        {item.owner === "client" ? <Chip t="blue" className="!py-0.5">Client</Chip> : <><Avatar name={owner?.name ?? "?"} color={owner?.color} size={20} />{nameOf(state, item.owner)}</>}
                      </span>
                      <span className="hidden w-14 text-right text-[12px] text-[#9A958D] sm:block">{done ? shortDate(item.date) : ""}</span>
                    </div>
                    {item.note && !expanded && <p className="ml-9 mt-0.5 truncate text-[12px] text-[#6B6760]">{item.note}</p>}
                    {expanded && (
                      <div className="ml-9 mt-2 space-y-2">
                        {item.hint && <p className="text-[12px] text-[#6B6760]">{item.hint}</p>}
                        <textarea value={item.note} onChange={(event) => onUpdate(item.id, { note: event.target.value })} rows={2} placeholder={item.owner === "client" ? "Their answer, or a link to it" : "Note or link"} aria-label={`Note for ${item.label}`} className="w-full rounded-xl border border-[#E2DED7] bg-[#FBFAF8] px-3 py-2 text-[13px] outline-none focus:border-[#2F6FDB]" />
                        <div className="flex flex-wrap items-center gap-2 text-[12px]">
                          <select value={item.owner} onChange={(event) => onUpdate(item.id, { owner: event.target.value })} aria-label="Owner" className="rounded-lg border border-[#E2DED7] bg-white px-2 py-1 font-semibold">
                            <option value="client">Client</option>
                            {[...state.people, ...state.freelancers].map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                          </select>
                          {!done && <button onClick={() => onUpdate(item.id, { status: item.status === "Requested" ? "Not asked" : "Requested" })} className="rounded-lg bg-[#FFF3D9] px-2.5 py-1 font-semibold text-[#94600A]">{item.status === "Requested" ? "Undo “asked”" : "Mark as asked / waiting"}</button>}
                          <button onClick={() => onUpdate(item.id, { status: item.status === "N/A" ? "Not asked" : "N/A" })} className="rounded-lg bg-[#F1F0ED] px-2.5 py-1 font-semibold text-[#55514B]">{item.status === "N/A" ? "Undo N/A" : "Not applicable"}</button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
