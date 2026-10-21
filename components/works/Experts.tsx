"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Pause, Play, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { fileToPhoto } from "@/lib/works/image";
import { isOwner, todayIso } from "@/lib/works/logic";
import type { Expert } from "@/lib/works/types";
import { Shell } from "./Shell";
import { AvailabilityDot, HoursEditor } from "./Availability";
import { Avatar, Button, Card, CardHead, Chip, Empty, Field, fieldClass } from "./kit";

/** The experts: engineers and others who check technical content when it is sent to them. */
export function Experts() {
  const { state, go } = useStore();
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-[240px] flex-1 text-[13px] text-[#6B6760]">People who check technical posts, such as engineers. When a reviewer sends a post to an expert, only that post shows in their view. They answer, and it comes back to the reviewer.</p>
        <Button kind="primary" onClick={() => setAdding(true)}><UserPlus size={15} />Add an expert</Button>
      </div>
      {state.experts.length === 0 ? <Empty title="No experts yet">Add the first one, then send a post to them from the post page.</Empty> : (
        <ul className="space-y-2.5">
          {state.experts.map((expert) => {
            const waiting = state.posts.filter((post) => post.expert?.id === expert.id && post.expert.status === "with").length;
            const done = state.posts.filter((post) => post.expert?.id === expert.id && post.expert.status === "back").length;
            return (
              <li key={expert.id}>
                <button onClick={() => go({ view: "freelancers", freelancerId: expert.id })} className="flex w-full flex-wrap items-center gap-4 rounded-2xl border border-[#E9E6E0] bg-white p-4 text-left hover:border-[#D2CCC2]">
                  <Avatar name={expert.name} color={expert.color} photo={expert.photo} size={42} />
                  <span className="min-w-[200px] flex-1"><span className="flex items-center gap-2 text-[15px] font-bold">{expert.name}<AvailabilityDot person={expert} size={9} /></span><span className="block text-[12px] text-[#6B6760]">{[expert.speciality, expert.company].filter(Boolean).join(" · ") || "No field yet"}</span></span>
                  <span className="text-[12px] text-[#55514B]">{waiting ? <b className="text-[#6B3FD1]">{waiting} waiting</b> : "Nothing waiting"} · {done} checked</span>
                  <Chip t={expert.status === "Active" ? "green" : "amber"}>{expert.status}</Chip>
                  <ArrowRight size={15} className="text-[#B5B0A8]" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {adding && <AddExpert onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddExpert({ onClose }: { onClose: () => void }) {
  const { addExpert, go } = useStore();
  const [draft, setDraft] = useState({ name: "", email: "", speciality: "", company: "", phone: "" });
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!draft.name.trim()) return; const id = addExpert({ ...draft, name: draft.name.trim() }); onClose(); go({ view: "freelancers", freelancerId: id }); };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <form onSubmit={submit} role="dialog" aria-label="Add an expert" className="relative w-full max-w-[460px] space-y-3 rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3"><div className="flex-1"><h2 className="text-[18px] font-extrabold">Add an expert</h2><p className="text-[13px] text-[#6B6760]">Someone who checks technical content for us.</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[#6B6760] hover:bg-[#F1F0ED]"><X size={18} /></button></div>
        <Field label="Name"><input autoFocus required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={fieldClass} /></Field>
        <Field label="Their field"><input value={draft.speciality} onChange={(event) => setDraft({ ...draft, speciality: event.target.value })} placeholder="Fire safety engineer, structural engineer…" className={fieldClass} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company"><input value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} className={fieldClass} /></Field>
          <Field label="Phone"><input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className={fieldClass} /></Field>
        </div>
        <Field label="Email" hint="This is the email they will sign in with."><input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={fieldClass} /></Field>
        <div className="flex justify-end gap-2 pt-1"><Button type="button" onClick={onClose}>Cancel</Button><Button kind="primary" type="submit"><Plus size={14} />Add</Button></div>
      </form>
    </div>
  );
}

export function ExpertProfile({ expert }: { expert: Expert }) {
  const store = useStore();
  const { state, go } = store;
  const owner = isOwner(state);
  const photo = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Expert>) => store.updateExpert(expert.id, patch);
  const posts = state.posts.filter((post) => post.expert?.id === expert.id);
  return (
    <Shell title={expert.name} sub={expert.speciality || "Expert"} actions={<Button kind="ghost" onClick={() => go({ view: "freelancers" })}><ArrowLeft size={15} />All freelancers</Button>}>
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl p-5" style={{ background: `linear-gradient(120deg, ${expert.color}22, #ffffff)` }}>
        <div className="flex flex-col items-center gap-1.5">
          <Avatar name={expert.name} color={expert.color} photo={expert.photo} size={72} />
          <input ref={photo} type="file" accept="image/*" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; try { set({ photo: await fileToPhoto(file) }); } catch { store.ping("Could not read that picture."); } }} />
          <button onClick={() => photo.current?.click()} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1F5BC4] hover:underline"><Camera size={12} />{expert.photo ? "Change" : "Add photo"}</button>
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2"><Chip t={expert.status === "Active" ? "green" : "amber"}>{expert.status}</Chip><Chip t="purple">Expert</Chip><AvailabilityDot person={expert} label /></div>
          <div className="mt-2 text-[13px] text-[#55514B]">{[expert.email, expert.phone, expert.company].filter(Boolean).join(" · ") || "No contact yet"}</div>
        </div>
        {!isOwnerSelf(state.me, expert.id) && <Button onClick={() => set({ status: expert.status === "Active" ? "Paused" : "Active" })}>{expert.status === "Active" ? <><Pause size={14} />Pause</> : <><Play size={14} />Resume</>}</Button>}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHead title="Details" />
            <div className="grid gap-3">
              <Field label="Their field"><input value={expert.speciality} onChange={(event) => set({ speciality: event.target.value, title: event.target.value || "Expert" })} className={fieldClass} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company"><input value={expert.company} onChange={(event) => set({ company: event.target.value })} className={fieldClass} /></Field>
                <Field label="Phone"><input value={expert.phone} onChange={(event) => set({ phone: event.target.value })} className={fieldClass} /></Field>
              </div>
              <Field label="Email (they sign in with it)"><input type="email" value={expert.email} onChange={(event) => set({ email: event.target.value })} className={fieldClass} /></Field>
              <Field label="Notes"><textarea value={expert.notes} onChange={(event) => set({ notes: event.target.value })} rows={3} className={fieldClass} placeholder="What they are good at, how fast they answer…" /></Field>
            </div>
          </Card>
          <Card>
            <CardHead title="Where they are and when they work" />
            <HoursEditor person={expert} expert />
          </Card>
          {owner && <Button onClick={() => { if (window.confirm(`Remove ${expert.name}? Posts waiting with them go back to the reviewer.`)) { store.deleteExpert(expert.id); go({ view: "freelancers" }); } }}><Trash2 size={14} />Remove this expert</Button>}
        </div>
        <Card>
          <CardHead title="Posts sent to them" sub={posts.length ? `${posts.length} so far` : "Nothing sent yet."} />
          <ul className="space-y-2">
            {posts.map((post) => {
              const client = state.clients.find((item) => item.id === post.clientId);
              return (
                <li key={post.id}>
                  <button onClick={() => go({ view: "marketing", clientId: post.clientId, postId: post.id })} className="flex w-full items-center gap-3 rounded-xl border border-[#F0EEE9] px-3 py-2.5 text-left hover:bg-[#FBFAF8]">
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-bold">{post.title}</span><span className="text-[12px] text-[#8B867E]">{client?.name} · sent {todayIso() === post.expert!.at.slice(0, 10) ? "today" : post.expert!.at.slice(0, 10)}</span></span>
                    <Chip t={post.expert!.status === "with" ? "purple" : post.expert!.verdict === "ok" ? "green" : "amber"}>{post.expert!.status === "with" ? "Waiting" : post.expert!.verdict === "ok" ? "Right" : "Changes"}</Chip>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}

const isOwnerSelf = (me: string, id: string) => me === id;
