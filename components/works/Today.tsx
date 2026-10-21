"use client";

import { useState } from "react";
import { ArrowRight, BarChart3, CheckCircle2, ChevronDown, Lightbulb, Plus, Send } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { agreedFor, canBeAssigned, isHired, gate, inReview, isFreelancer, isMarketing, me, monthName, monthlyAreas, myClients, personById, progress, shiftMonth, todayIso, turnOf } from "@/lib/works/logic";
import type { Post } from "@/lib/works/types";
import { Shell } from "./Shell";
import { ExtraAlert } from "./ExtraWork";
import { UpdatesBlock } from "./Updates";
import { PostArt } from "./PostArt";
import { statusTone } from "./Marketing";
import { Avatar, Bar, Chip, ClientMark, Light, tone } from "./kit";

function Strip({ title, sub, posts, empty, onAll }: { title: string; sub: string; posts: Post[]; empty: string; onAll: () => void }) {
  const { state, go } = useStore();
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold">{title}</h2>
          <p className="text-[13px] text-[#6B6760]">{sub}</p>
        </div>
        {posts.length > 0 && <button onClick={onAll} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1F5BC4]">See all <ArrowRight size={14} /></button>}
      </div>
      {posts.length === 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#E9E6E0] bg-white px-5 py-4 text-[14px] font-semibold text-[#17804A]"><CheckCircle2 size={17} />{empty}</div>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {posts.slice(0, 12).map((post) => {
            const client = state.clients.find((item) => item.id === post.clientId)!;
            const status = statusTone(post);
            const turn = turnOf(state, post);
            return (
              <button key={post.id} onClick={() => go({ view: "marketing", clientId: "all", postId: post.id })} className="w-[168px] shrink-0 overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(30,36,48,.10)] sm:w-[188px]">
                <div className="relative">
                  <PostArt post={post} client={client} rounded="rounded-none" />
                </div>
                <div className="p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-[#55514B]"><ClientMark client={client} size={16} />{client.name}</div>
                  <div className="line-clamp-2 text-[12px] font-bold leading-snug">{post.title}</div>
                  <div className="mt-1.5"><Chip t={turn.who === state.me ? "blue" : status.t} className="!text-[11px]">{turn.who === state.me ? turn.verb : status.label}</Chip></div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReviewBlock({ title, sub, posts, empty, onAll }: { title: string; sub: string; posts: Post[]; empty: string; onAll: () => void }) {
  const { state, go } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-3xl border border-[#E9E6E0] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-5">
        <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-3xl text-[40px] font-extrabold ${posts.length ? "bg-[#E8F0FD] text-[#1F5BC4]" : "bg-[#E6F5EC] text-[#17804A]"}`}>{posts.length}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] font-extrabold">{title}</h2>
          <p className="text-[13px] text-[#6B6760]">{posts.length ? sub : empty}</p>
        </div>
        <div className="flex items-center gap-2">
          {posts.length > 0 && <button onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2DED7] px-3.5 py-2 text-[13px] font-semibold hover:border-[#C9C3B8]">{open ? "Hide" : "Show"} posts<ChevronDown size={14} className={open ? "rotate-180" : ""} /></button>}
          {posts.length > 0 && <button onClick={onAll} className="inline-flex items-center gap-1 rounded-xl bg-[#1E2430] px-3.5 py-2 text-[13px] font-semibold text-white">See all <ArrowRight size={14} /></button>}
        </div>
      </div>
      {open && (
        <div className="-mx-1 mt-5 flex gap-3 overflow-x-auto px-1 pb-2">
          {posts.slice(0, 12).map((post) => {
            const client = state.clients.find((item) => item.id === post.clientId)!;
            return (
              <button key={post.id} onClick={() => go({ view: "marketing", clientId: "all", postId: post.id })} className="w-[150px] shrink-0 overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white text-left hover:shadow-md">
                <PostArt post={post} client={client} rounded="rounded-none" />
                <div className="p-2.5"><div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-[#55514B]"><ClientMark client={client} size={16} />{client.name}</div><div className="line-clamp-2 text-[12px] font-bold leading-snug">{post.title}</div></div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** What a freelancer does most, one click away. */
function QuickActions() {
  const { state, go, openPostWizard, openUpdate } = useStore();
  const clients = myClients(state).filter(isMarketing);
  const only = clients.length === 1 ? clients[0].id : "all";
  return (
    <section className="rounded-3xl border border-[#E9E6E0] bg-white p-5 sm:p-6">
      <h2 className="text-[18px] font-extrabold">What do you want to do?</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button onClick={() => openUpdate(only === "all" ? undefined : only)} className="flex items-center gap-3 rounded-2xl bg-[#1E2430] p-4 text-left text-white transition hover:bg-[#2E3542]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15"><Send size={20} /></span>
          <span><span className="block text-[16px] font-extrabold">Send an update</span><span className="block text-[12px] opacity-75">Today's posts in one message</span></span>
        </button>
        <button onClick={() => openPostWizard()} className="flex items-center gap-3 rounded-2xl border border-[#E2DED7] p-4 text-left transition hover:border-[#C9C3B8]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F1F0ED]"><Plus size={22} /></span>
          <span><span className="block text-[15px] font-bold">Create post</span><span className="block text-[12px] text-[#6B6760]">One post, step by step</span></span>
        </button>
        <button onClick={() => go({ view: "marketing", clientId: only, tab: "ideas" })} className="flex items-center gap-3 rounded-2xl border border-[#E2DED7] p-4 text-left transition hover:border-[#C9C3B8]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF3D9] text-[#94600A]"><Lightbulb size={20} /></span>
          <span><span className="block text-[15px] font-bold">Ideas deck</span><span className="block text-[12px] text-[#6B6760]">Add ideas or pick an approved one</span></span>
        </button>
        <button onClick={() => go({ view: "reports", clientId: only, month: shiftMonth(state.month, -1) })} className="flex items-center gap-3 rounded-2xl border border-[#E2DED7] p-4 text-left transition hover:border-[#C9C3B8]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#E8F0FD] text-[#1F5BC4]"><BarChart3 size={20} /></span>
          <span><span className="block text-[15px] font-bold">Month-end report</span><span className="block text-[12px] text-[#6B6760]">Numbers and the report</span></span>
        </button>
      </div>
    </section>
  );
}

export function Today() {
  const { state, go } = useStore();
  const person = me(state);
  const freelancer = isFreelancer(state);
  const clients = myClients(state);
  const today = todayIso();
  const week = new Date(`${today}T12:00:00`);
  week.setDate(week.getDate() + 7);
  const weekEnd = week.toISOString().slice(0, 10);
  const inMine = (post: Post) => clients.some((client) => client.id === post.clientId);
  const owner = person.role === "owner";
  // Reviews are internal: freelancers see their own turn, the team sees everything in review (plus anything a client asked to see).
  const forMe = state.posts
    .filter((post) => inMine(post) && (freelancer ? post.date.startsWith(state.month) && turnOf(state, post).who === state.me : inReview(post) || (post.status === "Client approval" && clients.find((c) => c.id === post.clientId)?.approvalMode !== "C")))
    .sort((a, b) => a.date.localeCompare(b.date));
  const thisWeek = state.posts.filter((post) => inMine(post) && post.date >= today && post.date <= weekEnd && ["Scheduled", "Ready to schedule", "Published"].includes(post.status)).sort((a, b) => a.date.localeCompare(b.date));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const lastMonth = shiftMonth(state.month, -1);
  const dateLine = new Date(`${today}T12:00:00`).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Shell title={`${greeting}, ${person.name.split(" ")[0]}`} sub={dateLine}>
      <div className="space-y-8">
        {freelancer && <ExtraAlert personId={state.me} />}
        {freelancer ? <QuickActions /> : (
          <ReviewBlock
            title="In review now"
            sub="Posts waiting for a team or freelancer review, across all clients."
            posts={forMe}
            empty="Nothing in review right now."
            onAll={() => go({ view: "marketing", clientId: "all", tab: "posts", filter: "review" })}
          />
        )}
        <UpdatesBlock />
        <Strip title="Going out this week" sub="Approved and scheduled posts for the next 7 days." posts={thisWeek} empty="Nothing scheduled for the next 7 days." onAll={() => go({ view: "marketing", clientId: "all", tab: "calendar" })} />

        <section>
          <div className="mb-3">
            <h2 className="text-[18px] font-extrabold">{freelancer ? "My clients" : "Clients at a glance"}</h2>
            <p className="text-[13px] text-[#6B6760]">{monthName(state.month)} content, setup and last month&apos;s report.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((client) => {
              const posts = state.posts.filter((post) => post.clientId === client.id && post.date.startsWith(state.month) && !post.extra).sort((a, b) => a.date.localeCompare(b.date));
              const approved = posts.filter((post) => ["Ready to schedule", "Scheduled", "Published"].includes(post.status)).length;
              const g = gate(client.checklist);
              const setup = progress(client.checklist).percent;
              const report = state.reports.find((item) => item.clientId === client.id && item.month === lastMonth);
              const reportDue = client.startDate.slice(0, 7) <= lastMonth;
              const reportSent = Boolean(report?.sentAt || report?.clientReport);
              const fl = personById(state, client.freelancerId);
              const waitingMe = posts.filter((post) => turnOf(state, post).who === state.me).length;
              const monthSteps = monthlyAreas(state, client).filter((area) => (freelancer ? area.id === "freelancer" : area.id === "ops")).flatMap((area) => area.steps);
              return (
                <button key={client.id} onClick={() => go(freelancer ? { view: "marketing", clientId: client.id } : { view: "client", clientId: client.id })} className="min-w-0 rounded-2xl border border-[#E9E6E0] bg-white p-4 text-left transition hover:border-[#D2CCC2] hover:shadow-[0_8px_24px_rgba(30,36,48,.06)]">
                  <div className="flex items-center gap-3">
                    <ClientMark client={client} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-bold">{client.name}</div>
                      <div className="text-[12px] text-[#8B867E]">{client.package} · {client.stage}</div>
                    </div>
                    {waitingMe > 0 && <Chip t="blue">{waitingMe} for you</Chip>}
                  </div>
                  {isMarketing(client) && (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[12px] font-semibold text-[#55514B]"><span>Approved this month</span><span>{approved} / {agreedFor(client, state.month)}</span></div>
                      <Bar value={agreedFor(client, state.month) ? (approved / agreedFor(client, state.month)) * 100 : 0} color={tone.green.dot} />
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-[#6B6760]">
                        <span><b>{posts.filter((post) => post.status.endsWith("in progress")).length}</b> to write</span>
                        <span><b>{posts.filter((post) => post.status.endsWith("review") || post.status === "Client approval").length}</b> in review</span>
                        <span><b>{posts.filter((post) => post.status === "Ready to schedule").length}</b> to schedule</span>
                        <span><b>{posts.filter((post) => ["Scheduled", "Published"].includes(post.status)).length}</b> posted</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[#F0EEE9] pt-3 text-[12px] font-semibold text-[#55514B]">
                    {!freelancer && <span className="flex items-center gap-1.5"><Light light={g.light} size={7} />Setup {setup}%</span>}
                    {monthSteps.length > 0 && <span>{freelancer ? "Your list" : "This month"} {monthSteps.filter((step) => step.done).length}/{monthSteps.length}</span>}
                    {reportDue && <span className={reportSent ? "text-[#17804A]" : "text-[#B83232]"}>{reportSent ? "✓" : "○"} {monthName(lastMonth).split(" ")[0]} report</span>}
                    <span className="ml-auto flex items-center gap-1.5">{fl ? <><Avatar name={fl.name} color={fl.color} size={20} />{fl.name}</> : <Chip t="red">No freelancer</Chip>}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {!freelancer && (
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-[18px] font-extrabold">Who is on which account</h2>
                <p className="text-[13px] text-[#6B6760]">And how full each freelancer is.</p>
              </div>
              <button onClick={() => go({ view: "freelancers" })} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1F5BC4]">Freelancers <ArrowRight size={14} /></button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#E9E6E0] bg-white">
              {state.freelancers.filter(isHired).map((item) => {
                const accounts = state.clients.filter((client) => client.freelancerId === item.id);
                return (
                  <button key={item.id} onClick={() => go({ view: "freelancers", freelancerId: item.id })} className="flex w-full flex-wrap items-center gap-3 border-b border-[#F5F3EF] px-4 py-3 text-left last:border-0 hover:bg-[#FBFAF8]">
                    <Avatar name={item.name} color={item.color} size={34} />
                    <span className="w-36 min-w-0"><span className="block truncate text-[14px] font-bold">{item.name}</span><span className="block truncate text-[12px] text-[#8B867E]">{item.speciality}</span></span>
                    <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                      {accounts.map((client) => <span key={client.id} className="flex items-center gap-1.5 rounded-full border border-[#ECE9E3] py-0.5 pl-0.5 pr-2.5 text-[12px] font-semibold"><ClientMark client={client} size={20} />{client.name}</span>)}
                      {accounts.length === 0 && <span className="text-[12px] text-[#8B867E]">{canBeAssigned(item) ? "Free to take a client" : "Not assignable yet: NDA or contract missing"}</span>}
                    </span>
                    <span className="flex w-28 items-center gap-2 text-[12px] font-semibold text-[#55514B]"><Bar value={(accounts.length / Math.max(1, item.capacity)) * 100} color={accounts.length >= item.capacity ? tone.amber.dot : "#2F6FDB"} />{accounts.length}/{item.capacity}</span>
                  </button>
                );
              })}
              {state.clients.filter((client) => !client.freelancerId).map((client) => (
                <button key={client.id} onClick={() => go({ view: "client", clientId: client.id })} className="flex w-full items-center gap-3 bg-[#FDF6F6] px-4 py-3 text-left text-[13px] font-semibold text-[#B83232]">
                  <ClientMark client={client} size={28} />{client.name} has no freelancer
                  <ArrowRight size={14} className="ml-auto" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}
