"use client";

import { useEffect, useState } from "react";
import { availabilityNow, timezoneOptions, timezoneLabel } from "@/lib/works/logic";
import { useStore } from "@/lib/works/store";
import type { Freelancer } from "@/lib/works/types";

/** Re-reads the clock every minute, so the circles stay true while a page is left open. */
function useMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  return now;
}

/** A small circle: green when it is inside their working hours where they are, red when it is not, grey when no time zone is set. */
export function AvailabilityDot({ person, label = false, size = 10 }: { person: Pick<Freelancer, "timezone" | "hours">; label?: boolean; size?: number }) {
  const now = useMinute();
  const info = availabilityNow(person, now);
  const color = info.state === "on" ? "#1D9E5A" : info.state === "off" ? "#D64545" : "#C9C3B8";
  return (
    <span className="inline-flex items-center gap-1.5" title={info.text}>
      <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color, boxShadow: `0 0 0 3px ${color}22` }} />
      {label && <span className="text-[12px] font-semibold text-[#55514B]">{info.text}</span>}
    </span>
  );
}

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Where they are and when they work, so everyone can see if it is a good time to write. */
export function HoursEditor({ person, expert = false }: { person: Pick<Freelancer, "id" | "timezone" | "hours">; expert?: boolean }) {
  const store = useStore();
  const updateFreelancer = (id: string, patch: Partial<Pick<Freelancer, "timezone" | "hours">>) => (expert ? store.updateExpert(id, patch) : store.updateFreelancer(id, patch));
  const now = useMinute();
  const set = (patch: Partial<Freelancer["hours"]>) => updateFreelancer(person.id, { hours: { ...person.hours, ...patch } });
  const zones = timezoneOptions.includes(person.timezone) || !person.timezone ? timezoneOptions : [person.timezone, ...timezoneOptions];
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <select value={person.timezone} onChange={(event) => updateFreelancer(person.id, { timezone: event.target.value })} aria-label="Time zone" className="min-w-[220px] flex-1 rounded-xl border border-[#E2DED7] bg-white px-3 py-2 text-[13px] font-semibold">
          <option value="">Time zone not set</option>
          {zones.map((zone) => <option key={zone} value={zone}>{timezoneLabel(zone, now)}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#55514B]">From<input type="time" value={person.hours.from} onChange={(event) => set({ from: event.target.value })} aria-label="Starts work at" className="rounded-xl border border-[#E2DED7] bg-white px-2 py-1.5 text-[13px]" /></label>
        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#55514B]">to<input type="time" value={person.hours.to} onChange={(event) => set({ to: event.target.value })} aria-label="Stops work at" className="rounded-xl border border-[#E2DED7] bg-white px-2 py-1.5 text-[13px]" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Days they work">
        {dayNames.map((name, index) => {
          const day = index + 1;
          const on = person.hours.days.includes(day);
          return <button key={name} type="button" onClick={() => set({ days: on ? person.hours.days.filter((value) => value !== day) : [...person.hours.days, day].sort() })} aria-pressed={on} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${on ? "bg-[#1E2430] text-white" : "bg-[#F1F0ED] text-[#55514B]"}`}>{name}</button>;
        })}
        <span className="ml-auto"><AvailabilityDot person={person} label /></span>
      </div>
    </div>
  );
}
