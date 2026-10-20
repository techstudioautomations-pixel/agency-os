"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Grid3x3, Layers, Lock, Newspaper, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { monthName, shiftMonth, shortDate, todayIso } from "@/lib/works/logic";
import type { Client, Post } from "@/lib/works/types";
import { PostArt } from "./PostArt";
import { Button, ClientMark, fieldClass } from "./kit";

const approvedStatus = ["Ready to schedule", "Scheduled", "Published"];
const state_of = (post: Post) =>
  post.status === "Published" ? { text: "Live", color: "#1D9E5A", tone: "bg-[#E6F5EC] text-[#17804A]" }
  : post.status === "Scheduled" ? { text: "Scheduled", color: "#2F6FDB", tone: "bg-[#E8F0FD] text-[#1F5BC4]" }
  : post.status === "Ready to schedule" ? { text: "Approved", color: "#1D9E5A", tone: "bg-[#E6F5EC] text-[#17804A]" }
  : post.status === "Client approval" ? { text: "Waiting for you", color: "#E0A325", tone: "bg-[#FFF3D9] text-[#94600A]" }
  : { text: "Being prepared", color: "#B9B3A8", tone: "bg-[#F1F0ED] text-[#6B6760]" };
const day = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });

/** What a client sees: a private page, behind a code, showing the posts we chose to share. They can answer only when we asked them to review. */
export function ShareView({ token }: { token: string }) {
  const { state, clientDecide } = useStore();
  const client = state.clients.find((item) => item.share.token === token);
  const thisMonth = todayIso().slice(0, 7);
  const shared = useMemo(() => (client ? state.posts.filter((post) => client.share.postIds.includes(post.id)) : []), [client, state.posts]);
  const [unlocked, setUnlocked] = useState(() => {
    try { return window.sessionStorage.getItem(`works-view-${token}`) === "1"; } catch { return false; }
  });
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const [month, setMonth] = useState(() => (shared.some((post) => post.date.startsWith(shiftMonth(thisMonth, 1))) ? shiftMonth(thisMonth, 1) : thisMonth));
  const [mode, setMode] = useState<"grid" | "feed" | "calendar">("grid");
  const [channel, setChannel] = useState("all");
  const [openId, setOpenId] = useState("");
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);

  const frame = (children: ReactNode, accent = "#2F6FDB") => (
    <div className="min-h-screen px-4 pb-16 pt-8 text-[#1E2430] sm:px-8" style={{ background: `linear-gradient(180deg, ${accent}14 0, #F6F5F2 340px)` }}>
      <div className="mx-auto max-w-[1040px]">{children}</div>
    </div>
  );

  if (!client || !client.share.enabled) return frame(<div className="mx-auto mt-24 max-w-md rounded-3xl border border-[#E9E6E0] bg-white p-8 text-center"><Lock className="mx-auto text-[#8B867E]" /><h1 className="mt-3 text-[20px] font-extrabold">This link is not active</h1><p className="mt-1 text-[14px] text-[#6B6760]">Ask your contact at The Works for a new one.</p></div>);

  if (!unlocked) {
    return frame(
      <form onSubmit={(event) => { event.preventDefault(); if (code.trim() === client.share.code) { try { window.sessionStorage.setItem(`works-view-${token}`, "1"); } catch { /* keep going without storage */ } setUnlocked(true); } else setWrong(true); }} className="mx-auto mt-20 max-w-sm rounded-[28px] border border-[#E9E6E0] bg-white p-8 text-center shadow-[0_24px_60px_rgba(30,36,48,.10)]">
        <div className="mx-auto w-fit"><ClientMark client={client} size={72} /></div>
        <h1 className="mt-4 text-[24px] font-extrabold">{client.name}</h1>
        <p className="mt-1 text-[14px] text-[#6B6760]">Your content plan. Enter the code we sent you to open it.</p>
        <input autoFocus inputMode="numeric" value={code} onChange={(event) => { setCode(event.target.value); setWrong(false); }} aria-label="Access code" placeholder="6-digit code" className={`${fieldClass} mt-5 text-center font-mono text-[18px] tracking-widest`} />
        {wrong && <p className="mt-2 text-[13px] font-semibold text-[#B83232]">That code is not right. Check it and try again.</p>}
        <Button kind="primary" type="submit" className="mt-4 w-full">Open my plan</Button>
        <p className="mt-4 text-[11px] text-[#A8A39B]">Prepared by The Works</p>
      </form>,
      client.color,
    );
  }

  const inMonth = shared.filter((post) => post.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
  const visible = inMonth.filter((post) => channel === "all" || post.platforms.includes(channel));
  const channels = [...new Set(shared.flatMap((post) => post.platforms))];
  const ready = inMonth.filter((post) => approvedStatus.includes(post.status)).length;
  const making = inMonth.length - ready;
  const first = inMonth.find((post) => post.date >= todayIso()) ?? inMonth[0];
  const open = shared.find((post) => post.id === openId);
  const canAnswer = (post: Post) => post.status === "Client approval" && client.approvalMode !== "C";
  const [year, mon] = month.split("-").map(Number);
  const offset = (new Date(year, mon - 1, 1).getDay() + 6) % 7;
  const days = new Date(year, mon, 0).getDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  const show = (post: Post) => { setOpenId(post.id); setAsking(false); setNote(""); };

  const stat = (value: ReactNode, label: string, tint?: string) => (
    <div className="rounded-2xl border border-[#E9E6E0] bg-white px-4 py-3.5"><div className="text-[26px] font-extrabold leading-none" style={tint ? { color: tint } : undefined}>{value}</div><div className="mt-1.5 text-[12px] font-semibold text-[#6B6760]">{label}</div></div>
  );

  return frame(
    <>
      <header className="flex flex-wrap items-center gap-4">
        <ClientMark client={client} size={64} />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-bold uppercase tracking-[.14em]" style={{ color: client.color }}>Content plan</div>
          <h1 className="text-[28px] font-extrabold leading-tight">{client.name}</h1>
          <p className="text-[14px] text-[#6B6760]">Prepared for you by The Works</p>
        </div>
        <div className="flex items-center gap-1 rounded-2xl border border-[#E2DED7] bg-white p-1">
          <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="rounded-xl p-2 hover:bg-[#F1F0ED]"><ChevronLeft size={17} /></button>
          <span className="min-w-[132px] text-center text-[14px] font-bold">{monthName(month)}</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" className="rounded-xl p-2 hover:bg-[#F1F0ED]"><ChevronRight size={17} /></button>
        </div>
      </header>

      {shared.length === 0 || inMonth.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-[#D6D1C8] bg-white p-10 text-center text-[14px] text-[#6B6760]">{shared.length === 0 ? "Nothing to show yet. We will add posts here as they are ready." : `Nothing planned for ${monthName(month)} yet.`}</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stat(inMonth.length, `post${inMonth.length === 1 ? "" : "s"} planned for ${monthName(month).split(" ")[0]}`)}
            {stat(ready, "approved and ready", "#17804A")}
            {stat(making, "being prepared", making ? "#94600A" : undefined)}
            {first ? stat(<span className="text-[19px]">{day(first.date)}</span>, "next one goes out") : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-2xl bg-[#ECEAE5] p-1">
              {([["grid", "Feed grid", Grid3x3], ["feed", "Post by post", Newspaper], ["calendar", "Calendar", CalendarDays]] as const).map(([value, label, Icon]) => (
                <button key={value} onClick={() => setMode(value)} aria-pressed={mode === value} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition ${mode === value ? "bg-white shadow-sm" : "text-[#6B6760]"}`}><Icon size={15} />{label}</button>
              ))}
            </div>
            {channels.length > 1 && mode !== "calendar" && (
              <div className="flex flex-wrap gap-1.5">
                {["all", ...channels].map((name) => <button key={name} onClick={() => setChannel(name)} aria-pressed={channel === name} className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold ${channel === name ? "bg-[#1E2430] text-white" : "bg-white text-[#6B6760] ring-1 ring-[#E2DED7]"}`}>{name === "all" ? "All channels" : name}</button>)}
              </div>
            )}
          </div>

          {mode === "grid" && (
            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
              <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[36px] border-[10px] border-[#1E2430] bg-white shadow-[0_30px_70px_rgba(30,36,48,.22)]">
                <div className="flex items-center gap-4 px-5 pb-3 pt-5">
                  <span className="rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, ${client.color}, #E0A325)` }}><span className="block rounded-full bg-white p-[3px]"><ClientMark client={client} size={62} /></span></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px] font-extrabold">{client.name}</div>
                    <div className="truncate text-[12px] text-[#8B867E]">{client.sector}</div>
                    <div className="mt-1 text-[12px]"><b>{visible.length}</b> posts planned</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-[2px] bg-[#F1F0ED] pt-[2px]">
                  {[...visible].reverse().map((post) => {
                    const status = state_of(post);
                    return (
                      <button key={post.id} onClick={() => show(post)} aria-label={`${post.title}, ${status.text}`} className="group relative aspect-[3/4] overflow-hidden bg-white">
                        <PostArt post={post} client={client} fill rounded="rounded-none" className="transition duration-300 group-hover:scale-[1.04]" />
                        <span className="absolute left-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: status.color }} />
                        {post.files.length > 1 && <Layers size={14} className="absolute right-1.5 top-1.5 text-white drop-shadow" />}
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-6 text-left text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">{shortDate(post.date)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#E9E6E0] bg-white p-5">
                  <h2 className="text-[17px] font-extrabold">How your feed will look</h2>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#55514B]">This is {monthName(month).split(" ")[0]} as it will appear on your page, newest post first. Tap any post to see the caption and the artwork full size.</p>
                  <ul className="mt-3 space-y-1.5 text-[13px]">
                    {[["#1D9E5A", "Approved or live"], ["#2F6FDB", "Scheduled to go out"], ["#B9B3A8", "Still being prepared"]].map(([color, label]) => <li key={label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-[#E9E6E0] bg-white p-5">
                  <h3 className="text-[14px] font-extrabold">Coming up</h3>
                  <ul className="mt-2 divide-y divide-[#F3F1ED]">
                    {visible.slice(0, 5).map((post) => (
                      <li key={post.id}><button onClick={() => show(post)} className="flex w-full items-center gap-3 py-2.5 text-left"><span className="w-[84px] shrink-0 text-[12px] font-bold text-[#6B6760]">{day(post.date)}</span><span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{post.title}</span><span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${state_of(post).tone}`}>{state_of(post).text}</span></button></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {mode === "feed" && (
            <div className="mx-auto mt-6 max-w-[560px] space-y-5">
              {visible.map((post) => {
                const status = state_of(post);
                const caption = (channel !== "all" ? post.captions[channel] : undefined) ?? post.copy;
                return (
                  <article key={post.id} className="overflow-hidden rounded-3xl border border-[#E9E6E0] bg-white shadow-sm">
                    <div className="flex items-center gap-3 px-4 pb-3 pt-4">
                      <ClientMark client={client} size={42} />
                      <div className="min-w-0 flex-1 leading-tight"><div className="text-[14px] font-bold">{client.name}</div><div className="text-[12px] text-[#8B867E]">{day(post.date)} · {post.platforms.join(" · ")}</div></div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.tone}`}>{status.text}</span>
                    </div>
                    {caption && <p className="line-clamp-4 whitespace-pre-wrap px-4 pb-3 text-[14px] leading-relaxed">{caption}</p>}
                    <button onClick={() => show(post)} aria-label={`Open ${post.title}`} className="block w-full"><PostArt post={post} client={client} rounded="rounded-none" /></button>
                    <div className="flex items-center justify-between px-4 py-3 text-[12px] font-semibold text-[#6B6760]"><span>{post.title}</span><button onClick={() => show(post)} className="font-bold" style={{ color: client.color }}>Open</button></div>
                  </article>
                );
              })}
              {visible.length === 0 && <p className="rounded-2xl border border-dashed border-[#D6D1C8] bg-white p-8 text-center text-[14px] text-[#6B6760]">No posts on {channel} this month.</p>}
            </div>
          )}

          {mode === "calendar" && (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-[#E9E6E0] bg-white">
              <div className="grid min-w-[760px] grid-cols-7">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => <div key={name} className="border-b border-[#F0EEE9] px-2.5 py-2 text-[11px] font-bold uppercase text-[#8B867E]">{name}</div>)}
                {Array.from({ length: cells }, (_, index) => {
                  const dayNumber = index - offset + 1;
                  const iso = dayNumber > 0 && dayNumber <= days ? `${month}-${String(dayNumber).padStart(2, "0")}` : "";
                  return (
                    <div key={index} className="min-h-[112px] border-b border-r border-[#F5F3EF] p-1.5">
                      {iso && <div className="mb-1 text-[11px] font-bold text-[#A8A39B]">{dayNumber}</div>}
                      {inMonth.filter((post) => post.date === iso).map((post) => (
                        <button key={post.id} onClick={() => show(post)} className="mb-1 flex w-full items-center gap-1.5 rounded-lg border border-[#EEEBE5] bg-white p-1 text-left hover:border-[#C9C3B8]">
                          <span className="w-9 shrink-0 overflow-hidden rounded-md"><PostArt post={post} client={client} rounded="rounded-md" /></span>
                          <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{post.title}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <footer className="mt-12 text-center text-[12px] text-[#A8A39B]">Prepared by The Works · Anything look off? Tell your contact and we will change it.</footer>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#1E2430]/60 p-4" role="dialog" aria-modal="true" aria-label={open.title} onClick={(event) => { if (event.target === event.currentTarget) setOpenId(""); }}>
          <PostDetail post={open} client={client} onClose={() => setOpenId("")} answer={canAnswer(open) ? { asking, setAsking, note, setNote, approve: () => { clientDecide(open.id, "Approved", ""); setOpenId(""); }, change: () => { clientDecide(open.id, "Changes requested", note.trim()); setOpenId(""); } } : undefined} />
        </div>
      )}
    </>,
    client.color,
  );
}

function PostDetail({ post, client, onClose, answer }: { post: Post; client: Client; onClose: () => void; answer?: { asking: boolean; setAsking: (value: boolean) => void; note: string; setNote: (value: string) => void; approve: () => void; change: () => void } }) {
  const [channel, setChannel] = useState(post.platforms[0] ?? "");
  const [slide, setSlide] = useState(0);
  const status = state_of(post);
  const caption = post.captions[channel] ?? post.copy;
  const count = Math.max(1, post.files.filter((file) => file.kind === "image" || file.kind === "video").length);
  return (
    <div className="grid max-h-[92vh] w-full max-w-[860px] overflow-y-auto rounded-[28px] bg-white md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="bg-[#F1F0ED] p-5">
        <div className="relative mx-auto max-w-[380px]">
          <PostArt post={post} client={client} index={slide} rounded="rounded-2xl" className="shadow-md" />
          {count > 1 && (
            <>
              <button onClick={() => setSlide((slide - 1 + count) % count)} aria-label="Previous slide" className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 shadow"><ChevronLeft size={18} /></button>
              <button onClick={() => setSlide((slide + 1) % count)} aria-label="Next slide" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 shadow"><ChevronRight size={18} /></button>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col p-6">
        <div className="flex items-start gap-2">
          <div className="flex-1"><div className="text-[12px] font-semibold text-[#8B867E]">{day(post.date)}</div><h2 className="text-[20px] font-extrabold leading-tight">{post.title}</h2></div>
          <button onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-[#8B867E] hover:bg-[#F1F0ED]"><X size={18} /></button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.tone}`}>{status.text}</span>
          {post.platforms.map((name) => <button key={name} onClick={() => setChannel(name)} aria-pressed={channel === name} className={`rounded-full px-3 py-1 text-[11px] font-bold ${channel === name ? "bg-[#1E2430] text-white" : "bg-[#F1F0ED] text-[#6B6760]"}`}>{name}</button>)}
        </div>
        <p className="mt-4 flex-1 whitespace-pre-wrap text-[14px] leading-relaxed">{caption || "The caption is being written."}</p>
        {answer && (
          <div className="mt-5 space-y-2 border-t border-[#F0EEE9] pt-4">
            <p className="text-[13px] font-semibold">You asked to review this one.</p>
            {answer.asking && <textarea autoFocus value={answer.note} onChange={(event) => answer.setNote(event.target.value)} rows={3} placeholder="What would you like changed?" aria-label="What to change" className={fieldClass} />}
            <div className="flex gap-2">
              <Button kind="good" onClick={answer.approve}><Check size={15} />Approve</Button>
              {answer.asking ? <Button kind="warn" disabled={!answer.note.trim()} onClick={answer.change}>Send changes</Button> : <Button onClick={() => answer.setAsking(true)}>Ask for changes</Button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
