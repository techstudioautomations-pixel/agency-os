"use client";

import { useState } from "react";
import { ArrowRight, Check, Download, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { approx, clientCurrency, clientPayStatus, clientTeam, freelancerCostBase, otherFreelancerCostBase, incomeBase, isOwner, money, monthName, nameOf, shiftMonth, todayIso, toBase } from "@/lib/works/logic";
import { PayButton } from "./Pay";
import { PaymentsPanel } from "./FreelancerProfile";
import type { Client, State } from "@/lib/works/types";
import { Shell } from "./Shell";
import { AttachField, Button, Card, CardHead, Chip, ClientMark, Empty, Field, fieldClass, tone } from "./kit";

const clientCosts = (client: Client, month: string) => client.costs.filter((item) => (item.recurring ? item.month <= month : item.month === month));

function statementHtml(state: State, client: Client, month: string) {
  const cur = state.settings.currency;
  const invoice = state.invoices.find((item) => item.clientId === client.id && item.month === month);
  const costs = clientCosts(client, month);
  const income = incomeBase(state, client);
  const freelance = freelancerCostBase(state, client);
  const feeCur = clientCurrency(state, client);
  const extra = costs.reduce((sum, item) => sum + item.amount, 0);
  const row = (label: string, value: string, bold = false) => `<tr><td>${label}</td><td style="text-align:right;${bold ? "font-weight:700" : ""}">${value}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${client.name} · ${monthName(month)} finance</title><style>body{font:15px/1.5 Arial,sans-serif;color:#1e2430;max-width:640px;margin:40px auto;padding:0 24px}h1{font-size:26px;margin:4px 0 20px}small{color:#6b7280;letter-spacing:.12em;font-weight:700}table{width:100%;border-collapse:collapse}td{padding:10px 4px;border-bottom:1px solid #eee}.total td{border-top:2px solid #1e2430;font-size:18px}footer{margin-top:30px;color:#9ca3af;font-size:12px}</style></head><body><small>FINANCE STATEMENT · INTERNAL</small><h1>${client.name} · ${monthName(month)}</h1><table>${row(`Monthly fee (${client.package})`, `${money(client.fee, feeCur)}${approx(state, client.fee, feeCur) ? ` (${approx(state, client.fee, feeCur)})` : ""}`)}${client.addOnFee ? row("Add-ons", money(client.addOnFee, feeCur)) : ""}${row("Invoice", invoice?.status ?? "Not sent")}${row(`Freelancer (${nameOf(state, client.freelancerId)})`, `− ${money(freelance, cur)}`)}${costs.map((item) => row(item.label, `− ${money(item.amount, cur)}`)).join("")}<tr class="total"><td><b>Margin</b></td><td style="text-align:right"><b>${money(income - freelance - extra, cur)}</b></td></tr></table><footer>Prepared by The Works · ${todayIso()}</footer></body></html>`;
}

export function Finance() {
  const store = useStore();
  const { state, go, setInvoice, setFixedCosts, ping, attachReport, updateReport } = store;
  const [adding, setAdding] = useState(false);
  const [cost, setCost] = useState({ label: "", amount: "", category: "Software" });
  if (!isOwner(state)) return <Shell title="Finance"><Empty title="Owner access only">Client fees, margins and agency costs are visible to owners.</Empty></Shell>;

  const month = state.month;
  const cur = state.settings.currency;
  const clients = state.clients.filter((client) => client.stage !== "Paused");
  const invoiceOf = (client: Client) => state.invoices.find((invoice) => invoice.clientId === client.id && invoice.month === month);
  const contracted = clients.reduce((sum, client) => sum + incomeBase(state, client), 0);
  const received = clients.reduce((sum, client) => (invoiceOf(client)?.status === "Paid" ? sum + incomeBase(state, client) : sum), 0);
  const otherFreelance = otherFreelancerCostBase(state, month);
  const freelance = clients.reduce((sum, client) => sum + freelancerCostBase(state, client), 0) + otherFreelance;
  const perClient = clients.reduce((sum, client) => sum + clientCosts(client, month).reduce((total, item) => total + item.amount, 0), 0);
  const fixed = state.fixedCosts.reduce((sum, item) => sum + item.amount, 0);
  const costsTotal = freelance + perClient + fixed;
  const profit = contracted - costsTotal;
  const taxSetAside = Math.max(0, profit) * (state.settings.taxSetAside / 100);
  const openInvoices = clients.filter((client) => invoiceOf(client)?.status !== "Paid" && client.fee + client.addOnFee > 0);
  const lastMonth = shiftMonth(month, -1);

  const summary = [
    `${monthName(month)} at a glance`,
    `• ${clients.filter((c) => c.stage === "Live").length} live clients, ${clients.filter((c) => c.stage === "Onboarding").length} onboarding.`,
    `• Contracted ${money(contracted, cur)}; received ${money(received, cur)}; ${openInvoices.length} invoice${openInvoices.length === 1 ? "" : "s"} open.`,
    `• Costs ${money(costsTotal, cur)}: freelancers ${money(freelance, cur)}, client costs ${money(perClient, cur)}, agency ${money(fixed, cur)}.`,
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

  return (
    <Shell title="Finance" sub={`${monthName(month)} · ${cur} · owners only`}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: "Contracted", value: contracted, note: "Fees + add-ons this month", t: "blue" as const },
            { label: "Received", value: received, note: `${openInvoices.length} invoice${openInvoices.length === 1 ? "" : "s"} still open`, t: "green" as const },
            { label: "Costs", value: costsTotal, note: "Freelancers, client costs, agency", t: "amber" as const },
            { label: "Profit", value: profit, note: `Set aside ${money(taxSetAside, cur)} for tax`, t: "purple" as const },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl p-4" style={{ background: tone[item.t].bg }}>
              <div className="text-[12px] font-bold" style={{ color: tone[item.t].ink }}>{item.label}</div>
              <div className="mt-1 text-[26px] font-extrabold" style={{ color: tone[item.t].ink }}>{money(item.value, cur)}</div>
              <div className="text-[11px] font-semibold text-[#6B6760]">{item.note}</div>
            </div>
          ))}
        </div>

        <Card pad={false}>
          <div className="px-5 pt-5"><CardHead title="Clients this month" sub="Invoice first. The freelancer is paid once the client has paid." /></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead><tr className="border-y border-[#F0EEE9] bg-[#FBFAF8] text-[11px] font-bold uppercase tracking-wide text-[#8B867E]"><th className="px-5 py-2.5">Client</th><th className="px-3">Fee</th><th className="px-3">Invoice</th><th className="px-3">Freelancer</th><th className="px-3">Payout</th><th className="px-3">Other costs</th><th className="px-5">Margin</th></tr></thead>
              <tbody>
                {clients.map((client) => {
                  const invoice = invoiceOf(client);
                  const payout = state.payouts.find((item) => item.clientId === client.id && item.month === month);
                  const ps = clientPayStatus(state, client, month);
                  const paid = ps.has ? ps.due.length > 0 && ps.open.length === 0 : Boolean(payout);
                  const paidTotal = ps.has ? ps.due.reduce((sum, item) => sum + toBase(state, item.paid?.amount ?? 0, item.paid?.currency ?? cur), 0) : 0;
                  const fee = client.fee + client.addOnFee;
                  const feeCur = clientCurrency(state, client);
                  const extra = clientCosts(client, month).reduce((sum, item) => sum + item.amount, 0);
                  const margin = incomeBase(state, client) - freelancerCostBase(state, client) - extra;
                  const status = invoice?.status ?? "Not sent";
                  return (
                    <tr key={client.id} className="border-b border-[#F5F3EF] last:border-0">
                      <td className="px-5 py-3"><button onClick={() => go({ view: "client", clientId: client.id, tab: "finance" })} className="flex items-center gap-2.5 text-left font-bold hover:text-[#1F5BC4]"><ClientMark client={client} size={28} />{client.name}</button></td>
                      <td className="px-3 font-bold">{money(fee, feeCur)}{approx(state, fee, feeCur) && <div className="text-[11px] font-semibold text-[#8B867E]">{approx(state, fee, feeCur)}</div>}</td>
                      <td className="px-3">
                        <select aria-label={`Invoice for ${client.name}`} value={status} onChange={(event) => setInvoice(client.id, event.target.value as "Not sent" | "Sent" | "Paid")} className="rounded-lg border-0 px-2 py-1.5 text-[12px] font-bold" style={{ background: status === "Paid" ? tone.green.bg : status === "Sent" ? tone.amber.bg : tone.red.bg, color: status === "Paid" ? tone.green.ink : status === "Sent" ? tone.amber.ink : tone.red.ink }}>
                          <option>Not sent</option><option>Sent</option><option>Paid</option>
                        </select>
                      </td>
                      <td className="px-3">{client.freelancerId || ps.has ? <><b>{money(freelancerCostBase(state, client, month), cur)}</b><div className="text-[11px] text-[#8B867E]">{clientTeam(client).map((id) => nameOf(state, id)).join(", ") || "Payments set up"}</div></> : <span className="text-[#8B867E]">—</span>}</td>
                      <td className="px-3">{!client.freelancerId && !ps.has ? <span className="text-[#8B867E]">—</span> : ps.has && ps.due.length === 0 ? <span className="text-[#8B867E]">Nothing due</span> : paid ? <Chip t="green" dot>Paid{ps.has ? ` ${money(paidTotal, cur)}` : payout?.amount ? ` ${money(payout.amount, payout.currency ?? cur)}` : ""}</Chip> : status === "Paid" ? <PayButton client={client} label="Pay" month={month} /> : <Chip t="amber">After client pays</Chip>}</td>
                      <td className="px-3">{extra ? money(extra, cur) : <span className="text-[#8B867E]">—</span>}</td>
                      <td className="px-5 font-extrabold" style={{ color: margin >= 0 ? tone.green.ink : tone.red.ink }}>{money(margin, cur)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

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
            </ul>
          </Card>

          <Card>
            <CardHead title="Summary for María and Gareth" right={<Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(summary); ping("Summary copied"); } catch { ping("Copy was blocked"); } }}>Copy</Button>} />
            <pre className="whitespace-pre-wrap rounded-xl bg-[#F8F7F4] p-4 font-sans text-[13px] leading-relaxed">{summary}</pre>
          </Card>
        </div>

        <PaymentsPanel month={month} />

        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHead title="Agency costs" sub="Software, fees and running costs every month." right={<Button size="sm" onClick={() => setAdding(!adding)}><Plus size={13} />Add</Button>} />
            {adding && (
              <form onSubmit={(event) => { event.preventDefault(); const amount = Number(cost.amount); if (!cost.label.trim() || !(amount > 0)) return; setFixedCosts([...state.fixedCosts, { id: `cost-${Date.now()}`, label: cost.label.trim(), amount, category: cost.category }]); setCost({ label: "", amount: "", category: "Software" }); setAdding(false); }} className="mb-3 grid gap-2 rounded-xl bg-[#F8F7F4] p-3 sm:grid-cols-[1fr_110px_130px_auto] sm:items-end">
                <Field label="Cost"><input value={cost.label} onChange={(event) => setCost({ ...cost, label: event.target.value })} placeholder="e.g. Canva" className={fieldClass} /></Field>
                <Field label={cur}><input type="number" min={0} value={cost.amount} onChange={(event) => setCost({ ...cost, amount: event.target.value })} className={fieldClass} /></Field>
                <Field label="Type"><select value={cost.category} onChange={(event) => setCost({ ...cost, category: event.target.value })} className={fieldClass}><option>Software</option><option>People</option><option>Operations</option><option>Legal</option><option>Other</option></select></Field>
                <Button kind="primary" type="submit">Save</Button>
              </form>
            )}
            <ul className="divide-y divide-[#F3F1ED]">
              {otherFreelance > 0 && (
                <li className="flex items-center gap-2 py-2.5 text-[13px]">
                  <span className="flex-1 font-semibold">Freelancers, not for a client<span className="ml-2 text-[11px] font-normal text-[#8B867E]">Freelancers · from their payments</span></span>
                  <b>{money(otherFreelance, cur)}</b>
                </li>
              )}
              {state.fixedCosts.map((item) => (
                <li key={item.id} className="flex items-center gap-2 py-2.5 text-[13px]">
                  <span className="flex-1 font-semibold">{item.label}<span className="ml-2 text-[11px] font-normal text-[#8B867E]">{item.category}</span></span>
                  <b>{money(item.amount, cur)}</b>
                  <button aria-label={`Remove ${item.label}`} onClick={() => setFixedCosts(state.fixedCosts.filter((entry) => entry.id !== item.id))} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-[#F0EEE9] pt-3 text-[14px] font-bold"><span>Total</span><span>{money(fixed + otherFreelance, cur)}</span></div>
          </Card>

          <Card>
            <CardHead title="Costs on clients" sub="Added on each client's Finance tab." />
            {perClient === 0 ? <p className="text-[13px] text-[#8B867E]">No client costs this month.</p> : (
              <ul className="divide-y divide-[#F3F1ED]">
                {clients.flatMap((client) => clientCosts(client, month).map((item) => ({ client, item }))).map(({ client, item }) => (
                  <li key={`${client.id}-${item.id}`} className="flex items-center gap-2.5 py-2.5 text-[13px]">
                    <ClientMark client={client} size={22} />
                    <span className="flex-1"><b>{item.label}</b><span className="ml-1.5 text-[12px] text-[#8B867E]">{client.name}{item.recurring ? " · monthly" : ""}</span></span>
                    <b>{money(item.amount, cur)}</b>
                    <button onClick={() => go({ view: "client", clientId: client.id, tab: "finance" })} aria-label={`Open ${client.name} finance`} className="text-[#B5B0A8] hover:text-[#1F5BC4]"><ArrowRight size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex justify-between border-t border-[#F0EEE9] pt-3 text-[14px] font-bold"><span>Total</span><span>{money(perClient, cur)}</span></div>
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
                  return <tr key={client.id} className="border-b border-[#F5F3EF] last:border-0"><td className="px-5 py-2.5 font-bold">{client.name}</td><td className="px-3">{h.owner}</td><td className="px-3">{h.ops}</td><td className="px-3">{h.freelancer}</td><td className="px-3 font-bold">{total}</td><td className="px-5">{total ? money((client.fee + client.addOnFee) / total, cur) : "—"}</td></tr>;
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
