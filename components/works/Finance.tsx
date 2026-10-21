"use client";

import { useState } from "react";
import { ArrowRight, Check, Download, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { approx, clientCostsBase, clientCostsIn, clientCurrency, clientTeam, currencies, freelancerCostBase, fixedCostsBase, fixedCostsIn, fromBase, incomeBase, isOwner, money, monthName, nameOf, occurrencesIn, otherFreelancerCostBase, shiftMonth, shortDate, todayIso, toBase, type Occurrence } from "@/lib/works/logic";
import type { Client, State } from "@/lib/works/types";
import { Shell } from "./Shell";
import { AttachField, Avatar, Button, Card, CardHead, Chip, ClientMark, Empty, Field, Segmented, fieldClass, tone } from "./kit";

function statementHtml(state: State, client: Client, month: string) {
  const cur = state.settings.currency;
  const invoice = state.invoices.find((item) => item.clientId === client.id && item.month === month);
  const costs = clientCostsIn(client, month);
  const income = incomeBase(state, client);
  const freelance = freelancerCostBase(state, client, month);
  const feeCur = clientCurrency(state, client);
  const extra = clientCostsBase(state, client, month);
  const row = (label: string, value: string, bold = false) => `<tr><td>${label}</td><td style="text-align:right;${bold ? "font-weight:700" : ""}">${value}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${client.name} · ${monthName(month)} finance</title><style>body{font:15px/1.5 Arial,sans-serif;color:#1e2430;max-width:640px;margin:40px auto;padding:0 24px}h1{font-size:26px;margin:4px 0 20px}small{color:#6b7280;letter-spacing:.12em;font-weight:700}table{width:100%;border-collapse:collapse}td{padding:10px 4px;border-bottom:1px solid #eee}.total td{border-top:2px solid #1e2430;font-size:18px}footer{margin-top:30px;color:#9ca3af;font-size:12px}</style></head><body><small>FINANCE STATEMENT · INTERNAL</small><h1>${client.name} · ${monthName(month)}</h1><table>${row(`Monthly fee (${client.package})`, `${money(client.fee, feeCur)}${approx(state, client.fee, feeCur) ? ` (${approx(state, client.fee, feeCur)})` : ""}`)}${client.addOnFee ? row("Add-ons", money(client.addOnFee, feeCur)) : ""}${row("Invoice", invoice?.status ?? "Not sent")}${row(`Freelancers (${clientTeam(client).map((id) => nameOf(state, id)).join(", ") || "none"})`, `− ${money(freelance, cur)}`)}${costs.map((item) => row(item.label, `− ${money(toBase(state, item.amount, item.currency), cur)}`)).join("")}<tr class="total"><td><b>Margin</b></td><td style="text-align:right"><b>${money(income - freelance - extra, cur)}</b></td></tr></table><footer>Prepared by The Works · ${todayIso()}</footer></body></html>`;
}

/** One payment's status in Finance: still to pay, with the currency to pay it in, or paid. Marking paid is done here. */
function PayCell({ item }: { item: Occurrence }) {
  const store = useStore();
  const { state } = store;
  const [currency, setCurrency] = useState(item.fee.currency);
  const amount = Math.round(fromBase(state, toBase(state, item.fee.amount, item.fee.currency), currency) * 100) / 100;
  if (item.paid) {
    return <span className="inline-flex items-center gap-2"><Chip t="green" dot>Paid {money(item.paid.amount, item.paid.currency)}</Chip><button onClick={() => store.unpayOccurrence(item.person.id, item.fee.id, item.month)} className="text-[12px] font-semibold text-[#8B867E] hover:text-[#B83232]">Undo</button></span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      {item.date < todayIso() && <Chip t="red">Due</Chip>}
      <select aria-label="Pay in" value={currency} onChange={(event) => setCurrency(event.target.value)} className="rounded-lg border border-[#E2DED7] bg-white px-1.5 py-1 text-[12px] font-bold">{currencies.map((entry) => <option key={entry}>{entry}</option>)}</select>
      <Button size="sm" kind="good" onClick={() => store.payOccurrences([{ personId: item.person.id, feeId: item.fee.id, month: item.month }], currency)}>Mark paid {money(amount, currency)}</Button>
    </span>
  );
}

/** Every payment to a freelancer this month: who, for which client, what for, how often, how much, and whether it is paid. Read here, set up on the client. */
function FreelancerPayments({ month }: { month: string }) {
  const { state, go } = useStore();
  const cur = state.settings.currency;
  const rows = occurrencesIn(state, month);
  const baseOf = (item: Occurrence) => toBase(state, item.paid?.amount ?? item.fee.amount, item.paid?.currency ?? item.fee.currency);
  const total = rows.reduce((sum, item) => sum + baseOf(item), 0);
  const paid = rows.filter((item) => item.paid).reduce((sum, item) => sum + baseOf(item), 0);
  const people = [...new Set(rows.map((item) => item.person.id))].map((id) => ({ person: rows.find((item) => item.person.id === id)!.person, sum: rows.filter((item) => item.person.id === id).reduce((sum, item) => sum + baseOf(item), 0) }));
  const biggest = Math.max(1, ...people.map((entry) => entry.sum));
  return (
    <Card pad={false}>
      <div className="px-5 pt-5"><CardHead title={`Payments to freelancers · ${monthName(month)}`} sub="Who gets paid, for which client and what, and whether it is done. Mark them paid here. To add or change one, open the client's Finance tab." /></div>
      {rows.length === 0 ? <p className="px-5 pb-5 text-[13px] text-[#8B867E]">No payments set up for this month. Add them on a client&apos;s Finance tab.</p> : (
        <>
          <div className="grid gap-2 px-5 pb-4 sm:grid-cols-2 lg:grid-cols-3">
            {people.map(({ person, sum }) => (
              <div key={person.id} className="flex items-center gap-2.5 rounded-xl bg-[#F8F7F4] px-3 py-2">
                <Avatar name={person.name} color={person.color} photo={person.photo} size={26} />
                <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold">{person.name}</div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#2F6FDB]" style={{ width: `${(sum / biggest) * 100}%` }} /></div></div>
                <b className="text-[13px]">{money(sum, cur)}</b>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead><tr className="border-y border-[#F0EEE9] bg-[#FBFAF8] text-[11px] font-bold uppercase tracking-wide text-[#8B867E]"><th className="px-5 py-2.5">Due</th><th className="px-3">Freelancer</th><th className="px-3">Client</th><th className="px-3">What it covers</th><th className="px-3">How often</th><th className="px-3 text-right">Amount</th><th className="px-3 text-right">In {cur}</th><th className="px-5">Status</th></tr></thead>
              <tbody>
                {rows.map((item) => {
                  const client = state.clients.find((entry) => entry.id === item.fee.clientId);
                  return (
                    <tr key={`${item.fee.id}-${item.month}`} className="border-b border-[#F5F3EF] last:border-0">
                      <td className="px-5 py-3 font-semibold">{shortDate(item.date)}</td>
                      <td className="px-3"><span className="flex items-center gap-2"><Avatar name={item.person.name} color={item.person.color} photo={item.person.photo} size={22} />{item.person.name}</span></td>
                      <td className="px-3">{client ? <button onClick={() => go({ view: "client", clientId: client.id, tab: "finance" })} className="inline-flex items-center gap-1.5 font-semibold hover:text-[#1F5BC4]"><ClientMark client={client} size={20} />{client.name}</button> : <span className="text-[#8B867E]">{item.fee.custom ?? "Not for a client"}</span>}</td>
                      <td className="px-3">{item.fee.what || "Payment"}{item.fee.kind === "add-on" && <span className="ml-1.5 align-middle"><Chip t="purple">Add-on</Chip></span>}</td>
                      <td className="px-3 text-[12px] text-[#6B6760]">{item.fee.frequency === "monthly" ? "Monthly" : "One time"} · {item.fee.channel}</td>
                      <td className="px-3 text-right font-bold">{money(item.fee.amount, item.fee.currency)}</td>
                      <td className="px-3 text-right">{item.fee.currency === cur ? <span className="text-[#B5B0A8]">—</span> : money(toBase(state, item.fee.amount, item.fee.currency), cur)}</td>
                      <td className="px-5"><PayCell item={item} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="border-t-2 border-[#E9E6E0] bg-[#FBFAF8] text-[13px] font-bold"><td className="px-5 py-3" colSpan={5}>Total for {monthName(month)}</td><td className="px-3 text-right" /><td className="px-3 text-right">{money(total, cur)}</td><td className="px-5 text-[12px] font-semibold"><span className="text-[#17804A]">Paid {money(paid, cur)}</span> · <span className="text-[#94600A]">To pay {money(total - paid, cur)}</span></td></tr></tfoot>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

export function Finance() {
  const store = useStore();
  const { state, go, setInvoice, setFixedCosts, ping, attachReport, updateReport } = store;
  const cur = state.settings.currency;
  const [cost, setCost] = useState({ label: "", amount: "", currency: cur, category: "Software", frequency: "monthly" as "monthly" | "one-time" });
  if (!isOwner(state)) return <Shell title="Finance"><Empty title="Owner access only">Client fees, margins and agency costs are visible to owners.</Empty></Shell>;

  const month = state.month;
  const clients = state.clients.filter((client) => client.stage !== "Paused");
  const invoiceOf = (client: Client) => state.invoices.find((invoice) => invoice.clientId === client.id && invoice.month === month);
  const contracted = clients.reduce((sum, client) => sum + incomeBase(state, client), 0);
  const received = clients.reduce((sum, client) => (invoiceOf(client)?.status === "Paid" ? sum + incomeBase(state, client) : sum), 0);
  const otherFreelance = otherFreelancerCostBase(state, month);
  const freelance = clients.reduce((sum, client) => sum + freelancerCostBase(state, client, month), 0) + otherFreelance;
  const perClient = clients.reduce((sum, client) => sum + clientCostsBase(state, client, month), 0);
  const agency = fixedCostsBase(state, month);
  const costsTotal = freelance + perClient + agency;
  const profit = contracted - costsTotal;
  const taxSetAside = Math.max(0, profit) * (state.settings.taxSetAside / 100);
  const openInvoices = clients.filter((client) => invoiceOf(client)?.status !== "Paid" && client.fee + client.addOnFee > 0);
  const lastMonth = shiftMonth(month, -1);
  const fixedList = [...state.fixedCosts].sort((a, b) => (a.frequency ?? "monthly").localeCompare(b.frequency ?? "monthly"));
  const activeFixed = new Set(fixedCostsIn(state, month).map((item) => item.id));

  const summary = [
    `${monthName(month)} at a glance`,
    `• ${clients.filter((c) => c.stage === "Live").length} live clients, ${clients.filter((c) => c.stage === "Onboarding").length} onboarding.`,
    `• Contracted ${money(contracted, cur)}; received ${money(received, cur)}; ${openInvoices.length} invoice${openInvoices.length === 1 ? "" : "s"} open.`,
    `• Costs ${money(costsTotal, cur)}: freelancers ${money(freelance, cur)}, client costs ${money(perClient, cur)}, agency ${money(agency, cur)}.`,
    `• Estimated profit ${money(profit, cur)}; set aside ${money(taxSetAside, cur)} for tax (${state.settings.taxSetAside}%).`,
  ].join("\n");

  const downloadStatement = (client: Client) => {
    const url = URL.createObjectURL(new Blob([statementHtml(state, client, lastMonth)], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client.name.replace(/\W+/g, "-")}-${lastMonth}-finance.html`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Where the contracted money goes: freelancers, other client costs, agency running costs, and what is left.
  const flow = [
    { label: "Freelancers", value: freelance, color: "#2F6FDB" },
    { label: "Client costs", value: perClient, color: "#E08A1E" },
    { label: "Agency costs", value: agency, color: "#8E5CD9" },
    { label: profit >= 0 ? "Left over" : "Over", value: Math.abs(profit), color: profit >= 0 ? "#1D9E5A" : "#D64545" },
  ];
  const flowTotal = Math.max(1, flow.reduce((sum, item) => sum + item.value, 0));

  return (
    <Shell title="Finance" sub={`${monthName(month)} · ${cur} · owners only`}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: "Contracted", value: contracted, note: "Fees + add-ons this month", t: "blue" as const },
            { label: "Received", value: received, note: `${openInvoices.length} invoice${openInvoices.length === 1 ? "" : "s"} still open`, t: "green" as const },
            { label: "Costs", value: costsTotal, note: `Freelancers ${money(freelance, cur)} · Clients ${money(perClient, cur)} · Agency ${money(agency, cur)}`, t: "amber" as const },
            { label: "Profit", value: profit, note: `Set aside ${money(taxSetAside, cur)} for tax`, t: "purple" as const },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl p-4" style={{ background: tone[item.t].bg }}>
              <div className="text-[12px] font-bold" style={{ color: tone[item.t].ink }}>{item.label}</div>
              <div className="mt-1 text-[26px] font-extrabold" style={{ color: tone[item.t].ink }}>{money(item.value, cur)}</div>
              <div className="text-[11px] font-semibold text-[#6B6760]">{item.note}</div>
            </div>
          ))}
        </div>

        <Card>
          <CardHead title="Where the money goes" sub={`Of the ${money(contracted, cur)} contracted in ${monthName(month)}.`} />
          <div className="flex h-5 overflow-hidden rounded-full bg-[#EEECE7]" role="img" aria-label="Freelancers, client costs, agency costs and what is left over">
            {flow.map((item) => item.value > 0 && <div key={item.label} style={{ width: `${(item.value / flowTotal) * 100}%`, background: item.color }} title={`${item.label} ${money(item.value, cur)}`} />)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
            {flow.map((item) => <span key={item.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} /><span className="text-[#6B6760]">{item.label}</span><b>{money(item.value, cur)}</b></span>)}
          </div>
        </Card>

        <Card pad={false}>
          <div className="px-5 pt-5"><CardHead title="Clients this month" sub="What each client pays, what it costs, and what is left. Open a client to change any of it." /></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead><tr className="border-y border-[#F0EEE9] bg-[#FBFAF8] text-[11px] font-bold uppercase tracking-wide text-[#8B867E]"><th className="px-5 py-2.5">Client</th><th className="px-3">Income</th><th className="px-3">Invoice</th><th className="px-3">Freelancers</th><th className="px-3">Other costs</th><th className="px-3">Margin</th><th className="px-5">Share of income</th></tr></thead>
              <tbody>
                {clients.map((client) => {
                  const invoice = invoiceOf(client);
                  const fee = client.fee + client.addOnFee;
                  const feeCur = clientCurrency(state, client);
                  const income = incomeBase(state, client);
                  const fl = freelancerCostBase(state, client, month);
                  const extra = clientCostsBase(state, client, month);
                  const margin = income - fl - extra;
                  const status = invoice?.status ?? "Not sent";
                  const share = (value: number) => (income > 0 ? Math.min(100, Math.max(0, (value / income) * 100)) : 0);
                  return (
                    <tr key={client.id} className="border-b border-[#F5F3EF] last:border-0">
                      <td className="px-5 py-3"><button onClick={() => go({ view: "client", clientId: client.id, tab: "finance" })} className="flex items-center gap-2.5 text-left font-bold hover:text-[#1F5BC4]"><ClientMark client={client} size={28} />{client.name}<ArrowRight size={13} className="text-[#B5B0A8]" /></button></td>
                      <td className="px-3 font-bold">{money(fee, feeCur)}{approx(state, fee, feeCur) && <div className="text-[11px] font-semibold text-[#8B867E]">{approx(state, fee, feeCur)}</div>}</td>
                      <td className="px-3">
                        <select aria-label={`Invoice for ${client.name}`} value={status} onChange={(event) => setInvoice(client.id, event.target.value as "Not sent" | "Sent" | "Paid")} className="rounded-lg border-0 px-2 py-1.5 text-[12px] font-bold" style={{ background: status === "Paid" ? tone.green.bg : status === "Sent" ? tone.amber.bg : tone.red.bg, color: status === "Paid" ? tone.green.ink : status === "Sent" ? tone.amber.ink : tone.red.ink }}>
                          <option>Not sent</option><option>Sent</option><option>Paid</option>
                        </select>
                      </td>
                      <td className="px-3">{fl > 0 ? <><b>{money(fl, cur)}</b><div className="text-[11px] text-[#8B867E]">{clientTeam(client).map((id) => nameOf(state, id)).join(", ")}</div></> : <span className="text-[#8B867E]">—</span>}</td>
                      <td className="px-3">{extra ? money(extra, cur) : <span className="text-[#8B867E]">—</span>}</td>
                      <td className="px-3 font-extrabold" style={{ color: margin >= 0 ? tone.green.ink : tone.red.ink }}>{money(margin, cur)}</td>
                      <td className="px-5">
                        <div className="flex h-2.5 w-40 overflow-hidden rounded-full bg-[#EEECE7]" title={`Freelancers ${money(fl, cur)} · other costs ${money(extra, cur)} · margin ${money(margin, cur)}`}>
                          <div style={{ width: `${share(fl)}%`, background: "#2F6FDB" }} /><div style={{ width: `${share(extra)}%`, background: "#E08A1E" }} /><div style={{ width: `${share(Math.max(0, margin))}%`, background: "#1D9E5A" }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {clients.length === 0 && <tr><td colSpan={7} className="px-5 py-6 text-center text-[#8B867E]">No clients yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="flex flex-wrap gap-x-4 px-5 py-3 text-[11px] text-[#8B867E]"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#2F6FDB]" />Freelancers</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#E08A1E]" />Other costs</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#1D9E5A]" />Margin</span></p>
        </Card>

        <FreelancerPayments month={month} />

        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHead title="Agency costs" sub="What it costs to run the agency: software, tools, fees. Monthly, or one time." />
            <form onSubmit={(event) => { event.preventDefault(); const amount = Number(cost.amount); if (!cost.label.trim() || !(amount > 0)) return; setFixedCosts([...state.fixedCosts, { id: `cost-${Date.now()}`, label: cost.label.trim(), amount, currency: cost.currency, category: cost.category, frequency: cost.frequency, month: cost.frequency === "one-time" ? month : undefined }]); setCost({ ...cost, label: "", amount: "" }); }} className="mb-3 space-y-2 rounded-xl bg-[#F8F7F4] p-3">
              <div className="flex flex-wrap gap-2">
                <input value={cost.label} onChange={(event) => setCost({ ...cost, label: event.target.value })} placeholder="What it is, for example Canva" aria-label="Cost" className="min-w-[160px] flex-1 rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[13px]" />
                <input type="number" min={0} value={cost.amount} onChange={(event) => setCost({ ...cost, amount: event.target.value })} placeholder="Amount" aria-label="Amount" className="w-28 rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[13px]" />
                <select value={cost.currency} onChange={(event) => setCost({ ...cost, currency: event.target.value })} aria-label="Currency" className="rounded-xl border border-[#E2DED7] bg-white px-2 py-2 text-[13px] font-bold">{currencies.map((item) => <option key={item}>{item}</option>)}</select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={cost.category} onChange={(event) => setCost({ ...cost, category: event.target.value })} aria-label="Type" className="rounded-xl border border-[#E2DED7] bg-white px-2.5 py-1.5 text-[13px] font-semibold"><option>Software</option><option>Freelancers</option><option>Operations</option><option>People</option><option>Legal</option><option>Other</option></select>
                <Segmented size="sm" value={cost.frequency} onChange={(frequency) => setCost({ ...cost, frequency })} options={[{ value: "monthly", label: "Monthly" }, { value: "one-time", label: "One time" }]} />
                <Button kind="primary" size="sm" type="submit" className="ml-auto"><Plus size={13} />Add cost</Button>
              </div>
            </form>
            <ul className="divide-y divide-[#F3F1ED]">
              {otherFreelance > 0 && (
                <li className="flex items-center gap-2 py-2.5 text-[13px]">
                  <span className="flex-1 font-semibold">Freelancers, not for a client<span className="ml-2 text-[11px] font-normal text-[#8B867E]">from their payments</span></span>
                  <b>{money(otherFreelance, cur)}</b>
                </li>
              )}
              {fixedList.map((item) => {
                const itemCur = item.currency ?? cur;
                return (
                  <li key={item.id} className={`flex items-center gap-2 py-2.5 text-[13px] ${activeFixed.has(item.id) ? "" : "text-[#9A958D]"}`}>
                    <span className="flex-1 font-semibold">{item.label}<span className="ml-2 text-[11px] font-normal text-[#8B867E]">{item.category} · {(item.frequency ?? "monthly") === "monthly" ? "monthly" : `one time, ${item.month ? monthName(item.month) : ""}`}{!activeFixed.has(item.id) && " · not this month"}</span></span>
                    <b>{money(item.amount, itemCur)}</b>
                    {itemCur !== cur && <span className="text-[11px] text-[#8B867E]">{approx(state, item.amount, itemCur)}</span>}
                    <button aria-label={`Remove ${item.label}`} onClick={() => setFixedCosts(state.fixedCosts.filter((entry) => entry.id !== item.id))} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex justify-between border-t border-[#F0EEE9] pt-3 text-[14px] font-bold"><span>Total this month</span><span>{money(agency + otherFreelance, cur)}</span></div>
          </Card>

          <Card>
            <CardHead title="Costs on clients" sub="Added on each client's Finance tab." />
            {perClient === 0 ? <p className="text-[13px] text-[#8B867E]">No client costs this month.</p> : (
              <ul className="divide-y divide-[#F3F1ED]">
                {clients.flatMap((client) => clientCostsIn(client, month).map((item) => ({ client, item }))).map(({ client, item }) => (
                  <li key={`${client.id}-${item.id}`} className="flex items-center gap-2.5 py-2.5 text-[13px]">
                    <ClientMark client={client} size={22} />
                    <span className="flex-1"><b>{item.label}</b><span className="ml-1.5 text-[12px] text-[#8B867E]">{client.name}{item.recurring ? " · monthly" : " · one time"}</span></span>
                    <b>{money(item.amount, item.currency ?? cur)}</b>
                    <button onClick={() => go({ view: "client", clientId: client.id, tab: "finance" })} aria-label={`Open ${client.name} finance`} className="text-[#B5B0A8] hover:text-[#1F5BC4]"><ArrowRight size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex justify-between border-t border-[#F0EEE9] pt-3 text-[14px] font-bold"><span>Total</span><span>{money(perClient, cur)}</span></div>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHead title={`${monthName(lastMonth)} finance statements`} sub="One per client: download the statement, attach the final version, tick it sent." />
            <ul className="space-y-2">
              {clients.filter((client) => client.startDate.slice(0, 7) <= lastMonth).map((client) => {
                const report = state.reports.find((item) => item.clientId === client.id && item.month === lastMonth);
                const sent = Boolean(report?.financeSentAt);
                return (
                  <li key={client.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-[#F8F7F4] px-3 py-2.5">
                    {sent ? <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1D9E5A] text-white"><Check size={12} strokeWidth={3} /></span> : <span className="h-5 w-5 rounded-full border-2 border-dashed border-[#CFCAC2]" />}
                    <ClientMark client={client} size={24} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{client.name}</span>
                    <button onClick={() => downloadStatement(client)} aria-label={`Download ${client.name} statement`} className="rounded-lg p-1.5 text-[#1F5BC4] hover:bg-white"><Download size={14} /></button>
                    <AttachField value={report?.financeReport} onChange={(file) => attachReport(client.id, lastMonth, "financeReport", file)} compact />
                    <button onClick={() => updateReport(client.id, lastMonth, { financeSentAt: sent ? "" : todayIso() })} className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${sent ? "bg-[#E7F6EE] text-[#17804A]" : "bg-[#1E2430] text-white"}`}>{sent ? "Sent ✓" : "Mark sent"}</button>
                  </li>
                );
              })}
              {clients.filter((client) => client.startDate.slice(0, 7) <= lastMonth).length === 0 && <li className="text-[13px] text-[#8B867E]">No client has a finished month yet.</li>}
            </ul>
          </Card>

          <Card>
            <CardHead title="Summary for María and Gareth" right={<Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(summary); ping("Summary copied"); } catch { ping("Copy was blocked"); } }}>Copy</Button>} />
            <pre className="whitespace-pre-wrap rounded-xl bg-[#F8F7F4] p-4 font-sans text-[13px] leading-relaxed">{summary}</pre>
          </Card>
        </div>

        <Card pad={false}>
          <div className="px-5 pt-5"><CardHead title="Hours by account" sub="Entered on each client's page. Shows where the time goes against the fee." /></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-[13px]">
              <thead><tr className="border-y border-[#F0EEE9] bg-[#FBFAF8] text-[11px] font-bold uppercase tracking-wide text-[#8B867E]"><th className="px-5 py-2.5">Client</th><th className="px-3">Partners</th><th className="px-3">Operations</th><th className="px-3">Freelancer</th><th className="px-3">Total</th><th className="px-5">Fee per hour</th></tr></thead>
              <tbody>
                {clients.map((client) => {
                  const h = client.hours[month] ?? { owner: 0, ops: 0, freelancer: 0 };
                  const total = h.owner + h.ops + h.freelancer;
                  return <tr key={client.id} className="border-b border-[#F5F3EF] last:border-0"><td className="px-5 py-2.5 font-bold">{client.name}</td><td className="px-3">{h.owner}</td><td className="px-3">{h.ops}</td><td className="px-3">{h.freelancer}</td><td className="px-3 font-bold">{total}</td><td className="px-5">{total ? money(incomeBase(state, client) / total, cur) : "—"}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="text-[12px] text-[#8B867E]">Estimates for running the agency. Confirm figures and tax with the accounts before closing the month. Nothing is sent or paid from here.</p>
      </div>
    </Shell>
  );
}
