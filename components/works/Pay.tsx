"use client";

import { useState } from "react";
import { useStore } from "@/lib/works/store";
import { currencies, freelancerCurrency, fromBase, money, toBase } from "@/lib/works/logic";
import type { Client } from "@/lib/works/types";
import { Button } from "./kit";

/** Pay a freelancer for a client. Pick the currency to pay in, and the amount is worked out from the agreed fee at the rate in Settings. */
export function PayButton({ client, label = "Pay" }: { client: Client; label?: string }) {
  const { state, payFreelancer } = useStore();
  const agreed = freelancerCurrency(state, client);
  const [currency, setCurrency] = useState(agreed);
  const amount = Math.round(fromBase(state, toBase(state, client.freelancerFee, agreed), currency) * 100) / 100;
  return (
    <span className="inline-flex items-center gap-1.5">
      <select aria-label="Pay in" value={currency} onChange={(event) => setCurrency(event.target.value)} className="rounded-lg border border-[#E2DED7] bg-white px-1.5 py-1 text-[12px] font-bold">
        {currencies.map((item) => <option key={item}>{item}</option>)}
      </select>
      <Button size="sm" kind="good" onClick={() => payFreelancer(client.id, currency, amount)}>{label} {money(amount, currency)}</Button>
    </span>
  );
}
