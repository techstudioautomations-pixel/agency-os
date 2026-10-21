"use client";

import { useState, type ReactNode } from "react";
import { Bell, BookOpen, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, FileBarChart, Home, LayoutGrid, Menu, Send, Settings as SettingsIcon, Sparkles, Users, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { ago, everyone, isExpert, isHired, gate, isFreelancer, me, monthName, myClients, shiftMonth, turnOf } from "@/lib/works/logic";
import type { Freelancer, Route } from "@/lib/works/types";
import { Avatar, Chip, ClientMark, Light, asset } from "./kit";

type NavItem = { view: Route["view"]; label: string; icon: typeof Home; badge?: number; route?: Route };

export function Shell({ title, sub, actions, children }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const store = useStore();
  const { state, route, go } = store;
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [who, setWho] = useState(false);
  const person = me(state);
  const freelancer = isFreelancer(state);
  const contentWaiting = state.posts.filter((post) => turnOf(state, post).who === state.me).length;
  const notices = state.notices.filter((notice) => notice.to === state.me);
  const unread = notices.filter((notice) => !notice.read).length;

  const expert = isExpert(state);
  const nav: NavItem[] = expert
    ? [{ view: "today", label: "My checks", icon: Home }]
    : freelancer
    ? [
        { view: "today", label: "My work", icon: Home },
        { view: "marketing", label: "Marketing", icon: Sparkles, badge: contentWaiting },
        { view: "reports", label: "Monthly reports", icon: FileBarChart },
        ...(person.role === "owner" ? [{ view: "settings" as const, label: "Settings", icon: SettingsIcon }] : []),
      ]
    : [
        { view: "today", label: "Today", icon: Home },
        { view: "clients", label: "Clients", icon: LayoutGrid },
        { view: "marketing", label: "Marketing", icon: Sparkles, badge: contentWaiting },
        { view: "reports", label: "Monthly reports", icon: FileBarChart },
        ...(person.role === "owner" ? [{ view: "leads" as const, label: "Leads", icon: Send }] : []),
        { view: "freelancers", label: "Freelancers", icon: Users },
        ...(person.role === "owner" ? [{ view: "finance" as const, label: "Finance", icon: CircleDollarSign }] : []),
        { view: "how", label: "How we work", icon: BookOpen },
        ...(person.role === "owner" ? [{ view: "settings" as const, label: "Settings", icon: SettingsIcon }] : []),
      ];

  // A freelancer uses these now and then, so they sit just above their name instead of in the main list.
  const footer: NavItem[] = expert ? [{ view: "freelancers", label: "My profile", icon: Users, route: { view: "freelancers", freelancerId: state.me } }] : freelancer ? [{ view: "freelancers", label: "My profile", icon: Users, route: { view: "freelancers", freelancerId: state.me } }, { view: "how", label: "How we work", icon: BookOpen }] : [];
  const active = route.view === "client" ? "clients" : route.view;
  const clients = expert ? [] : myClients(state);

  return (
    <div className="min-h-screen bg-[#F6F5F2] text-[#1E2430]">
      {menu && <button aria-label="Close menu" onClick={() => setMenu(false)} className="fixed inset-0 z-40 bg-black/30 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[#E9E6E0] bg-white transition-transform lg:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
          <div className="leading-tight">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset("/the-works-logo.png")} alt="The Works" className="h-9 w-auto" />
            <div className="mt-0.5 text-[11px] font-semibold text-[#8B867E]">Agency OS</div>
          </div>
          <button onClick={() => setMenu(false)} aria-label="Close menu" className="ml-auto rounded-lg p-1.5 text-[#6B6760] lg:hidden"><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
          <div className="space-y-0.5">
            {nav.map(({ view, label, icon: Icon, badge, route: target }) => (
              <button
                key={view}
                onClick={() => { go(target ?? ({ view } as Route)); setMenu(false); }}
                aria-current={active === view ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold transition ${active === view ? "bg-[#EEF2FA] text-[#1F5BC4]" : "text-[#3D4450] hover:bg-[#F6F5F2]"}`}
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {!!badge && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#D64545] px-1.5 text-[11px] font-bold text-white">{badge}</span>}
              </button>
            ))}
          </div>
          <div className={`mt-6 px-3 pb-2 text-[11px] font-bold uppercase tracking-[.1em] text-[#9A958D] ${expert ? "hidden" : ""}`}>{freelancer ? "My clients" : "Clients"}</div>
          <div className="space-y-0.5">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => { go(freelancer ? { view: "marketing", clientId: client.id } : { view: "client", clientId: client.id }); setMenu(false); }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold ${(route.view === "client" || route.view === "marketing") && route.clientId === client.id ? "bg-[#F1F0ED]" : "text-[#55514B] hover:bg-[#F6F5F2]"}`}
              >
                <ClientMark client={client} size={24} />
                <span className="flex-1 truncate">{client.name}</span>
                {!freelancer && <Light light={gate(client.checklist).light} size={7} />}
              </button>
            ))}
          </div>
        </nav>
        {footer.length > 0 && (
          <div className="space-y-0.5 border-t border-[#E9E6E0] px-3 py-2">
            {footer.map(({ view, label, icon: Icon, route: target }) => (
              <button key={label} onClick={() => { go(target ?? ({ view } as Route)); setMenu(false); }} aria-current={active === view ? "page" : undefined} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-[13px] font-semibold transition ${active === view ? "bg-[#EEF2FA] text-[#1F5BC4]" : "text-[#6B6760] hover:bg-[#F6F5F2]"}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
        )}
        <div className="relative border-t border-[#E9E6E0] p-3">
          <button onClick={() => setWho(!who)} className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left hover:bg-[#F6F5F2]" aria-expanded={who}>
            <Avatar name={person.name} color={person.color} photo={person.photo} size={32} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-bold">{person.name}</span>
              <span className="block truncate text-[11px] text-[#8B867E]">{person.title}</span>
            </span>
            <ChevronDown size={15} className="text-[#8B867E]" />
          </button>
          {who && (
            <div className="absolute bottom-[68px] left-3 right-3 z-10 rounded-2xl border border-[#E9E6E0] bg-white p-2 shadow-xl">
              <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#9A958D]">View as</div>
              {everyone(state).filter((p) => !("status" in p) || (p.role === "expert" ? p.status === "Active" : isHired(p as Freelancer))).map((p) => (
                <button key={p.id} onClick={() => { store.setMe(p.id); setWho(false); go({ view: "today" }); }} className={`flex w-full items-center gap-2.5 rounded-xl p-2 text-left ${p.id === state.me ? "bg-[#EEF2FA]" : "hover:bg-[#F6F5F2]"}`}>
                  <Avatar name={p.name} color={p.color} photo={p.photo} size={26} />
                  <span className="flex-1 text-[13px] font-semibold">{p.name}</span>
                  <span className="text-[11px] text-[#8B867E]">{p.role === "owner" ? "Owner" : p.role === "ops" ? "Operations" : p.role === "expert" ? "Expert" : "Freelancer"}</span>
                </button>
              ))}
              <p className="px-2 pt-2 text-[11px] leading-snug text-[#8B867E]">Preview only. Real access will need a login.</p>
            </div>
          )}
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-[#E9E6E0] bg-[#F6F5F2]/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3 sm:px-8">
            <button onClick={() => setMenu(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-xl border border-[#E2DED7] bg-white lg:hidden"><Menu size={18} /></button>
            <div className="flex items-center gap-1 rounded-xl border border-[#E2DED7] bg-white p-1">
              <button onClick={() => store.setMonth(shiftMonth(state.month, -1))} aria-label="Previous month" className="rounded-lg p-1.5 hover:bg-[#F1F0ED]"><ChevronLeft size={16} /></button>
              <span className="min-w-[118px] text-center text-[13px] font-bold">{monthName(state.month)}</span>
              <button onClick={() => store.setMonth(shiftMonth(state.month, 1))} aria-label="Next month" className="rounded-lg p-1.5 hover:bg-[#F1F0ED]"><ChevronRight size={16} /></button>
            </div>
            <div className="flex-1" />
            <div className="relative">
              <button onClick={() => setBell(!bell)} aria-label={`Notifications, ${unread} unread`} aria-expanded={bell} className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#E2DED7] bg-white">
                <Bell size={17} />
                {unread > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#D64545] px-1 text-[11px] font-bold text-white">{unread}</span>}
              </button>
              {bell && (
                <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-32px))] rounded-2xl border border-[#E9E6E0] bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#F0EEE9] px-4 py-3">
                    <span className="text-[14px] font-bold">Notifications</span>
                    {unread > 0 && <button onClick={store.readAll} className="text-[12px] font-semibold text-[#1F5BC4]">Mark all read</button>}
                  </div>
                  <div className="max-h-[420px] overflow-y-auto p-2">
                    {notices.slice(0, 30).map((notice) => (
                      <button key={notice.id} onClick={() => { store.readNotice(notice.id); setBell(false); go(notice.link); }} className={`w-full rounded-xl p-3 text-left ${notice.read ? "hover:bg-[#F6F5F2]" : "bg-[#EEF2FA]"}`}>
                        <span className="block text-[13px] font-semibold leading-snug">{notice.text}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8B867E]">
                          {ago(notice.at)}
                          {notice.channels.map((channel) => <Chip key={channel} t={channel === "Email" ? "blue" : channel === "Google Chat" ? "purple" : "grey"} className="!px-2 !py-0.5 !text-[10px]">{channel}</Chip>)}
                        </span>
                      </button>
                    ))}
                    {notices.length === 0 && <p className="p-4 text-[13px] text-[#6B6760]">Nothing yet. Submissions, approvals and changes will appear here.</p>}
                  </div>
                  <p className="border-t border-[#F0EEE9] px-4 py-2.5 text-[11px] text-[#8B867E]">Preview: email and Google Chat sending switches on when the database is connected.</p>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1320px] px-4 pb-16 pt-6 sm:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[26px] font-extrabold leading-tight tracking-[-.02em] sm:text-[30px]">{title}</h1>
              {sub && <div className="mt-1 text-[14px] text-[#6B6760]">{sub}</div>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
      {store.toast && <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-[#1E2430] px-4 py-3 text-[13px] font-semibold text-white shadow-xl">{store.toast}</div>}
    </div>
  );
}
