"use client";

import { money } from "@/lib/works/logic";
import type { Freelancer } from "@/lib/works/types";

export const platforms = ["Fiverr", "Upwork", "Direct", "Other"];
const platformColor: Record<string, string> = { Fiverr: "#1DBF73", Upwork: "#14A800", Direct: "#2F6FDB", Other: "#8B867E" };

export const statusChip = (status: Freelancer["status"]) =>
  status === "Active" ? { t: "green" as const, label: "Active" }
  : status === "Trial" ? { t: "blue" as const, label: "Trial" }
  : status === "Paused" ? { t: "amber" as const, label: "Paused" }
  : status === "Offboarded" ? { t: "amber" as const, label: "Past" }
  : { t: "grey" as const, label: "Not hired" };

export const jobsTotal = (person: Freelancer) => person.jobs.reduce((sum, job) => sum + (Number(job.amount) || 0), 0);

export const formatServices = (list: { name: string; price: string; currency: string }[]) => list.map((item) => `${item.name} | ${item.price} | ${item.currency}`).join("\n");
/** "$45" as it was typed, or "€45" when it was entered as an amount and a currency. */
export const priceOf = (item: { price: string; currency: string }) => (item.currency && /^\d+(\.\d+)?$/.test(item.price) ? money(Number(item.price), item.currency) : item.price);

export function PlatformTag({ name }: { name: string }) {
  if (!name) return null;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F0ED] px-2.5 py-0.5 text-[12px] font-bold text-[#3D4450]"><span className="h-2 w-2 rounded-full" style={{ background: platformColor[name] ?? platformColor.Other }} />{name}</span>;
}
