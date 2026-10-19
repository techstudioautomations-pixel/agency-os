"use client";

import { useState } from "react";
import { ChevronDown, ClipboardCopy } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { gate, missing, nameOf, personById, progress, shortDate, statusLabel } from "@/lib/works/logic";
import type { CheckItem, CheckStatus } from "@/lib/works/types";
import { Avatar, Bar, Button, Card, Chip, Light, Segmented, tone } from "./kit";

const statuses: CheckStatus[] = ["Not asked", "Requested", "Received", "N/A"];
const statusTone = (status: CheckStatus) => (status === "Received" ? tone.green : status === "Requested" ? tone.amber : status === "N/A" ? tone.grey : { bg: "#FFFFFF", ink: "#55514B", dot: "#CFCAC2" });

export function GateBanner({ items, readyText = "Ready for production", what = "client" }: { items: CheckItem[]; readyText?: string; what?: string }) {
  const g = gate(items);
  const p = progress(items);
  const text = g.light === "green" ? readyText : g.light === "amber" ? `Almost there: ${g.blocking.length} requested, waiting to come back` : `Not ready: ${g.blocking.length} essential item${g.blocking.length === 1 ? "" : "s"} not asked for yet`;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl p-4" style={{ background: tone[g.light].bg }}>
      <Light light={g.light} size={14} />
      <div className="min-w-[200px] flex-1">
        <div className="text-[15px] font-bold" style={{ color: tone[g.light].ink }}>{text}</div>
        <div className="mt-0.5 text-[12px] text-[#55514B]">{p.complete} of {p.total} items done · soft checks are information, not blockers for this {what}</div>
      </div>
      <div className="w-full max-w-[220px]"><Bar value={p.percent} color={tone[g.light].dot} track="#FFFFFF" height={8} /></div>
    </div>
  );
}

export function ChecklistView({
  items,
  onChange,
  copyGroup,
}: {
  items: CheckItem[];
  onChange: (id: string, patch: Partial<CheckItem>) => void;
  /** Group whose questions can be copied to send to the client (the questionnaire). */
  copyGroup?: string;
}) {
  const { state, ping } = useStore();
  const [filter, setFilter] = useState<"all" | "missing" | "client" | "internal">("missing");
  const [open, setOpen] = useState("");
  const groups = [...new Set(items.map((item) => item.group))];
  const visible = (item: CheckItem) =>
    filter === "all" ? true : filter === "missing" ? missing([item]).length > 0 : filter === "client" ? item.owner === "client" : item.owner !== "client";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "missing", label: "Still missing", count: missing(items).length },
            { value: "client", label: "From the client", count: missing(items.filter((item) => item.owner === "client")).length },
            { value: "internal", label: "Our side", count: missing(items.filter((item) => item.owner !== "client")).length },
            { value: "all", label: "Everything", count: items.length },
          ]}
        />
        <div className="flex flex-wrap gap-2 text-[12px] text-[#6B6760]">
          {statuses.map((status) => (
            <span key={status} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border" style={{ background: statusTone(status).bg, borderColor: statusTone(status).dot }} />{status}</span>
          ))}
        </div>
      </div>

      {groups.map((group) => {
        const all = items.filter((item) => item.group === group);
        const list = all.filter(visible);
        const p = progress(all);
        if (!list.length && filter !== "all") return null;
        return (
          <Card key={group} pad={false}>
            <div className="flex flex-wrap items-center gap-3 border-b border-[#F0EEE9] px-5 py-3.5">
              <h3 className="text-[15px] font-bold">{group}</h3>
              <span className="text-[12px] font-semibold text-[#8B867E]">{p.complete}/{p.total}</span>
              <span className="w-24"><Bar value={p.percent} color={p.percent === 100 ? tone.green.dot : "#2F6FDB"} /></span>
              {group === copyGroup && (
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={async () => {
                    const text = [`A few questions so we can do great work for you:`, "", ...all.map((item, index) => `${index + 1}. ${item.label}`), "", "Short answers are fine. Links to documents are perfect."].join("\n");
                    try { await navigator.clipboard.writeText(text); ping("Questionnaire copied. Paste it into an email or doc."); } catch { ping("Copy was blocked by the browser"); }
                  }}
                >
                  <ClipboardCopy size={13} /> Copy questions for the client
                </Button>
              )}
            </div>
            <ul className="divide-y divide-[#F5F3EF]">
              {list.map((item) => {
                const owner = personById(state, item.owner);
                const expanded = open === item.id;
                return (
                  <li key={item.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <button onClick={() => setOpen(expanded ? "" : item.id)} className="flex min-w-[220px] flex-1 items-start gap-2 text-left">
                        <ChevronDown size={15} className={`mt-0.5 shrink-0 text-[#A8A39B] transition ${expanded ? "rotate-180" : ""}`} />
                        <span>
                          <span className={`text-[14px] font-semibold ${item.status === "N/A" ? "text-[#A8A39B] line-through" : ""}`}>{item.label}</span>
                          {item.soft && <Chip className="ml-2 !py-0.5 !text-[10px]">info</Chip>}
                          {item.note && !expanded && <span className="mt-0.5 block truncate text-[12px] text-[#6B6760]">{item.note}</span>}
                        </span>
                      </button>
                      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#55514B]">
                        {item.owner === "client" ? <Chip t="blue">Client</Chip> : <><Avatar name={owner?.name ?? "?"} color={owner?.color} size={20} />{nameOf(state, item.owner)}</>}
                      </span>
                      <span className="flex overflow-hidden rounded-lg border border-[#E7E4DE]" role="radiogroup" aria-label={`Status of ${item.label}`}>
                        {statuses.map((status) => {
                          const selected = item.status === status;
                          const colors = statusTone(status);
                          return (
                            <button key={status} role="radio" aria-checked={selected} onClick={() => onChange(item.id, { status })} className="border-l border-[#E7E4DE] px-2.5 py-1.5 text-[12px] font-semibold first:border-l-0" style={selected ? { background: colors.bg, color: colors.ink } : { color: "#8B867E" }}>
                              {statusLabel(item, status)}
                            </button>
                          );
                        })}
                      </span>
                      <span className="w-14 text-right text-[12px] text-[#8B867E]">{shortDate(item.date)}</span>
                    </div>
                    {expanded && (
                      <div className="mt-3 pl-6">
                        {item.hint && <p className="mb-2 text-[12px] text-[#6B6760]">{item.hint}</p>}
                        <textarea value={item.note} onChange={(event) => onChange(item.id, { note: event.target.value })} rows={2} placeholder={item.owner === "client" ? "Their answer, or a link to where it is" : "Note, link or date"} aria-label={`Note for ${item.label}`} className="w-full rounded-xl border border-[#E2DED7] bg-[#FBFAF8] px-3 py-2.5 text-[13px] outline-none focus:border-[#2F6FDB]" />
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#6B6760]">
                          Owner
                          <select value={item.owner} onChange={(event) => onChange(item.id, { owner: event.target.value })} className="rounded-lg border border-[#E2DED7] bg-white px-2 py-1 text-[12px] font-semibold">
                            <option value="client">Client</option>
                            {[...state.people, ...state.freelancers].map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
      {filter !== "all" && missing(items).filter(visible).length === 0 && (
        <div className="rounded-2xl bg-[#E7F6EE] p-5 text-[14px] font-semibold text-[#17804A]">Nothing missing in this view.</div>
      )}
    </div>
  );
}
