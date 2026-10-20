"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { isOwner, money } from "@/lib/works/logic";
import { clientColors } from "@/lib/works/image";
import type { AssetKind, AssetType, PackageDef, SectionDef, SectionStep, StepKind } from "@/lib/works/types";
import { Shell } from "./Shell";
import { Button, Card, CardHead, Chip, Empty, Field, Segmented, asset as assetUrl, fieldClass } from "./kit";

const formats = ["Single image", "Carousel", "Text post", "Video", "Newsletter", "Blog post", "Document", "Other"];
const slug = (value: string) => `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"}-${Date.now().toString(36)}`;
const move = <T,>(list: T[], index: number, delta: number) => {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export function Settings({ tab }: { tab?: string }) {
  const { state, go } = useStore();
  if (!isOwner(state)) return <Shell title="Settings"><Empty title="Owners only">Packages, prices and defaults are changed by María or Gareth.</Empty></Shell>;
  const current = tab && ["packages", "assets", "checklists", "rules", "general"].includes(tab) ? tab : "packages";
  return (
    <Shell title="Settings" sub="What we sell, what each client gets, and how every client is set up. Changes here are the defaults for new clients. Existing clients keep what they have.">
      <div className="mb-5">
        <Segmented value={current} onChange={(value) => go({ view: "settings", tab: value })} options={[
          { value: "packages", label: "Packages", count: state.settings.packages.length },
          { value: "assets", label: "Assets", count: state.settings.assets.length },
          { value: "checklists", label: "Checklists", count: state.settings.sections.length },
          { value: "rules", label: "Rules" },
          { value: "general", label: "General" },
        ]} />
      </div>
      {current === "packages" && <Packages />}
      {current === "assets" && <Assets />}
      {current === "checklists" && <Checklists />}
      {current === "rules" && <Rules />}
      {current === "general" && <General />}
    </Shell>
  );
}

// ─── Packages ───
function Packages() {
  const { state, updateSettings } = useStore();
  const { packages, assets, currency } = state.settings;
  const set = (id: string, patch: Partial<PackageDef>) => updateSettings({ packages: packages.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  const pieces = (pkg: PackageDef) => pkg.items.filter((item) => assets.find((entry) => entry.id === item.assetId)?.kind === "piece" && item.period === "month").reduce((sum, item) => sum + item.qty, 0);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[60ch] text-[14px] text-[#55514B]">Build a package from your assets and name it. When you onboard a client you pick one, and its assets and checklists come with it. A client who wants something different gets a custom package at onboarding.</p>
        <Button kind="primary" onClick={() => updateSettings({ packages: [...packages, { id: slug("package"), name: "New package", price: 0, tagline: "", blurb: "", items: [], includes: [], channels: "LinkedIn", fullReport: false }] })}><Plus size={15} />New package</Button>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {packages.map((pkg) => (
          <Card key={pkg.id}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <input value={pkg.name} onChange={(event) => set(pkg.id, { name: event.target.value })} aria-label="Package name" className="w-full bg-transparent text-[22px] font-extrabold outline-none" />
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[#6B6760]"><b className="text-[#1E2430]">from {money(pkg.price, currency)}</b> / month · {pieces(pkg)} pieces a month {pkg.recommended && <Chip t="amber">Recommended</Chip>}</div>
              </div>
              <button onClick={() => { if (window.confirm(`Delete the ${pkg.name} package? Clients already on it keep what they have.`)) updateSettings({ packages: packages.filter((item) => item.id !== pkg.id) }); }} aria-label={`Delete ${pkg.name}`} className="rounded-xl p-2 text-[#B5B0A8] hover:bg-[#FDECEC] hover:text-[#B83232]"><Trash2 size={16} /></button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label={`Price from · ${currency} / month`}><input type="number" min={0} value={pkg.price} onChange={(event) => set(pkg.id, { price: Number(event.target.value) })} className={fieldClass} /></Field>
              <Field label="Channels"><input value={pkg.channels} onChange={(event) => set(pkg.id, { channels: event.target.value })} className={fieldClass} /></Field>
            </div>
            <div className="mt-3 grid gap-3">
              <Field label="Who it is for"><input value={pkg.tagline} onChange={(event) => set(pkg.id, { tagline: event.target.value })} className={fieldClass} /></Field>
              <Field label="In one line"><input value={pkg.blurb} onChange={(event) => set(pkg.id, { blurb: event.target.value })} className={fieldClass} /></Field>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-[#8B867E]">Assets in this package</div>
              <ul className="space-y-1.5">
                {pkg.items.map((item, index) => (
                  <li key={index} className="flex flex-wrap items-center gap-2 rounded-xl bg-[#F8F7F4] p-2">
                    <select value={item.assetId} onChange={(event) => set(pkg.id, { items: pkg.items.map((entry, i) => (i === index ? { ...entry, assetId: event.target.value } : entry)) })} aria-label="Asset" className="min-w-[150px] flex-1 rounded-lg border border-[#E2DED7] bg-white px-2.5 py-2 text-[13px] font-semibold">
                      {assets.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                    </select>
                    <input type="number" min={1} value={item.qty} onChange={(event) => set(pkg.id, { items: pkg.items.map((entry, i) => (i === index ? { ...entry, qty: Math.max(1, Number(event.target.value) || 1) } : entry)) })} aria-label="Quantity" className="w-16 rounded-lg border border-[#E2DED7] bg-white px-2.5 py-2 text-[13px]" />
                    <select value={item.period} onChange={(event) => set(pkg.id, { items: pkg.items.map((entry, i) => (i === index ? { ...entry, period: event.target.value as "month" | "quarter" } : entry)) })} aria-label="Period" className="rounded-lg border border-[#E2DED7] bg-white px-2.5 py-2 text-[13px]"><option value="month">a month</option><option value="quarter">a quarter</option></select>
                    <button onClick={() => set(pkg.id, { items: pkg.items.filter((_, i) => i !== index) })} aria-label="Remove asset from package" className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
              <Button size="sm" className="mt-2" onClick={() => assets[0] && set(pkg.id, { items: [...pkg.items, { assetId: assets.find((entry) => !pkg.items.some((item) => item.assetId === entry.id))?.id ?? assets[0].id, qty: 1, period: "month" }] })}><Plus size={13} />Add an asset</Button>
            </div>

            <div className="mt-4">
              <Field label="Also included (one per line)" hint="Calls, monitoring, reports and anything that is not an asset.">
                <textarea value={pkg.includes.join("\n")} onChange={(event) => set(pkg.id, { includes: event.target.value.split("\n") })} onBlur={() => set(pkg.id, { includes: pkg.includes.filter((line) => line.trim()) })} rows={5} className={fieldClass} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-5 text-[13px] font-semibold">
              <label className="flex items-center gap-2"><input type="checkbox" checked={pkg.fullReport} onChange={(event) => set(pkg.id, { fullReport: event.target.checked })} className="h-4 w-4" />Monthly report with recommendations</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(pkg.recommended)} onChange={(event) => set(pkg.id, { recommended: event.target.checked })} className="h-4 w-4" />Mark as recommended</label>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Assets ───
function Assets() {
  const { state, updateSettings, ping } = useStore();
  const { assets, packages, sections, currency } = state.settings;
  const set = (id: string, patch: Partial<AssetType>) => updateSettings({ assets: assets.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  const remove = (asset: AssetType) => {
    const used = packages.filter((pkg) => pkg.items.some((item) => item.assetId === asset.id));
    if (used.length) { ping(`${asset.name} is in ${used.map((pkg) => pkg.name).join(", ")}. Remove it there first.`); return; }
    if (window.confirm(`Delete ${asset.name} from the list? Clients who already have it keep it.`)) updateSettings({ assets: assets.filter((item) => item.id !== asset.id) });
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[62ch] text-[14px] text-[#55514B]">An asset is a kind of work we make and review: a post, a carousel, a video, a newsletter, a PDF. Say which checklist sections a client needs when they get it. Add a price to sell it as an add-on.</p>
        <Button kind="primary" onClick={() => updateSettings({ assets: [...assets, { id: slug("asset"), name: "New asset", kind: "extra", format: "Document", sections: [] }] })}><Plus size={15} />New asset</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((item) => (
          <Card key={item.id}>
            <div className="flex items-start gap-2">
              <input value={item.name} onChange={(event) => set(item.id, { name: event.target.value })} aria-label="Asset name" className="min-w-0 flex-1 bg-transparent text-[17px] font-extrabold outline-none" />
              <button onClick={() => remove(item)} aria-label={`Delete ${item.name}`} className="rounded-lg p-1.5 text-[#B5B0A8] hover:bg-[#FDECEC] hover:text-[#B83232]"><Trash2 size={15} /></button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Counts as"><select value={item.kind} onChange={(event) => set(item.id, { kind: event.target.value as AssetKind })} className={fieldClass}><option value="piece">A piece a month</option><option value="extra">An extra</option></select></Field>
              <Field label="Format"><select value={item.format} onChange={(event) => set(item.id, { format: event.target.value })} className={fieldClass}>{formats.map((format) => <option key={format}>{format}</option>)}</select></Field>
            </div>
            <div className="mt-3"><Field label={`Add-on price · ${currency} / month`} hint="Leave blank if not set."><input type="number" min={0} value={item.price ?? ""} onChange={(event) => set(item.id, { price: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="No price set" className={fieldClass} /></Field></div>
            <div className="mt-3">
              <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">Checklists it needs</div>
              <div className="flex flex-wrap gap-1.5">
                {sections.map((section) => {
                  const on = item.sections.includes(section.id);
                  return <button key={section.id} onClick={() => set(item.id, { sections: on ? item.sections.filter((id) => id !== section.id) : [...item.sections, section.id] })} aria-pressed={on} className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${on ? "text-white" : "bg-[#F1F0ED] text-[#6B6760]"}`} style={on ? { background: section.color } : undefined}>{section.label}</button>;
                })}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Default checklists ───
function Checklists() {
  const { state, updateSettings } = useStore();
  const { sections, assets } = state.settings;
  const [open, setOpen] = useState("");
  const set = (id: string, patch: Partial<SectionDef>) => updateSettings({ sections: sections.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  const owners = [{ id: "client", name: "Client" }, { id: "freelancer", name: "Freelancer" }, ...state.people.map((person) => ({ id: person.id, name: person.name }))];
  const setStep = (section: SectionDef, stepId: string, patch: Partial<SectionStep>) => set(section.id, { steps: section.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)) });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[64ch] text-[14px] text-[#55514B]">These are the default checklists every new client starts with. Sections marked Always go to every client; the others are added when a client gets an asset that needs them. Changing a client's own checklist never changes these.</p>
        <Button kind="primary" onClick={() => { const id = slug("section"); updateSettings({ sections: [...sections, { id, label: "New section", color: clientColors[sections.length % clientColors.length], blurb: "", always: false, steps: [] }] }); setOpen(id); }}><Plus size={15} />New section</Button>
      </div>
      <div className="space-y-3">
        {sections.map((section) => {
          const needed = assets.filter((asset) => asset.sections.includes(section.id));
          const expanded = open === section.id;
          return (
            <Card key={section.id} pad={false}>
              <button onClick={() => setOpen(expanded ? "" : section.id)} aria-expanded={expanded} className="flex w-full items-center gap-3 px-5 py-4 text-left">
                <span className="h-9 w-2 rounded-full" style={{ background: section.color }} />
                <span className="min-w-0 flex-1"><span className="block text-[16px] font-bold">{section.label}</span><span className="block truncate text-[12px] text-[#8B867E]">{section.steps.length} steps · {section.always ? "every client" : needed.length ? `needed for ${needed.map((asset) => asset.name).join(", ")}` : "not linked to an asset yet"}</span></span>
                {section.always && <Chip>Always</Chip>}
                <ChevronDown size={16} className={`text-[#8B867E] transition ${expanded ? "rotate-180" : ""}`} />
              </button>
              {expanded && (
                <div className="space-y-4 border-t border-[#F0EEE9] p-5">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Field label="Section name"><input value={section.label} onChange={(event) => set(section.id, { label: event.target.value })} className={fieldClass} /></Field>
                    <Field label="Short description"><input value={section.blurb} onChange={(event) => set(section.id, { blurb: event.target.value })} className={fieldClass} /></Field>
                    <label className="flex items-end gap-2 pb-3 text-[13px] font-semibold"><input type="checkbox" checked={section.always} onChange={(event) => set(section.id, { always: event.target.checked })} className="h-4 w-4" />Every client</label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-semibold text-[#55514B]">Colour</span>{clientColors.map((color) => <button key={color} onClick={() => set(section.id, { color })} aria-label={`Colour ${color}`} aria-pressed={section.color === color} className="h-7 w-7 rounded-full" style={{ background: color, boxShadow: section.color === color ? `0 0 0 2px #fff, 0 0 0 4px ${color}` : undefined }} />)}</div>
                  <div>
                    <div className="mb-2 grid grid-cols-[1fr_130px_110px_110px_76px] gap-2 px-1 text-[11px] font-bold uppercase tracking-wide text-[#8B867E] max-lg:hidden"><span>Step</span><span>Phase</span><span>Type</span><span>Who</span><span /></div>
                    <ul className="space-y-2">
                      {section.steps.map((step, index) => (
                        <li key={step.id} className="grid gap-2 rounded-xl bg-[#F8F7F4] p-2 lg:grid-cols-[1fr_130px_110px_110px_76px] lg:items-center">
                          <input value={step.label} onChange={(event) => setStep(section, step.id, { label: event.target.value })} aria-label="Step" className="rounded-lg border border-[#E2DED7] bg-white px-2.5 py-2 text-[13px]" />
                          <input value={step.group} onChange={(event) => setStep(section, step.id, { group: event.target.value })} aria-label="Phase" className="rounded-lg border border-[#E2DED7] bg-white px-2.5 py-2 text-[13px]" />
                          <select value={step.kind} onChange={(event) => setStep(section, step.id, { kind: event.target.value as StepKind })} aria-label="Type" className="rounded-lg border border-[#E2DED7] bg-white px-2 py-2 text-[13px]"><option value="key">Key step</option><option value="detail">Detail</option><option value="info">Info</option></select>
                          <select value={step.owner} onChange={(event) => setStep(section, step.id, { owner: event.target.value })} aria-label="Who" className="rounded-lg border border-[#E2DED7] bg-white px-2 py-2 text-[13px]">{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select>
                          <span className="flex items-center justify-end gap-0.5">
                            <button onClick={() => set(section.id, { steps: move(section.steps, index, -1) })} disabled={index === 0} aria-label="Move up" className="rounded-lg p-1.5 disabled:opacity-30"><ArrowUp size={14} /></button>
                            <button onClick={() => set(section.id, { steps: move(section.steps, index, 1) })} disabled={index === section.steps.length - 1} aria-label="Move down" className="rounded-lg p-1.5 disabled:opacity-30"><ArrowDown size={14} /></button>
                            <button onClick={() => set(section.id, { steps: section.steps.filter((entry) => entry.id !== step.id) })} aria-label="Delete step" className="rounded-lg p-1.5 text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={14} /></button>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Button size="sm" onClick={() => set(section.id, { steps: [...section.steps, { id: `${section.id}-${Date.now().toString(36)}`, label: "New step", group: section.steps[section.steps.length - 1]?.group ?? section.label, kind: "key", owner: "maria" }] })}><Plus size={13} />Add a step</Button>
                      <span className="text-[12px] text-[#8B867E]"><b>Key steps</b> decide if a client is ready for production. <b>Details</b> track the work. <b>Info</b> is nice to have.</span>
                    </div>
                  </div>
                  <div className="flex justify-end border-t border-[#F0EEE9] pt-3">
                    <button onClick={() => { if (window.confirm(`Delete the ${section.label} section from the defaults? Clients keep their own copy.`)) updateSettings({ sections: sections.filter((item) => item.id !== section.id), assets: assets.map((asset) => ({ ...asset, sections: asset.sections.filter((id) => id !== section.id) })) }); }} className="text-[13px] font-semibold text-[#B83232]">Delete this section</button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Rules ───
function Rules() {
  const { state, updateSettings } = useStore();
  const settings = state.settings;
  const setDate = (key: keyof typeof settings.dates, value: number) => updateSettings({ dates: { ...settings.dates, [key]: Math.max(1, Math.min(28, value || 1)) } });
  return (
    <div className="space-y-5">
      <Card>
        <CardHead title="How work is approved" sub="Clients do not review by default. If one asks to, switch it on for that client." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Default for new clients"><select value={settings.defaultApprovalMode} onChange={(event) => updateSettings({ defaultApprovalMode: event.target.value as typeof settings.defaultApprovalMode })} className={fieldClass}><option value="C">We approve internally</option><option value="B">Client reviews the plan, if they ask</option><option value="A">Client reviews plan and posts, if they ask</option></select></Field>
          <Field label="Who reviews copy and design"><select value={settings.reviewer} onChange={(event) => updateSettings({ reviewer: event.target.value as typeof settings.reviewer })} className={fieldClass}><option value="ops-first">The coordinator first, María samples</option><option value="maria-all">María reviews everything</option></select></Field>
          <Field label="Client has this many days to answer"><input type="number" min={1} max={14} value={settings.clientApprovalDays} onChange={(event) => updateSettings({ clientApprovalDays: Number(event.target.value) || 1 })} className={fieldClass} /></Field>
        </div>
      </Card>
      <Card>
        <CardHead title="Monthly dates" sub="Day of the month each step should be done by." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([["capture", "Capture call"], ["plan", "Plan agreed"], ["design", "Designs done"], ["approval", "Client answer"], ["schedule", "All scheduled"]] as [keyof typeof settings.dates, string][]).map(([key, label]) => (
            <Field key={key} label={label}><input type="number" min={1} max={28} value={settings.dates[key]} onChange={(event) => setDate(key, Number(event.target.value))} className={fieldClass} /></Field>
          ))}
        </div>
      </Card>
      <Card>
        <CardHead title="Money and follow-up" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Currency"><select value={settings.currency} onChange={(event) => updateSettings({ currency: event.target.value })} className={fieldClass}><option value="EUR">Euro (€)</option><option value="USD">US dollar ($)</option><option value="GBP">Pound (£)</option></select></Field>
          <Field label="Tax set-aside (%)" hint="A saving rule, not tax advice."><input type="number" min={0} max={60} value={settings.taxSetAside} onChange={(event) => updateSettings({ taxSetAside: Number(event.target.value) || 0 })} className={fieldClass} /></Field>
          <Field label="Follow up a lead after (days)"><input type="number" min={1} max={30} value={settings.followUpDays} onChange={(event) => updateSettings({ followUpDays: Number(event.target.value) || 1 })} className={fieldClass} /></Field>
          <Field label="Flag an unreviewed post after (days)"><input type="number" min={1} max={30} value={settings.escalationDays} onChange={(event) => updateSettings({ escalationDays: Number(event.target.value) || 1 })} className={fieldClass} /></Field>
        </div>
      </Card>
    </div>
  );
}

// ─── General ───
function General() {
  const { reset } = useStore();
  return (
    <Card>
      <CardHead title="This preview" sub="Everything is saved in this browser only, so each person sees their own copy until a database is connected." />
      <div className="flex flex-wrap items-center gap-3">
        <Button kind="danger" onClick={() => { if (window.confirm("Replace everything in this browser with the sample data? Your packages, assets and checklists will go back to the defaults.")) reset(); }}>Reset to sample data</Button>
        <a href={assetUrl("/classic/")} className="text-[13px] font-semibold text-[#1F5BC4]">Open the previous version</a>
      </div>
    </Card>
  );
}
