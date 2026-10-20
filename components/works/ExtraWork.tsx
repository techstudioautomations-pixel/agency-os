"use client";

import { ArrowRight, Briefcase } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { extrasFor, shortDate } from "@/lib/works/logic";
import { Button, ClientMark, Empty } from "./kit";

/** The full list of extra work assigned to this person. Starting one opens Create post with it chosen. */
export function ExtraWork({ personId, clientId }: { personId: string; clientId?: string }) {
  const { state, openPostWizard } = useStore();
  const items = extrasFor(state, personId).filter((item) => !clientId || item.client.id === clientId);
  if (items.length === 0) return <Empty title="No extra work for you">When operations assigns you a brochure, a video or anything outside the monthly posts, it shows here.</Empty>;
  return (
    <ul className="space-y-2.5">
      {items.map(({ client, asset, made, started }) => (
        <li key={asset.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E9E6E0] bg-white p-4">
          <ClientMark client={client} size={38} />
          <div className="min-w-[200px] flex-1">
            <div className="text-[15px] font-bold">{asset.name} <span className="font-normal text-[#8B867E]">· {client.name}</span></div>
            {asset.brief && <p className="mt-0.5 text-[13px] text-[#55514B]">{asset.brief}</p>}
            <div className="mt-1 text-[12px] text-[#8B867E]">{asset.due ? `Due ${shortDate(asset.due)} · ` : ""}{made} of {asset.qty} made{started > made ? ` · ${started - made} in progress` : ""}</div>
          </div>
          <Button kind="primary" size="sm" onClick={() => openPostWizard({ clientId: client.id, assetId: asset.id })}>{started > made ? "Add another" : "Start"}</Button>
        </li>
      ))}
    </ul>
  );
}

/** A slim reminder on the dashboard. It takes one line and links to the full list. */
export function ExtraAlert({ personId }: { personId: string }) {
  const { state, go } = useStore();
  const items = extrasFor(state, personId);
  if (items.length === 0) return null;
  const first = items[0];
  const only = new Set(items.map((item) => item.client.id)).size === 1 ? first.client.id : "all";
  return (
    <button onClick={() => go({ view: "marketing", clientId: only, tab: "extra" })} className="flex w-full items-center gap-3 rounded-2xl border border-[#E8D9B8] bg-[#FFF9EC] px-4 py-3 text-left transition hover:border-[#D9C28F]">
      <Briefcase size={17} className="shrink-0 text-[#94600A]" />
      <span className="min-w-0 flex-1 truncate text-[14px]"><b>Extra work for you</b> · {first.asset.name} for {first.client.name}{first.asset.due ? `, due ${shortDate(first.asset.due)}` : ""}{items.length > 1 ? ` and ${items.length - 1} more` : ""}</span>
      <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#D64545] px-1.5 text-[12px] font-bold text-white">{items.length}</span>
      <ArrowRight size={15} className="shrink-0 text-[#94600A]" />
    </button>
  );
}
