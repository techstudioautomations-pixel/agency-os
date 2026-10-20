"use client";

import type { Client } from "@/lib/works/types";

/** Adds one of the client's calls to action to the caption being written. */
export function CtaPicker({ client, onPick }: { client?: Client; onPick: (text: string) => void }) {
  const ctas = client?.strategy.ctas ?? [];
  if (ctas.length === 0) return null;
  const groups = [...new Set(ctas.map((cta) => cta.group))];
  return (
    <select
      value=""
      onChange={(event) => { const found = ctas.find((cta) => cta.id === event.target.value); if (found) onPick(found.text); }}
      aria-label="Add a call to action"
      className="mt-2 w-full rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[13px] font-semibold text-[#1F5BC4]"
    >
      <option value="">+ Add a call to action…</option>
      {groups.map((group) => (
        <optgroup key={group} label={group}>
          {ctas.filter((cta) => cta.group === group).map((cta) => <option key={cta.id} value={cta.id}>{cta.text.length > 90 ? `${cta.text.slice(0, 90)}…` : cta.text}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
