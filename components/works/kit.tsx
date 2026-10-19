"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Client } from "@/lib/works/types";

export const asset = (path: string) => (path.startsWith("/") ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}` : path);

export const tone = {
  green: { bg: "#E7F6EE", ink: "#17804A", dot: "#1D9E5A" },
  amber: { bg: "#FFF3D9", ink: "#94600A", dot: "#E0A325" },
  red: { bg: "#FDECEC", ink: "#B83232", dot: "#D64545" },
  blue: { bg: "#EAF1FD", ink: "#1F5BC4", dot: "#2F6FDB" },
  purple: { bg: "#F1ECFC", ink: "#6343C4", dot: "#7C5CD6" },
  grey: { bg: "#F1F0ED", ink: "#5E5A54", dot: "#A8A39B" },
} as const;
export type Tone = keyof typeof tone;

export function Chip({ children, t = "grey", dot = false, className = "" }: { children: ReactNode; t?: Tone; dot?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${className}`} style={{ background: tone[t].bg, color: tone[t].ink }}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone[t].dot }} />}
      {children}
    </span>
  );
}

export function Light({ light, size = 10 }: { light: "green" | "amber" | "red"; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ height: size, width: size, background: tone[light].dot, boxShadow: `0 0 0 3px ${tone[light].bg}` }} />;
}

export function Avatar({ name, color = "#5A6B7D", size = 28 }: { name: string; color?: string; size?: number }) {
  return (
    <span title={name} className="grid shrink-0 place-items-center rounded-full font-bold text-white" style={{ height: size, width: size, background: color, fontSize: Math.max(10, size * 0.4) }}>
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

export function ClientMark({ client, size = 36 }: { client: Pick<Client, "name" | "color" | "logo">; size?: number }) {
  if (client.logo)
    return (
      <span className="grid shrink-0 place-items-center overflow-hidden rounded-xl border border-[#ECE9E3] bg-white" style={{ height: size, width: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset(client.logo)} alt="" className="h-full w-full object-contain p-0.5" />
      </span>
    );
  return (
    <span className="grid shrink-0 place-items-center rounded-xl font-bold text-white" style={{ height: size, width: size, background: client.color, fontSize: size * 0.42 }}>
      {client.name[0]}
    </span>
  );
}

export function Bar({ value, color = "#2F6FDB", height = 6, track = "#EEECE7" }: { value: number; color?: string; height?: number; track?: string }) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height, background: track }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(value > 0 ? 3 : 0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

export function Ring({ value, size = 44, color = "#2F6FDB", children }: { value: number; size?: number; color?: string; children?: ReactNode }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ height: size, width: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEECE7" strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, value) / 100)} />
      </svg>
      <span className="absolute text-[11px] font-bold">{children ?? `${value}%`}</span>
    </span>
  );
}

export function Card({ children, className = "", pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <section className={`min-w-0 rounded-2xl border border-[#E9E6E0] bg-white ${pad ? "p-5" : ""} ${className}`}>{children}</section>;
}

export function CardHead({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-[16px] font-bold text-[#1E2430]">{title}</h3>
        {sub && <p className="mt-0.5 text-[13px] text-[#6B6760]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "secondary" | "ghost" | "good" | "warn" | "danger"; size?: "sm" | "md" };
export function Button({ kind = "secondary", size = "md", className = "", ...props }: ButtonProps) {
  const kinds = {
    primary: "bg-[#1E2430] text-white hover:bg-[#2E3542]",
    secondary: "bg-white text-[#1E2430] border border-[#E2DED7] hover:border-[#C9C3B8]",
    ghost: "text-[#3D4450] hover:bg-[#F1F0ED]",
    good: "bg-[#1D9E5A] text-white hover:bg-[#17804A]",
    warn: "bg-[#E8862A] text-white hover:bg-[#CF741C]",
    danger: "bg-white text-[#B83232] border border-[#F2CFCF] hover:bg-[#FDECEC]",
  };
  const sizes = { sm: "px-3 py-1.5 text-[12px]", md: "px-4 py-2.5 text-[13px]" };
  return <button {...props} className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${kinds[kind]} ${sizes[size]} ${className}`} />;
}

export const fieldClass = "mt-1 w-full rounded-xl border border-[#E2DED7] bg-white px-3 py-2.5 text-[14px] text-[#1E2430] outline-none focus:border-[#2F6FDB]";
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-[12px] font-semibold text-[#55514B]">
      {label}
      {children}
      {hint && <span className="mt-1 block text-[11px] font-normal text-[#8B867E]">{hint}</span>}
    </label>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DCD8D0] bg-[#FBFAF8] px-6 py-8 text-center">
      <div className="text-[14px] font-bold text-[#1E2430]">{title}</div>
      {children && <div className="mx-auto mt-1 max-w-md text-[13px] text-[#6B6760]">{children}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = "md" }: { value: T; options: { value: T; label: ReactNode; count?: number }[]; onChange: (value: T) => void; size?: "sm" | "md" }) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#F1F0ED] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`shrink-0 rounded-lg font-semibold transition ${size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-2 text-[13px]"} ${value === option.value ? "bg-white text-[#1E2430] shadow-sm" : "text-[#6B6760] hover:text-[#1E2430]"}`}
        >
          {option.label}
          {option.count !== undefined && <span className={`ml-1.5 ${value === option.value ? "text-[#2F6FDB]" : "opacity-60"}`}>{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ steps, current, done = false }: { steps: string[]; current: number; done?: boolean }) {
  return (
    <ol className="flex items-center gap-1">
      {steps.map((step, index) => {
        const state = done || index < current ? "done" : index === current ? "now" : "next";
        return (
          <li key={step} className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="h-1.5 rounded-full" style={{ background: state === "done" ? "#1D9E5A" : state === "now" ? "#2F6FDB" : "#E7E4DE" }} />
            <span className={`truncate text-[11px] font-semibold ${state === "now" ? "text-[#1F5BC4]" : state === "done" ? "text-[#17804A]" : "text-[#9A958D]"}`}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
