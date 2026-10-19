"use client";

import { useState } from "react";
import { ArrowRight, CircleDollarSign, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { isOwner, money, monthName, nameOf } from "@/lib/works/logic";
import { Button, Card, CardHead, Chip, Empty, Field, fieldClass, tone } from "./kit";
import { Shell } from "./Shell";

export function Finance() {
  const { state, go, setInvoice, payFreelancer, setFixedCosts, ping } = useStore();
  const [adding, setAdding] = useState(false);
  const [cost, setCost] = useState({ label: "", amount: "", category: "Software" });
  if (!isOwner(state)) return <Shell title="Finance"><Empty title="Owner access only">Client fees, margins and agency costs are visible to owners.</Empty></Shell>;

  const clients = state.clients.filter(client => client.stage !== "Paused");
  const currency = state.settings.currency;
  const contracted = clients.reduce((sum, client) => sum + client.fee + client.addOnFee, 0);
  const received = clients.reduce((sum, client) => state.invoices.find(invoice => invoice.clientId === client.id && invoice.month === state.month)?.status === "Paid" ? sum + client.fee + client.addOnFee : sum, 0);
  const freelance = clients.reduce((sum, client) => sum + (client.freelancerId ? client.freelancerFee : 0), 0);
  const fixed = state.fixedCosts.reduce((sum, item) => sum + item.amount, 0);
  const margin = contracted - freelance - fixed;
  const unpaid = clients.filter(client => client.freelancerId && !state.payouts.some(payout => payout.clientId === client.id && payout.month === state.month));
  const invoices = clients.filter(client => state.invoices.find(invoice => invoice.clientId === client.id && invoice.month === state.month)?.status !== "Paid");
  const taxSetAside = Math.max(0, margin) * (state.settings.taxSetAside / 100);
  const lastMonthPosts = state.posts.filter(post => post.date.startsWith(state.month));
  const published = lastMonthPosts.filter(post => post.status === "Published" || post.status === "Scheduled").length;
  const agreed = clients.filter(client => client.stage === "Live").reduce((sum, client) => sum + client.agreedPosts, 0);
  const summary = [
    `${monthName(state.month)} at a glance`,
    `• ${clients.filter(client => client.stage === "Live").length} live clients, ${clients.filter(client => client.stage === "Onboarding").length} onboarding.`,
    `• Contracted ${money(contracted, currency)}; received ${money(received, currency)}; ${invoices.length} invoice${invoices.length === 1 ? "" : "s"} open.`,
    `• Costs ${money(freelance + fixed, currency)} (freelancers ${money(freelance, currency)}, agency ${money(fixed, currency)}).`,
    `• Estimated profit ${money(margin, currency)}; set aside ${money(taxSetAside, currency)} for tax (${state.settings.taxSetAside}%); ${money(margin - taxSetAside, currency)} after set-aside.`,
    `• Content: ${published} of ${agreed} agreed posts scheduled or live.`,
  ].join(String.fromCharCode(10));

  function addCost() {
    const label = cost.label.trim(); const amount = Number(cost.amount);
    if (!label || !Number.isFinite(amount) || amount <= 0) return;
    setFixedCosts([...state.fixedCosts, { id: `cost-${Date.now()}`, label, amount, category: cost.category }]);
    setCost({ label: "", amount: "", category: "Software" }); setAdding(false);
  }

  return <Shell title="Finance" sub={`Agency view · ${monthName(state.month)} · ${currency}`}>
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Contracted this month", value: contracted, note: "Client fees + add-ons", color: "#EAF1FD", ink: "#1F5BC4" },
          { label: "Received", value: received, note: `${invoices.length} invoice${invoices.length === 1 ? "" : "s"} still open`, color: "#E7F6EE", ink: "#17804A" },
          { label: "Costs planned", value: freelance + fixed, note: "Freelancers + agency costs", color: "#FFF3D9", ink: "#94600A" },
          { label: "Estimated profit", value: margin, note: `Set aside ${money(taxSetAside, currency)} for tax (${state.settings.taxSetAside}%)`, color: "#F1ECFC", ink: "#6343C4" },
        ].map(item => <Card key={item.label} className="!border-0" ><div className="-m-5 rounded-2xl p-5" style={{ background: item.color }}><div className="text-[12px] font-bold" style={{ color: item.ink }}>{item.label}</div><div className="mt-2 text-[29px] font-extrabold" style={{ color: item.ink }}>{money(item.value, currency)}</div><div className="mt-1 text-[11px] text-[#6B6760]">{item.note}</div></div></Card>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card pad={false}>
          <div className="px-5 pt-5"><CardHead title="Client income & freelancer payouts" sub="Record the invoice first. Freelancer payout becomes available after client payment." /></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[13px]"><thead><tr className="border-y border-[#F0EEE9] bg-[#FBFAF8] text-[11px] font-bold uppercase tracking-wide text-[#8B867E]"><th className="px-5 py-3">Client</th><th className="px-3">Client fee</th><th className="px-3">Invoice</th><th className="px-3">Freelancer cost</th><th className="px-3">Payout</th><th className="px-5 py-3">Margin</th></tr></thead><tbody>{clients.map(client => {
            const invoice = state.invoices.find(item => item.clientId === client.id && item.month === state.month);
            const paid = state.payouts.some(item => item.clientId === client.id && item.month === state.month);
            const fee = client.fee + client.addOnFee;
            return <tr key={client.id} className="border-b border-[#F0EEE9] last:border-0"><td className="px-5 py-3"><button onClick={() => go({ view: "client", clientId: client.id, tab: "finance" })} className="text-left font-bold hover:text-[#1F5BC4]">{client.name} <ArrowRight size={12} className="inline"/></button><div className="text-[11px] text-[#8B867E]">{client.package}{client.addOnFee > 0 ? " + add-on" : ""}</div></td><td className="px-3 font-bold">{money(fee, currency)}</td><td className="px-3"><select aria-label={`Invoice for ${client.name}`} value={invoice?.status ?? "Not sent"} onChange={event => setInvoice(client.id, event.target.value as "Not sent" | "Sent" | "Paid")} className="rounded-lg border border-[#E2DED7] bg-white px-2 py-1.5 text-[12px] font-semibold"><option>Not sent</option><option>Sent</option><option>Paid</option></select></td><td className="px-3">{client.freelancerId ? <><span className="font-semibold">{money(client.freelancerFee, currency)}</span><div className="text-[11px] text-[#8B867E]">{nameOf(state, client.freelancerId)}</div></> : <span className="text-[#8B867E]">Not assigned</span>}</td><td className="px-3">{!client.freelancerId ? <Chip>No payout</Chip> : paid ? <Chip t="green" dot>Paid</Chip> : invoice?.status === "Paid" ? <Button size="sm" kind="good" onClick={() => payFreelancer(client.id)}>Mark paid</Button> : <Chip t="amber">After client pays</Chip>}</td><td className="px-5 py-3 font-bold">{money(fee - (client.freelancerId ? client.freelancerFee : 0), currency)}</td></tr>;
          })}</tbody></table></div>
        </Card>
        <div className="min-w-0 space-y-5"><Card><CardHead title="Executive summary" sub="For María and Gareth. Copy it into your monthly catch-up." right={<Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(summary); ping("Summary copied"); } catch { ping("Copy was blocked"); } }}>Copy</Button>}/><pre className="whitespace-pre-wrap rounded-xl bg-[#F8F7F4] p-3.5 font-sans text-[13px] leading-relaxed text-[#1E2430]">{summary}</pre></Card><Card><div className="flex items-center gap-2"><CircleDollarSign size={18} className="text-[#1F5BC4]"/><h3 className="text-[16px] font-bold">What needs attention</h3></div><div className="mt-4 space-y-2"><div className="flex justify-between rounded-xl bg-[#FFF3D9] p-3 text-[13px]"><span>Open invoices</span><strong>{invoices.length}</strong></div><div className="flex justify-between rounded-xl bg-[#EAF1FD] p-3 text-[13px]"><span>Freelancer payouts open</span><strong>{unpaid.length}</strong></div></div><p className="mt-3 text-[11px] leading-relaxed text-[#8B867E]">Statuses are manual records for reconciliation. No invoice is sent and no bank payment is made from this preview.</p></Card>
          <Card><CardHead title="Agency costs" sub="Monthly software, fees and operating expenses." right={<Button size="sm" onClick={() => setAdding(!adding)}><Plus size={13}/>Add</Button>}/>
            {adding && <div className="mb-3 grid gap-2 rounded-xl bg-[#F8F7F4] p-3"><Field label="Cost"><input value={cost.label} onChange={event => setCost({ ...cost, label: event.target.value })} placeholder="e.g. Canva" className={fieldClass}/></Field><div className="grid grid-cols-2 gap-2"><Field label={`Amount · ${currency}`}><input type="number" min={0} value={cost.amount} onChange={event => setCost({ ...cost, amount: event.target.value })} className={fieldClass}/></Field><Field label="Category"><select value={cost.category} onChange={event => setCost({ ...cost, category: event.target.value })} className={fieldClass}><option>Software</option><option>Operations</option><option>Legal</option><option>Other</option></select></Field></div><Button kind="primary" onClick={addCost}>Save cost</Button></div>}
            <ul className="divide-y divide-[#F0EEE9]">{state.fixedCosts.map(item => <li key={item.id} className="flex items-center gap-2 py-2.5 text-[13px]"><span className="min-w-0 flex-1"><span className="font-semibold">{item.label}</span><span className="ml-2 text-[11px] text-[#8B867E]">{item.category}</span></span><strong>{money(item.amount, currency)}</strong><button aria-label={`Remove ${item.label}`} onClick={() => setFixedCosts(state.fixedCosts.filter(cost => cost.id !== item.id))} className="rounded-lg p-1.5 text-[#B83232] hover:bg-[#FDECEC]"><Trash2 size={14}/></button></li>)}</ul>{state.fixedCosts.length === 0 && <p className="text-[12px] text-[#8B867E]">No agency costs recorded.</p>}<div className="mt-3 border-t border-[#F0EEE9] pt-3 text-right text-[14px] font-bold">Total {money(fixed, currency)}</div>
          </Card></div>
      </div>
      <Card pad={false}><div className="px-5 pt-5"><CardHead title="Hours by account" sub="Light tracking, entered on each client's Overview. Shows where the time goes against the fee."/></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-[13px]"><thead><tr className="border-y border-[#F0EEE9] bg-[#FBFAF8] text-[11px] font-bold uppercase tracking-wide text-[#8B867E]"><th className="px-5 py-2.5">Client</th><th className="px-3">Partners</th><th className="px-3">Operations</th><th className="px-3">Freelancer</th><th className="px-3">Total</th><th className="px-5">Fee per hour</th></tr></thead><tbody>{clients.map(client => { const h = client.hours[state.month] ?? { owner: 0, ops: 0, freelancer: 0 }; const total = h.owner + h.ops + h.freelancer; return <tr key={client.id} className="border-b border-[#F0EEE9] last:border-0"><td className="px-5 py-2.5 font-bold">{client.name}</td><td className="px-3">{h.owner}</td><td className="px-3">{h.ops}</td><td className="px-3">{h.freelancer}</td><td className="px-3 font-bold">{total}</td><td className="px-5">{total ? money((client.fee + client.addOnFee) / total, currency) : "—"}</td></tr>; })}</tbody></table></div></Card>
      <div className="rounded-xl bg-[#FFF3D9] p-4 text-[12px] font-semibold" style={{ color: tone.amber.ink }}>Estimated figures only. Confirm fees, costs, tax and actual transactions with the agency accounts before closing the month.</div>
    </div>
  </Shell>;
}
