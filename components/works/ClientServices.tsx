"use client";

import { useState } from "react";
import { Check, ClipboardCopy, ExternalLink, Minus, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { assetUsage, money, monthName, packageOf, shortDate } from "@/lib/works/logic";
import { packageAssets } from "@/lib/works/seed";
import { clientColors, fileToLogo } from "@/lib/works/image";
import type { Client, ClientAsset } from "@/lib/works/types";
import { canBeAssigned, nameOf } from "@/lib/works/logic";
import { PostArt } from "./PostArt";
import { Bar, Button, Card, CardHead, Chip, ClientMark, Empty, Field, fieldClass, tone } from "./kit";

const formats = ["Single image", "Carousel", "Text post", "Video", "Newsletter", "Blog post", "Document", "Other"];

// ─── What the client gets ───
export function ServicesCard({ client }: { client: Client }) {
  const { state, updateClient, setClientAssets, addClientAsset, updateClientAsset } = useStore();
  const [assigning, setAssigning] = useState("");
  const people = state.freelancers.filter((person) => person.status !== "Offboarded" && canBeAssigned(person));
  const { settings } = state;
  const [editing, setEditing] = useState(false);
  const [pick, setPick] = useState("");
  const [custom, setCustom] = useState({ name: "", format: "Document", qty: "1", price: "" });
  const usage = assetUsage(client, state.posts, state.month);
  const pkg = packageOf(state, client);
  const pieces = client.agreedPosts;
  const change = (id: string, patch: Partial<ClientAsset>) => setClientAssets(client.id, client.assets.map((asset) => (asset.id === id ? { ...asset, ...patch } : asset)));

  const switchPackage = (value: string) => {
    const next = settings.packages.find((item) => item.id === value);
    if (!window.confirm(next ? `Switch ${client.name} to ${next.name}? Its assets are replaced. Add-ons and custom assets stay.` : `Make ${client.name}'s package custom? Its assets stay as they are.`)) return;
    updateClient(client.id, { packageId: next?.id, package: next?.name ?? "Custom" });
    if (next) setClientAssets(client.id, [...packageAssets(next, settings.assets, `${client.id}-${Date.now().toString(36)}`), ...client.assets.filter((asset) => asset.source !== "package")]);
  };

  return (
    <Card>
      <CardHead
        title="What they get"
        sub={`${client.package} · ${pieces} piece${pieces === 1 ? "" : "s"} a month · ${monthName(state.month).split(" ")[0]} so far`}
        right={<Button size="sm" kind={editing ? "primary" : "secondary"} onClick={() => setEditing(!editing)}>{editing ? <><Check size={13} />Done</> : <><Pencil size={13} />Edit</>}</Button>}
      />
      {editing && (
        <div className="mb-4 grid gap-3 rounded-xl bg-[#F8F7F4] p-3 sm:grid-cols-2">
          <Field label="Package">
            <select value={client.packageId ?? "custom"} onChange={(event) => switchPackage(event.target.value === "custom" ? "" : event.target.value)} className={fieldClass}>
              {settings.packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              <option value="custom">Custom</option>
            </select>
          </Field>
          <p className="self-end pb-2 text-[12px] text-[#8B867E]">These changes are for {client.name} only. The package in Settings stays as it is.</p>
        </div>
      )}
      {client.assets.length === 0 ? <Empty title="Nothing added yet">Use Edit to add assets.</Empty> : (
        <ul className="divide-y divide-[#F3F1ED] rounded-xl border border-[#EEEBE5]">
          {usage.map(({ asset, used }) => {
            const monthly = asset.period === "month";
            return (
              <li key={asset.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                <span className="min-w-[150px] flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">{asset.name}{asset.source === "add-on" && <Chip t="purple" className="!py-0 !text-[10px]">add-on</Chip>}{asset.source === "custom" && <Chip className="!py-0 !text-[10px]">just this client</Chip>}</span>
                  <span className="text-[12px] text-[#8B867E]">{asset.format} · {asset.qty} a {asset.period}{asset.price !== undefined ? ` · ${money(asset.price, settings.currency)}` : ""}</span>
                </span>
                {asset.kind === "extra" && asset.source !== "package" && !editing && (
                  <span className="flex w-full flex-wrap items-center gap-2 text-[12px]">
                    {asset.assignedTo ? (
                      <>
                        <Chip t={asset.active === false ? "grey" : "blue"}>{asset.active === false ? "Paused" : "Assigned"} to {nameOf(state, asset.assignedTo)}</Chip>
                        {asset.due && <span className="text-[#6B6760]">Due {shortDate(asset.due)}</span>}
                        <span className="text-[#6B6760]">{state.posts.filter((post) => post.assetId === asset.id && ["Ready to schedule", "Scheduled", "Published"].includes(post.status)).length} of {asset.qty} made</span>
                      </>
                    ) : <span className="text-[#8B867E]">Not assigned yet. The freelancer cannot see it.</span>}
                    <button onClick={() => setAssigning(assigning === asset.id ? "" : asset.id)} className="ml-auto font-semibold text-[#1F5BC4]">{assigning === asset.id ? "Close" : asset.assignedTo ? "Change" : "Assign to a freelancer"}</button>
                  </span>
                )}
                {assigning === asset.id && asset.kind === "extra" && asset.source !== "package" && (
                  <span className="grid w-full gap-2 rounded-xl bg-[#F8F7F4] p-3 sm:grid-cols-2">
                    <Field label="Freelancer">
                      <select value={asset.assignedTo ?? ""} onChange={(event) => updateClientAsset(client.id, asset.id, { assignedTo: event.target.value || undefined, active: true })} className={fieldClass}>
                        <option value="">Nobody yet</option>
                        {people.map((person) => <option key={person.id} value={person.id}>{person.name}{person.id === client.freelancerId ? " (on this account)" : ""}</option>)}
                      </select>
                    </Field>
                    <Field label="Due"><input type="date" value={asset.due ?? ""} onChange={(event) => updateClientAsset(client.id, asset.id, { due: event.target.value || undefined })} className={fieldClass} /></Field>
                    <label className="sm:col-span-2"><span className="text-[12px] font-semibold text-[#55514B]">What they need to know</span><textarea value={asset.brief ?? ""} onChange={(event) => updateClientAsset(client.id, asset.id, { brief: event.target.value })} rows={2} placeholder="Size, pages, template, who it is for…" className={`${fieldClass} mt-1`} /></label>
                    <label className="flex items-center gap-2 text-[13px] font-semibold sm:col-span-2"><input type="checkbox" checked={asset.active !== false} onChange={(event) => updateClientAsset(client.id, asset.id, { active: event.target.checked })} className="h-4 w-4" />Active: show it to the freelancer</label>
                  </span>
                )}
                {!editing && monthly && !(asset.kind === "extra" && asset.source !== "package") && (
                  <span className="flex w-32 items-center gap-2"><Bar value={(used / asset.qty) * 100} color={used >= asset.qty ? tone.green.dot : "#2F6FDB"} /><b className="w-9 text-right text-[12px]">{used}/{asset.qty}</b></span>
                )}
                {editing && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <button onClick={() => change(asset.id, { qty: Math.max(1, asset.qty - 1) })} aria-label={`Fewer ${asset.name}`} className="grid h-7 w-7 place-items-center rounded-lg bg-[#F1F0ED]"><Minus size={13} /></button>
                      <b className="w-6 text-center text-[14px]">{asset.qty}</b>
                      <button onClick={() => change(asset.id, { qty: asset.qty + 1 })} aria-label={`More ${asset.name}`} className="grid h-7 w-7 place-items-center rounded-lg bg-[#F1F0ED]"><Plus size={13} /></button>
                    </span>
                    <select value={asset.period} onChange={(event) => change(asset.id, { period: event.target.value as ClientAsset["period"] })} aria-label="Period" className="rounded-lg border border-[#E2DED7] bg-white px-2 py-1.5 text-[12px]"><option value="month">a month</option><option value="quarter">a quarter</option></select>
                    <button onClick={() => setClientAssets(client.id, client.assets.filter((entry) => entry.id !== asset.id))} aria-label={`Remove ${asset.name}`} className="text-[#B5B0A8] hover:text-[#B83232]"><Trash2 size={15} /></button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {pkg && pkg.includes.length > 0 && <p className="mt-3 text-[12px] leading-relaxed text-[#6B6760]"><b>Also included:</b> {pkg.includes.join(" · ")}.</p>}

      {editing && (
        <div className="mt-4 grid gap-3 rounded-xl bg-[#F8F7F4] p-3 lg:grid-cols-2">
          <Field label="Add an asset from your list" hint="Its checklists are added too.">
            <select value={pick} onChange={(event) => {
              const entry = settings.assets.find((item) => item.id === event.target.value);
              if (entry) addClientAsset(client.id, { id: `${client.id}-${Date.now().toString(36)}`, assetId: entry.id, name: entry.name, format: entry.format, kind: entry.kind, qty: 1, period: "month", price: entry.price, source: "add-on" });
              setPick("");
            }} className={fieldClass}>
              <option value="">Choose…</option>
              {settings.assets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <div>
            <div className="text-[12px] font-semibold text-[#55514B]">Or something just for this client</div>
            <div className="mt-1 flex flex-wrap gap-2">
              <input value={custom.name} onChange={(event) => setCustom({ ...custom, name: event.target.value })} placeholder="e.g. Website creation" aria-label="Custom asset" className="min-w-[130px] flex-1 rounded-xl border border-[#E2DED7] bg-white px-3 py-2.5 text-[14px]" />
              <select value={custom.format} onChange={(event) => setCustom({ ...custom, format: event.target.value })} aria-label="Format" className="rounded-xl border border-[#E2DED7] bg-white px-2.5 py-2.5 text-[13px]">{formats.map((format) => <option key={format}>{format}</option>)}</select>
              <input value={custom.price} onChange={(event) => setCustom({ ...custom, price: event.target.value })} placeholder="Price" aria-label="Price" className="w-20 rounded-xl border border-[#E2DED7] bg-white px-3 py-2.5 text-[14px]" />
              <Button disabled={!custom.name.trim()} onClick={() => { addClientAsset(client.id, { id: `${client.id}-${Date.now().toString(36)}`, name: custom.name.trim(), format: custom.format, kind: "extra", qty: Math.max(1, Number(custom.qty) || 1), period: "month", price: custom.price ? Number(custom.price) : undefined, source: "custom" }); setCustom({ name: "", format: "Document", qty: "1", price: "" }); }}><Plus size={14} />Add</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Name, colour and logo ───
export function ProfileEditor({ client, onClose }: { client: Client; onClose: () => void }) {
  const { updateClient } = useStore();
  const [error, setError] = useState("");
  return (
    <Card className="mb-5 border-[#2F6FDB]/30">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[16px] font-bold">Edit profile</h3>
        <Button size="sm" kind="primary" onClick={onClose}><Check size={13} />Done</Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <Field label="Client name"><input value={client.name} onChange={(event) => updateClient(client.id, { name: event.target.value })} className={fieldClass} /></Field>
          <Field label="Sector"><input value={client.sector} onChange={(event) => updateClient(client.id, { sector: event.target.value })} className={fieldClass} /></Field>
        </div>
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">Colour</div>
            <div className="flex flex-wrap items-center gap-2">
              {clientColors.map((color) => <button key={color} onClick={() => updateClient(client.id, { color })} aria-label={`Colour ${color}`} aria-pressed={client.color === color} className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: color, boxShadow: client.color === color ? `0 0 0 2px #fff, 0 0 0 4px ${color}` : undefined }}>{client.color === color && <Check size={16} strokeWidth={3} />}</button>)}
              <label className="ml-1 flex items-center gap-2 text-[12px] font-semibold text-[#55514B]">Other<input type="color" value={client.color} onChange={(event) => updateClient(client.id, { color: event.target.value })} aria-label="Pick any colour" className="h-9 w-9 cursor-pointer rounded-lg border border-[#E2DED7] bg-white p-0.5" /></label>
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-[#55514B]">Logo</div>
            <div className="flex flex-wrap items-center gap-3">
              <ClientMark client={client} size={48} />
              <label className="cursor-pointer rounded-xl border border-dashed border-[#C9C3B8] px-4 py-2.5 text-[13px] font-semibold hover:border-[#2F6FDB] hover:text-[#1F5BC4]">{client.logo ? "Change logo" : "Upload logo"}<input type="file" accept="image/*" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; try { updateClient(client.id, { logo: await fileToLogo(file) }); setError(""); } catch { setError("Could not read that image. Try a PNG or JPG."); } }} /></label>
              {client.logo && <button onClick={() => updateClient(client.id, { logo: undefined })} className="text-[13px] font-semibold text-[#B83232]">Remove</button>}
            </div>
            {error && <p className="mt-1 text-[12px] font-semibold text-[#B83232]">{error}</p>}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── The client view: a link and a code, and the posts we choose to show ───
export function ClientShare({ client }: { client: Client }) {
  const { state, updateShare, ping } = useStore();
  const [dragging, setDragging] = useState("");
  const [over, setOver] = useState<"shown" | "hidden" | "">("");
  const share = client.share;
  const link = typeof window === "undefined" ? "" : `${window.location.origin}${window.location.pathname}#/view/${share.token}`;
  const posts = state.posts.filter((post) => post.clientId === client.id).sort((a, b) => a.date.localeCompare(b.date));
  const shown = posts.filter((post) => share.postIds.includes(post.id));
  const hidden = posts.filter((post) => !share.postIds.includes(post.id));
  const setShown = (id: string, on: boolean) => updateShare(client.id, { postIds: on ? [...share.postIds, id] : share.postIds.filter((value) => value !== id) });
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); ping(`${what} copied`); } catch { ping("Copy was blocked by the browser"); } };

  const column = (title: string, list: typeof posts, on: boolean) => (
    <div
      onDragOver={(event) => { event.preventDefault(); setOver(on ? "shown" : "hidden"); }}
      onDragLeave={() => setOver("")}
      onDrop={() => { if (dragging) setShown(dragging, on); setDragging(""); setOver(""); }}
      className={`min-h-[180px] rounded-2xl border-2 border-dashed p-3 transition ${over === (on ? "shown" : "hidden") ? "border-[#2F6FDB] bg-[#F4F8FF]" : "border-[#E2DED7] bg-[#FBFAF8]"}`}
    >
      <div className="mb-2 flex items-center justify-between px-1"><h4 className="text-[14px] font-bold">{title}</h4><Chip t={on ? "green" : "grey"}>{list.length}</Chip></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((post) => (
          <div key={post.id} draggable onDragStart={() => setDragging(post.id)} onDragEnd={() => setDragging("")} className="flex cursor-grab items-center gap-2.5 rounded-xl border border-[#E9E6E0] bg-white p-1.5 active:cursor-grabbing">
            <span className="w-11 shrink-0"><PostArt post={post} client={client} rounded="rounded-md" /></span>
            <span className="min-w-0 flex-1"><span className="line-clamp-2 text-[12px] font-semibold leading-snug">{post.title}</span><span className="text-[11px] text-[#8B867E]">{shortDate(post.date)} · {post.status}</span></span>
            <button onClick={() => setShown(post.id, !on)} aria-label={on ? `Hide ${post.title}` : `Show ${post.title}`} className="rounded-lg p-1.5 text-[#8B867E] hover:bg-[#F1F0ED]">{on ? <X size={14} /> : <Plus size={14} />}</button>
          </div>
        ))}
        {list.length === 0 && <p className="col-span-full p-4 text-center text-[12px] text-[#A8A39B]">{on ? "Drag posts here to show them" : "Everything is shown"}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardHead title="Share with the client" sub="A read-only calendar of the posts you choose, behind a code. They do not need a login. They only approve things if they ask to review." right={
          <label className="flex cursor-pointer items-center gap-2 text-[14px] font-semibold"><input type="checkbox" checked={share.enabled} onChange={(event) => updateShare(client.id, { enabled: event.target.checked })} className="h-4 w-4" />Link is on</label>
        } />
        <div className={`grid gap-3 lg:grid-cols-[1fr_auto] ${share.enabled ? "" : "opacity-50"}`}>
          <Field label="Link">
            <div className="flex gap-2">
              <input readOnly value={link} aria-label="Share link" className={`${fieldClass} font-mono text-[12px]`} />
              <Button className="mt-1" onClick={() => copy(link, "Link")} disabled={!share.enabled}><ClipboardCopy size={14} />Copy</Button>
              <a href={share.enabled ? link : undefined} target="_blank" rel="noreferrer" aria-disabled={!share.enabled} className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-[#E2DED7] bg-white px-4 text-[13px] font-semibold hover:border-[#C9C3B8]">Preview <ExternalLink size={13} /></a>
            </div>
          </Field>
          <Field label="Code">
            <div className="flex gap-2">
              <input readOnly value={share.code} aria-label="Access code" className={`${fieldClass} w-28 text-center font-mono text-[16px] font-bold tracking-widest`} />
              <Button className="mt-1" onClick={() => copy(share.code, "Code")} disabled={!share.enabled}><ClipboardCopy size={14} /></Button>
              <Button className="mt-1" onClick={() => updateShare(client.id, { code: String(100000 + Math.floor(Math.random() * 900000)) })} aria-label="New code"><RefreshCw size={14} /></Button>
            </div>
          </Field>
        </div>
        <p className="mt-3 rounded-xl bg-[#FFF3D9] px-3.5 py-2.5 text-[12px] text-[#6B4A06]">Preview: the link only works in this browser until the database is connected. Then the same link works for the client anywhere. Sending the code separately from the link keeps it private.</p>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {column("Shown to the client", shown, true)}
        {column("Not shown", hidden, false)}
      </div>
    </div>
  );
}
