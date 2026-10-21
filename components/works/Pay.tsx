"use client";

import { useState } from "react";
import { useStore } from "@/lib/works/store";
import { clientPayStatus, currencies, freelancerCostBase, freelancerCurrency, fromBase, money, toBase } from "@/lib/works/logic";
import type { Client } from "@/lib/works/types";
import { Button } from "./kit";

/**
 * Pay the freelancers on a client for the month. Pick the currency to pay in, and the amount is worked out at the rate in Settings.
 * When the client has payments set up, this marks every one still open as paid. Otherwise it pays the single figure on the client page.
 */
export function PayButton({ client, label = "Pay", month }: { client: Client; label?: string; month?: string }) {
  const { state, payFreelancer, payOccurrences } = useStore();
  const at = month ?? state.month;
  const status = clientPayStatus(state, client, at);
  const [currency, setCurrency] = useState(freelancerCurrency(state, client));
  const base = status.has ? status.open.reduce((sum, item) => sum + toBase(state, item.fee.amount, item.fee.currency), 0) : freelancerCostBase(state, client, at);
  const amount = Math.round(fromBase(state, base, currency) * 100) / 100;
  const pay = () => (status.has ? payOccurrences(status.open.map((item) => ({ personId: item.person.id, feeId: item.fee.id, month: at })), currency) : payFreelancer(client.id, currency, amount));
  return (
    <span className="inline-flex items-center gap-1.5">
      <select aria-label="Pay in" value={currency} onChange={(event) => setCurrency(event.target.value)} className="rounded-lg border border-[#E2DED7] bg-white px-1.5 py-1 text-[12px] font-bold">
        {currencies.map((item) => <option key={item}>{item}</option>)}
      </select>
      <Button size="sm" kind="good" onClick={pay}>{label} {money(amount, currency)}</Button>
    </span>
  );
}
