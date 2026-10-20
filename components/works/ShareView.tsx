"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Lock, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { monthName, shiftMonth, shortDate, todayIso } from "@/lib/works/logic";
import type { Client, Post } from "@/lib/works/types";
import { PostArt } from "./PostArt";
import { Button, Chip, ClientMark, fieldClass } from "./kit";

const label = (post: Post) => (post.status === "Published" ? { text: "Live", t: "green" as const } : post.status === "Scheduled" ? { text: "Scheduled", t: "blue" as const } : post.status === "Client approval" ? { text: "Waiting for you", t: "amber" as const } : { text: "Approved", t: "green" as const });

/** What a client sees: only the posts we chose to show, read-only. They can answer only when we asked them to review. */
export function ShareView({ token }: { token: string }) {
  const { state, clientDecide } = useStore();
  const client = state.clients.find((item) => item.share.token === token);
  const [unlocked, setUnlocked] = useState(() => {
    try { return window.sessionStorage.getItem(`works-view-${token}`) === "1"; } catch { return false; }
  });
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [openId, setOpenId] = useState("");
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);

  const frame = (children: React.ReactNode) => <div className="min-h-screen bg-[#F6F5F2] px-4 py-8 text-[#1E2430] sm:px-8"><div className="mx-auto max-w-[1000px]">{children}</div></div>;

  if (!client || !client.share.enabled) return frame(<div className="mx-auto mt-24 max-w-md rounded-3xl border border-[#E9E6E0] bg-white p-8 text-center"><Lock className="mx-auto text-[#8B867E]" /><h1 className="mt-3 text-[20px] font-extrabold">This link is not active</h1><p className="mt-1 text-[14px] text-[#6B6760]">Ask your contact at The Works for a new one.</p></div>);

  if (!unlocked) {
    return frame(
      <form onSubmit={(event) => { event.preventDefault(); if (code.trim() === client.share.code) { try { window.sessionStorage.setItem(`works-view-${token}`, "1"); } catch { /* keep going without storage */ } setUnlocked(true); } else setWrong(true); }} className="mx-auto mt-20 max-w-sm rounded-3xl border border-[#E9E6E0] bg-white p-8 text-center">
        <div className="mx-auto w-fit"><ClientMark client={client} size={56} /></div>
        <h1 className="mt-4 text-[22px] font-extrabold">{client.name}</h1>
        <p className="mt-1 text-[14px] text-[#6B6760]">Enter the code we sent you to see your content calendar.</p>
        <input autoFocus inputMode="numeric" value={code} onChange={(event) => { setCode(event.target.value); setWrong(false); }} aria-label="Access code" placeholder="6-digit code" className={`${fieldClass} mt-5 text-center font-mono text-[18px] tracking-widest`} />
        {wrong && <p className="mt-2 text-[13px] font-semibold text-[#B83232]">That code is not right. Check it and try again.</p>}
        <Button kind="primary" type="submit" className="mt-4 w-full">See my calendar</Button>
      </form>,
    );
  }

  const shared = state.posts.filter((post) => client.share.postIds.includes(post.id));
  const inMonth = shared.filter((post) => post.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
  const open = shared.find((post) => post.id === openId);
  const canAnswer = (post: Post) => post.status === "Client approval" && client.approvalMode !== "C";
  const [year, mon] = month.split("-").map(Number);
  const offset = (new Date(year, mon - 1, 1).getDay() + 6) % 7;
  const days = new Date(year, mon, 0).getDate();
  const cells = Math.ceil((offset + days) / 7) * 7;

  return frame(
    <>
      <header className="flex flex-wrap items-center gap-4">
        <ClientMark client={client} size={52} />
        <div className="flex-1"><h1 className="text-[24px] font-extrabold leading-tight">{client.name}</h1><p className="text-[14px] text-[#6B6760]">Your content calendar, prepared by The Works</p></div>
        <div className="flex items-center gap-1 rounded-xl border border-[#E2DED7] bg-white p-1">
          <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="rounded-lg p-1.5 hover:bg-[#F1F0ED]"><ChevronLeft size={16} /></button>
          <span className="min-w-[118px] text-center text-[13px] font-bold">{monthName(month)}</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" className="rounded-lg p-1.5 hover:bg-[#F1F0ED]"><ChevronRight size={16} /></button>
        </div>
      </header>

      {shared.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-[#D6D1C8] bg-white p-10 text-center text-[14px] text-[#6B6760]">Nothing to show yet. We will add posts here as they are ready.</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-[#E9E6E0] bg-white">
            <div className="grid min-w-[760px] grid-cols-7">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => <div key={name} className="border-b border-[#F0EEE9] px-2.5 py-2 text-[11px] font-bold uppercase text-[#8B867E]">{name}</div>)}
              {Array.from({ length: cells }, (_, index) => {
                const day = index - offset + 1;
                const iso = day > 0 && day <= days ? `${month}-${String(day).padStart(2, "0")}` : "";
                return (
                  <div key={index} className="min-h-[110px] border-b border-r border-[#F5F3EF] p-1.5">
                    {iso && <div className="mb-1 text-[11px] font-bold text-[#A8A39B]">{day}</div>}
                    {inMonth.filter((post) => post.date === iso).map((post) => (
                      <button key={post.id} onClick={() => { setOpenId(post.id); setAsking(false); setNote(""); }} className="mb-1 flex w-full items-center gap-1.5 rounded-lg border border-[#EEEBE5] bg-white p-1 text-left hover:border-[#C9C3B8]">
                        <span className="w-9 shrink-0"><PostArt post={post} client={client} rounded="rounded-md" /></span>
                        <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{post.title}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <h2 className="mb-3 mt-8 text-[17px] font-extrabold">{monthName(month)} · {inMonth.length} post{inMonth.length === 1 ? "" : "s"}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {inMonth.map((post) => (
              <button key={post.id} onClick={() => { setOpenId(post.id); setAsking(false); setNote(""); }} className="overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white text-left hover:shadow-md">
                <PostArt post={post} client={client} rounded="rounded-none" />
                <div className="p-3"><div className="line-clamp-2 text-[13px] font-bold leading-snug">{post.title}</div><div className="mt-1.5 flex items-center gap-2 text-[11px] text-[#8B867E]">{shortDate(post.date)}<Chip t={label(post).t} className="!text-[11px]">{label(post).text}</Chip></div></div>
              </button>
            ))}
          </div>
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#1E2430]/55 p-4" role="dialog" aria-modal="true" aria-label={open.title} onClick={(event) => { if (event.target === event.currentTarget) setOpenId(""); }}>
          <div className="grid max-h-[92vh] w-full max-w-[820px] overflow-y-auto rounded-3xl bg-white md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="bg-[#F1F0ED] p-5"><PostArt post={open} client={client} rounded="rounded-2xl" className="mx-auto max-w-[360px] shadow-md" /></div>
            <div className="flex flex-col p-6">
              <div className="flex items-start gap-2"><div className="flex-1"><div className="text-[12px] font-semibold text-[#8B867E]">{shortDate(open.date)} · {open.platforms.join(", ")}</div><h2 className="text-[20px] font-extrabold leading-tight">{open.title}</h2></div><button onClick={() => setOpenId("")} aria-label="Close" className="rounded-xl p-2 text-[#8B867E] hover:bg-[#F1F0ED]"><X size={18} /></button></div>
              <Chip t={label(open).t} className="mt-2 w-fit">{label(open).text}</Chip>
              <p className="mt-4 flex-1 whitespace-pre-wrap text-[14px] leading-relaxed">{open.copy || "Caption to come."}</p>
              {canAnswer(open) && (
                <div className="mt-5 space-y-2 border-t border-[#F0EEE9] pt-4">
                  <p className="text-[13px] font-semibold">You asked to review this one.</p>
                  {asking && <textarea autoFocus value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="What would you like changed?" aria-label="What to change" className={fieldClass} />}
                  <div className="flex gap-2">
                    <Button kind="good" onClick={() => { clientDecide(open.id, "Approved", ""); setOpenId(""); }}><Check size={15} />Approve</Button>
                    {asking ? <Button kind="warn" disabled={!note.trim()} onClick={() => { clientDecide(open.id, "Changes requested", note.trim()); setOpenId(""); }}>Send changes</Button> : <Button onClick={() => setAsking(true)}>Ask for changes</Button>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>,
  );
}
