"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, ClipboardCopy, Globe, Megaphone, Minus, Plus, Shapes, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { isHired, currencies, money, monthName, shiftMonth, todayIso, toBase } from "@/lib/works/logic";
import { ChannelIcon } from "./ChannelIcon";
import { packageAssets } from "@/lib/works/seed";
import { clientColors, fileToLogo } from "@/lib/works/image";
import type { ApprovalMode, AreaKind, AssetKind, ClientAsset, NewClientDraft } from "@/lib/works/types";
import { Button, Chip, ClientMark, Field, fieldClass } from "./kit";

const steps = ["Who", "People", "Area", "Services", "Set up"];
const titles = ["Who is the client?", "Who do we talk to?", "What kind of work?", "What do they get?", "How do we run it?"];
const formats = ["Single image", "Carousel", "Text post", "Video", "Newsletter", "Blog post", "Document", "Other"];
const uid = () => `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const approvalOptions: { value: ApprovalMode; title: string; note: string }[] = [
  { value: "C", title: "We approve internally", note: "The default. The client does not review unless they ask." },
  { value: "B", title: "Client reviews the plan, if they ask", note: "We approve the posts ourselves." },
  { value: "A", title: "Client reviews the plan and posts, if they ask", note: "Each post waits for their answer, logged by us." },
];

export function NewClientWizard() {
  const { wizard } = useStore();
  if (!wizard.open) return null;
  return <Wizard key={wizard.leadId ?? "new"} />;
}

function Wizard() {
  const { state, wizard, closeWizard, createClient, go } = useStore();
  const lead = state.leads.find((item) => item.id === wizard.leadId);
  const { settings } = state;
  const startPackage = settings.packages.find((item) => item.name === lead?.package);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(lead?.company ?? "");
  const [sector, setSector] = useState(lead?.sector ?? "");
  const [color, setColor] = useState(clientColors[state.clients.length % clientColors.length]);
  const [logo, setLogo] = useState<string | undefined>();
  const [logoLater, setLogoLater] = useState(false);
  const [startDate, setStartDate] = useState(todayIso());
  const [area, setArea] = useState<AreaKind>("marketing");
  const [areaName, setAreaName] = useState("");
  const [description, setDescription] = useState("");
  const [setupPosts, setSetupPosts] = useState(2);
  const [copied, setCopied] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [contact, setContact] = useState({ name: lead?.contact ?? "", email: lead?.email ?? "", phone: "" });
  const [approver, setApprover] = useState({ name: "", email: "" });
  const [billing, setBilling] = useState("");
  const [packageId, setPackageId] = useState(startPackage?.id ?? "");
  const [assets, setAssets] = useState<ClientAsset[]>(startPackage ? packageAssets(startPackage, settings.assets, "new") : []);
  const [fee, setFee] = useState<string>(startPackage ? String(startPackage.price) : lead?.value ? String(lead.value) : "");
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(settings.defaultApprovalMode);
  const [freelancerId, setFreelancerId] = useState("");
  const [sectionOverride, setSectionOverride] = useState<Record<string, boolean>>({});
  const [custom, setCustom] = useState({ name: "", format: "Document", qty: "1", price: "" });
  const [libraryPick, setLibraryPick] = useState("");
  const [currency, setCurrency] = useState(settings.currency);
  const [platforms, setPlatforms] = useState<string[]>(["LinkedIn"]);

  const pkg = settings.packages.find((item) => item.id === packageId);
  const addOnTotal = assets.filter((asset) => asset.source !== "package").reduce((sum, asset) => sum + (asset.price ?? 0) * (asset.period === "month" ? asset.qty : 0), 0);
  const pieces = assets.filter((asset) => asset.kind === "piece" && asset.period === "month").reduce((sum, asset) => sum + asset.qty, 0);
  const appliesHere = (section: (typeof settings.sections)[number]) => !section.areas || section.areas.includes(area);
  const suggested = new Set(settings.sections.filter((section) => appliesHere(section) && (section.always || assets.some((asset) => settings.assets.find((entry) => entry.id === asset.assetId)?.sections.includes(section.id)))).map((section) => section.id));
  const picked = (id: string) => sectionOverride[id] ?? suggested.has(id);
  const assignable = state.freelancers.filter(isHired);

  function chooseArea(next: AreaKind) {
    setArea(next);
    setSectionOverride({});
    setAssets([]);
    setPackageId("");
    if (next !== "marketing") setApprovalMode("C");
  }
  function choosePackage(id: string) {
    setPackageId(id);
    const next = settings.packages.find((item) => item.id === id);
    setAssets(next ? packageAssets(next, settings.assets, "new") : []);
    setFee(next ? String(next.price) : fee);
    setSectionOverride({});
  }
  const changeQty = (id: string, delta: number) => setAssets((list) => list.map((asset) => (asset.id === id ? { ...asset, qty: Math.max(1, asset.qty + delta) } : asset)));
  const addFromLibrary = (assetId: string) => {
    const entry = settings.assets.find((item) => item.id === assetId);
    if (!entry) return;
    setAssets((list) => [...list, { id: uid(), assetId: entry.id, name: entry.name, format: entry.format, kind: packageId ? "extra" : "piece", qty: 1, period: "month", price: entry.price, source: packageId ? "add-on" : "custom" }]);
    setLibraryPick("");
  };
  const addCustom = () => {
    if (!custom.name.trim()) return;
    const kind: AssetKind = "extra";
    setAssets((list) => [...list, { id: uid(), name: custom.name.trim(), format: custom.format, kind, qty: Math.max(1, Number(custom.qty) || 1), period: "month", price: custom.price ? Number(custom.price) : undefined, source: "custom" }]);
    setCustom({ name: "", format: "Document", qty: "1", price: "" });
  };

  async function chooseLogo(file?: File) {
    if (!file) return;
    try { setLogo(await fileToLogo(file)); setLogoError(""); } catch { setLogoError("Could not read that image. Try a PNG or JPG."); }
  }

  const finish = () => {
    const draft: NewClientDraft = {
      area, areaName: area === "custom" ? areaName.trim() || "Custom" : undefined, description: description.trim() || undefined, startDate: startDate || todayIso(), setupPosts: area === "marketing" ? setupPosts : 0,
      name: name.trim(), color, logo, sector: sector.trim(), mainContact: contact, approver, billingContact: billing.trim(),
      packageId: area === "marketing" && pkg ? pkg.id : "custom", assets, sectionIds: settings.sections.filter((section) => appliesHere(section) && picked(section.id)).map((section) => section.id),
      approvalMode, freelancerId: freelancerId || undefined, fee: Number(fee) || 0, currency, platforms: area === "marketing" ? platforms : undefined, addOnFee: addOnTotal, leadId: lead?.id,
    };
    const id = createClient(draft);
    closeWizard();
    go({ view: "client", clientId: id, tab: "checklists" });
  };

  const canNext = step === 0 ? name.trim().length > 0 : step === 2 ? area !== "custom" || areaName.trim().length > 0 : true;
  const firstMonth = startDate.slice(0, 7);
  const monthMessage = `Month 1 (${monthName(firstMonth)}) is mostly set-up and strategy: we learn your business, agree the plan and prepare your brand templates${setupPosts > 0 ? `, and publish ${setupPosts} post${setupPosts === 1 ? "" : "s"}` : ""}. Full monthly content starts in ${monthName(shiftMonth(firstMonth, 1))}.`;
  const copyMessage = async () => { try { await navigator.clipboard.writeText(monthMessage); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* the text is visible to copy by hand */ } };
  const last = steps.length - 1;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-[#1E2430]/50 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="New client">
      <div className="flex max-h-[96vh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start gap-3 border-b border-[#F0EEE9] px-6 pb-4 pt-5">
          <div className="flex-1">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-[#8B867E]">{lead ? `Won: ${lead.company}` : "New client"}</div>
            <h2 className="mt-0.5 text-[22px] font-extrabold">{titles[step]}</h2>
          </div>
          <button onClick={closeWizard} aria-label="Close" className="rounded-xl p-2 text-[#8B867E] hover:bg-[#F1F0ED]"><X size={18} /></button>
        </div>
        <ol className="flex gap-1.5 px-6 pt-4">
          {steps.map((label, index) => (
            <li key={label} className="flex-1"><span className="block h-1.5 rounded-full" style={{ background: index <= step ? "#2F6FDB" : "#E7E4DE" }} /><span className={`mt-1 block text-[11px] font-semibold ${index === step ? "text-[#1F5BC4]" : "text-[#9A958D]"}`}>{label}</span></li>
          ))}
        </ol>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-2xl bg-[#F8F7F4] p-4">
                <ClientMark client={{ name: name || "?", color, logo }} size={64} />
                <div className="min-w-0 flex-1"><div className="truncate text-[18px] font-bold">{name || "Client name"}</div><div className="truncate text-[13px] text-[#8B867E]">{sector || "Sector"}</div></div>
              </div>
              <Field label="Client name"><input autoFocus value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} placeholder="Company name" /></Field>
              <Field label="Sector"><input value={sector} onChange={(event) => setSector(event.target.value)} className={fieldClass} placeholder="Construction, engineering, fire safety…" /></Field>
              <div>
                <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">Colour</div>
                <div className="flex flex-wrap items-center gap-2">
                  {clientColors.map((value) => <button key={value} onClick={() => setColor(value)} aria-label={`Colour ${value}`} aria-pressed={color === value} className="grid h-9 w-9 place-items-center rounded-full text-white ring-offset-2 transition" style={{ background: value, boxShadow: color === value ? `0 0 0 2px #fff, 0 0 0 4px ${value}` : undefined }}>{color === value && <Check size={16} strokeWidth={3} />}</button>)}
                  <label className="ml-1 flex items-center gap-2 text-[12px] font-semibold text-[#55514B]">Other<input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Pick any colour" className="h-9 w-9 cursor-pointer rounded-lg border border-[#E2DED7] bg-white p-0.5" /></label>
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[12px] font-semibold text-[#55514B]">
                  <span>Logo</span>
                  <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={logoLater} onChange={(event) => { setLogoLater(event.target.checked); if (event.target.checked) setLogo(undefined); }} className="h-4 w-4" />Add the logo later</label>
                </div>
                {!logoLater && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="cursor-pointer rounded-xl border border-dashed border-[#C9C3B8] px-4 py-2.5 text-[13px] font-semibold hover:border-[#2F6FDB] hover:text-[#1F5BC4]">{logo ? "Change logo" : "Upload logo"}<input type="file" accept="image/*" className="sr-only" onChange={(event) => { chooseLogo(event.target.files?.[0]); event.target.value = ""; }} /></label>
                    {logo && <button onClick={() => setLogo(undefined)} className="text-[13px] font-semibold text-[#B83232]">Remove</button>}
                  </div>
                )}
                {logoLater && <p className="text-[12px] text-[#8B867E]">No problem. The first letter is used until you add it from the client page.</p>}
                {logoError && <p className="mt-1 text-[12px] font-semibold text-[#B83232]">{logoError}</p>}
              </div>
              <Field label="Start date" hint="The first month runs from here. It is mostly set-up, so we promise fewer posts in it."><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={fieldClass} /></Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="rounded-xl bg-[#EAF1FD] px-4 py-3 text-[13px] text-[#1F5BC4]">Leave anything blank and add it later. What is missing stays on the client's checklist.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Main contact"><input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} className={fieldClass} /></Field>
                <Field label="Email"><input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} className={fieldClass} /></Field>
                <Field label="Phone / WhatsApp"><input value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} className={fieldClass} /></Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="The one person who can approve for them" hint="Only needed if they ask to review."><input value={approver.name} onChange={(event) => setApprover({ ...approver, name: event.target.value })} className={fieldClass} /></Field>
                <Field label="Billing contact"><input value={billing} onChange={(event) => setBilling(event.target.value)} className={fieldClass} /></Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-[13px] text-[#6B6760]">This decides which checklists and screens the client gets.</p>
              {([
                { value: "marketing" as const, title: "Marketing", note: "Posts, newsletters and monthly reports. Pick Essential, Growth or a custom mix.", icon: Megaphone },
                { value: "web" as const, title: "Web design", note: "A website project with a price, deliverables and a launch checklist.", icon: Globe },
                { value: "custom" as const, title: "Something else", note: "Branding, photography, anything. You name it and set the price.", icon: Shapes },
              ]).map((option) => (
                <button key={option.value} onClick={() => chooseArea(option.value)} aria-pressed={area === option.value} className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${area === option.value ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E9E6E0] hover:border-[#C9C3B8]"}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#1E2430] text-white"><option.icon size={21} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-[16px] font-extrabold">{option.title}</span><span className="text-[13px] text-[#6B6760]">{option.note}</span></span>
                  {area === option.value && <Check size={18} className="text-[#2F6FDB]" />}
                </button>
              ))}
              {area === "custom" && <Field label="What is it called?"><input autoFocus value={areaName} onChange={(event) => setAreaName(event.target.value)} className={fieldClass} placeholder="e.g. Branding, Photography" /></Field>}
            </div>
          )}

          {step === 3 && area !== "marketing" && (
            <div className="space-y-5">
              <Field label="What are we delivering?"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className={fieldClass} placeholder={area === "web" ? "e.g. 6-page website with contact form and a blog" : "A short description of the work"} /></Field>
              <div>
                <h3 className="mb-2 text-[15px] font-bold">Deliverables</h3>
                {assets.length === 0 ? <p className="rounded-xl border border-dashed border-[#D6D1C8] p-4 text-[13px] text-[#8B867E]">Nothing yet. Add what the client gets, for example “Website design”, “Logo set”.</p> : (
                  <ul className="divide-y divide-[#F3F1ED] rounded-xl border border-[#EEEBE5]">
                    {assets.map((asset) => (
                      <li key={asset.id} className="flex items-center gap-3 px-3.5 py-2.5">
                        <span className="min-w-0 flex-1 text-[14px] font-semibold">{asset.name}</span>
                        {asset.price !== undefined && <span className="text-[13px] font-semibold">{money(asset.price, settings.currency)}</span>}
                        <button onClick={() => setAssets((list) => list.filter((entry) => entry.id !== asset.id))} aria-label={`Remove ${asset.name}`} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={15} /></button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-[#F8F7F4] p-3">
                  <input value={custom.name} onChange={(event) => setCustom({ ...custom, name: event.target.value })} placeholder="Add a deliverable" aria-label="Deliverable name" className="min-w-[160px] flex-1 rounded-xl border border-[#E2DED7] bg-white px-3 py-2.5 text-[14px]" />
                  <input value={custom.price} onChange={(event) => setCustom({ ...custom, price: event.target.value })} placeholder="Price (optional)" aria-label="Deliverable price" className="w-32 rounded-xl border border-[#E2DED7] bg-white px-3 py-2.5 text-[14px]" />
                  <Button onClick={addCustom} disabled={!custom.name.trim()}><Plus size={14} />Add</Button>
                </div>
              </div>
              <Field label={`Price · ${currency}`} hint="For a project, enter the total. For ongoing work, enter the monthly fee, and say which in the description."><div className="flex gap-2"><input type="number" min={0} value={fee} onChange={(event) => setFee(event.target.value)} className={fieldClass} /><select aria-label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-1 rounded-xl border border-[#E2DED7] bg-white px-3 text-[14px] font-bold">{currencies.map((item) => <option key={item}>{item}</option>)}</select></div></Field>
            </div>
          )}

          {step === 3 && area === "marketing" && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {settings.packages.map((item) => (
                  <button key={item.id} onClick={() => choosePackage(item.id)} aria-pressed={packageId === item.id} className={`relative rounded-2xl border-2 p-4 text-left transition ${packageId === item.id ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E9E6E0] hover:border-[#C9C3B8]"}`}>
                    {item.recommended && <span className="absolute right-3 top-3 rounded-full bg-[#B7864B] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Popular</span>}
                    <div className="text-[16px] font-extrabold">{item.name}</div>
                    <div className="mt-0.5 text-[13px] font-semibold text-[#2F6FDB]">from {money(item.price, settings.currency)} / month</div>
                    <div className="mt-2 text-[12px] text-[#6B6760]">{item.items.filter((entry) => entry.period === "month").reduce((sum, entry) => sum + entry.qty, 0)} pieces a month</div>
                  </button>
                ))}
                <button onClick={() => { setPackageId(""); setAssets([]); setSectionOverride({}); }} aria-pressed={!packageId} className={`rounded-2xl border-2 border-dashed p-4 text-left transition ${!packageId ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#D6D1C8] hover:border-[#C9C3B8]"}`}>
                  <div className="text-[16px] font-extrabold">Custom</div>
                  <div className="mt-0.5 text-[13px] font-semibold text-[#6B6760]">Pick exactly what they need</div>
                  <div className="mt-2 text-[12px] text-[#6B6760]">For example 4 text posts and a newsletter.</div>
                </button>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between"><h3 className="text-[15px] font-bold">What they get</h3><span className="text-[13px] font-semibold text-[#55514B]">{pieces} piece{pieces === 1 ? "" : "s"} a month</span></div>
                {assets.length === 0 ? <p className="rounded-xl border border-dashed border-[#D6D1C8] p-4 text-[13px] text-[#8B867E]">Nothing yet. Add assets below.</p> : (
                  <ul className="divide-y divide-[#F3F1ED] rounded-xl border border-[#EEEBE5]">
                    {assets.map((asset) => (
                      <li key={asset.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                        <span className="min-w-[160px] flex-1"><span className="block text-[14px] font-semibold">{asset.name}</span><span className="text-[12px] text-[#8B867E]">{asset.format} · per {asset.period}{asset.source === "add-on" ? " · add-on" : asset.source === "custom" ? " · just for this client" : ""}</span></span>
                        <span className="flex items-center gap-1.5">
                          <button onClick={() => changeQty(asset.id, -1)} aria-label={`Fewer ${asset.name}`} className="grid h-7 w-7 place-items-center rounded-lg bg-[#F1F0ED]"><Minus size={13} /></button>
                          <b className="w-6 text-center text-[14px]">{asset.qty}</b>
                          <button onClick={() => changeQty(asset.id, 1)} aria-label={`More ${asset.name}`} className="grid h-7 w-7 place-items-center rounded-lg bg-[#F1F0ED]"><Plus size={13} /></button>
                        </span>
                        {asset.source !== "package" && asset.price !== undefined && <span className="w-16 text-right text-[13px] font-semibold">{money(asset.price, settings.currency)}</span>}
                        <button onClick={() => setAssets((list) => list.filter((entry) => entry.id !== asset.id))} aria-label={`Remove ${asset.name}`} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={15} /></button>
                      </li>
                    ))}
                  </ul>
                )}
                {pkg && pkg.includes.length > 0 && <p className="mt-2 text-[12px] text-[#6B6760]">Also included: {pkg.includes.join(" · ")}.</p>}
              </div>

              <div className="grid gap-3 rounded-2xl bg-[#F8F7F4] p-4 sm:grid-cols-2">
                <Field label="Add an asset from your list">
                  <select value={libraryPick} onChange={(event) => addFromLibrary(event.target.value)} className={fieldClass}>
                    <option value="">Choose…</option>
                    {settings.assets.filter((asset) => !assets.some((entry) => entry.assetId === asset.id)).map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                  </select>
                </Field>
                <div>
                  <div className="text-[12px] font-semibold text-[#55514B]">Or something just for this client</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <input value={custom.name} onChange={(event) => setCustom({ ...custom, name: event.target.value })} placeholder="e.g. Website creation" aria-label="Custom asset name" className="min-w-[140px] flex-1 rounded-xl border border-[#E2DED7] bg-white px-3 py-2.5 text-[14px]" />
                    <input value={custom.price} onChange={(event) => setCustom({ ...custom, price: event.target.value })} placeholder="Price" aria-label="Custom asset price" className="w-20 rounded-xl border border-[#E2DED7] bg-white px-3 py-2.5 text-[14px]" />
                    <Button onClick={addCustom} disabled={!custom.name.trim()}><Plus size={14} />Add</Button>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">Channels they are posted on</div>
                <div className="flex flex-wrap gap-2">
                  {["LinkedIn", "Instagram", "Facebook", "TikTok", "X", "YouTube"].map((name) => {
                    const on = platforms.includes(name);
                    return <button key={name} type="button" onClick={() => setPlatforms(on ? platforms.filter((item) => item !== name) : [...platforms, name])} aria-pressed={on} className={`inline-flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-[13px] font-bold ${on ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E9E6E0] hover:border-[#C9C3B8]"}`}><ChannelIcon name={name} size={18} />{name}</button>;
                  })}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`Monthly fee · ${currency}`} hint={`Starts from the package price. Edit it if you agreed something different.${currency !== settings.currency && Number(fee) ? ` About ${money(toBase(state, Number(fee), currency), settings.currency)} at the rate in Settings.` : ""}`}><div className="flex gap-2"><input type="number" min={0} value={fee} onChange={(event) => setFee(event.target.value)} className={fieldClass} /><select aria-label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-1 rounded-xl border border-[#E2DED7] bg-white px-3 text-[14px] font-bold">{currencies.map((item) => <option key={item}>{item}</option>)}</select></div></Field>
                <div className="rounded-xl bg-[#F8F7F4] p-3 text-[13px]"><div className="font-semibold">Add-ons with a price</div><div className="mt-0.5 text-[20px] font-extrabold">{money(addOnTotal, settings.currency)}</div><div className="text-[12px] text-[#8B867E]">per month, on top of the fee</div></div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              {area === "marketing" && <div>
                <h3 className="mb-2 text-[15px] font-bold">Who approves our work?</h3>
                <div className="space-y-2">
                  {approvalOptions.map((option) => (
                    <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 ${approvalMode === option.value ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E9E6E0]"}`}>
                      <input type="radio" name="approval" checked={approvalMode === option.value} onChange={() => setApprovalMode(option.value)} className="mt-1 h-4 w-4" />
                      <span><span className="block text-[14px] font-bold">{option.title}</span><span className="text-[13px] text-[#6B6760]">{option.note}</span></span>
                    </label>
                  ))}
                </div>
              </div>}
              <Field label="Freelancer (optional)" hint="You can add more freelancers later, from the client page.">
                <select value={freelancerId} onChange={(event) => setFreelancerId(event.target.value)} className={fieldClass}>
                  <option value="">Assign later</option>
                  {assignable.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.speciality}</option>)}
                </select>
              </Field>
              {area === "marketing" && (
                <div className="rounded-2xl bg-[#F1ECFC] p-4">
                  <h3 className="text-[15px] font-bold text-[#4A2F9A]">The first month is set-up</h3>
                  <p className="mt-1 text-[13px] text-[#4A2F9A]">Starting {monthName(firstMonth)}. We spend it on strategy and templates, so we promise fewer posts than the package says.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-[13px] font-semibold">Posts in month 1</span>
                    <span className="flex items-center gap-1.5">
                      <button onClick={() => setSetupPosts(Math.max(0, setupPosts - 1))} aria-label="Fewer first-month posts" className="grid h-7 w-7 place-items-center rounded-lg bg-white"><Minus size={13} /></button>
                      <b className="w-6 text-center text-[15px]">{setupPosts}</b>
                      <button onClick={() => setSetupPosts(setupPosts + 1)} aria-label="More first-month posts" className="grid h-7 w-7 place-items-center rounded-lg bg-white"><Plus size={13} /></button>
                    </span>
                    <span className="text-[12px] text-[#6B5BA8]">then {pieces} a month from {monthName(shiftMonth(firstMonth, 1))}</span>
                  </div>
                  <p className="mt-3 rounded-xl bg-white/70 p-3 text-[13px] leading-relaxed text-[#1E2430]">{monthMessage}</p>
                  <Button className="mt-2" onClick={copyMessage}><ClipboardCopy size={14} />{copied ? "Copied" : "Copy to tell the client"}</Button>
                </div>
              )}
              <div>
                <h3 className="text-[15px] font-bold">Checklists to set up</h3>
                <p className="mb-2 text-[13px] text-[#6B6760]">Chosen from what they get. Untick any that do not apply. You can change this later on the client page.</p>
                <ul className="space-y-1.5">
                  {settings.sections.filter(appliesHere).map((section) => (
                    <li key={section.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EEEBE5] px-3.5 py-2.5">
                        <input type="checkbox" checked={picked(section.id)} onChange={(event) => setSectionOverride((old) => ({ ...old, [section.id]: event.target.checked }))} className="h-4 w-4" />
                        <span className="h-3 w-3 rounded-full" style={{ background: section.color }} />
                        <span className="flex-1"><span className="block text-[14px] font-semibold">{section.label}</span><span className="text-[12px] text-[#8B867E]">{section.steps.filter((step) => !step.areas || step.areas.includes(area)).length} steps · {section.blurb}</span></span>
                        {section.always && <Chip>Always</Chip>}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-[#F0EEE9] bg-[#FBFAF8] px-6 py-4">
          {step > 0 ? <Button kind="ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={15} />Back</Button> : <Button kind="ghost" onClick={closeWizard}>Cancel</Button>}
          <span className="ml-auto text-[12px] text-[#8B867E]">Step {step + 1} of {steps.length}</span>
          {step === 1 && <Button kind="ghost" onClick={() => setStep(step + 1)}>Skip for now</Button>}
          {step < last ? (
            <Button kind="primary" onClick={() => setStep(step + 1)} disabled={!canNext}>Continue <ArrowRight size={15} /></Button>
          ) : (
            <Button kind="good" onClick={finish} disabled={!name.trim()}><Check size={15} />Create client</Button>
          )}
        </div>
      </div>
    </div>
  );
}

