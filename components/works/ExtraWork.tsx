"use client";

import { Briefcase } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { extrasFor, shortDate } from "@/lib/works/logic";
import { Button, Chip, ClientMark } from "./kit";

/** Extra work that operations assigned to this person: a brochure, a video, a lead magnet. Starting one opens Create post with it chosen. */
export function ExtraWork({ personId, compact = false }: { personId: string; compact?: boolean }) {
  const { state, openPostWizard } = useStore();
  const items = extrasFor(state, personId);
  if (items.length === 0) return null;
  return (
    <section className={compact ? "rounded-2xl border border-[#E8D9B8] bg-[#FFF9EC] p-4" : "rounded-3xl border border-[#E8D9B8] bg-[#FFF9EC] p-5 sm:p-6"}>
      <div className="mb-3 flex items-center gap-2">
        <Briefcase size={17} className="text-[#94600A]" />
        <h2 className={compact ? "text-[15px] font-extrabold" : "text-[18px] font-extrabold"}>Extra work for you</h2>
        <Chip t="amber">{items.length}</Chip>
      </div>
      <ul className="space-y-2.5">
        {items.map(({ client, asset, made, started }) => (
          <li key={asset.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3.5">
            <ClientMark client={client} size={34} />
            <div className="min-w-[200px] flex-1">
              <div className="text-[14px] font-bold">{asset.name} <span className="font-normal text-[#8B867E]">· {client.name}</span></div>
              {asset.brief && <p className="line-clamp-2 text-[13px] text-[#55514B]">{asset.brief}</p>}
              <div className="mt-0.5 text-[12px] text-[#8B867E]">{asset.due ? `Due ${shortDate(asset.due)} · ` : ""}{made} of {asset.qty} made{started > made ? ` · ${started - made} in progress` : ""}</div>
            </div>
            <Button kind="primary" size="sm" onClick={() => openPostWizard({ clientId: client.id, assetId: asset.id })}>{started > made ? "Add another" : "Start"}</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
