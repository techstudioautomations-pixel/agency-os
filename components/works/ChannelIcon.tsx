"use client";

import { useId } from "react";
import { Mail } from "lucide-react";

/** The logo of a platform, drawn in its own colours, so a channel can be recognised at a glance. */
export function ChannelIcon({ name, size = 22, className = "" }: { name: string; size?: number; className?: string }) {
  const id = useId();
  const box = { width: size, height: size, viewBox: "0 0 24 24", className: `shrink-0 ${className}`, "aria-hidden": true } as const;
  switch (name) {
    case "LinkedIn":
      return (
        <svg {...box}>
          <rect width="24" height="24" rx="5" fill="#0A66C2" />
          <circle cx="7.2" cy="7.4" r="1.7" fill="#fff" />
          <rect x="5.7" y="10.2" width="3" height="8.3" rx=".4" fill="#fff" />
          <path d="M11 10.2h2.9v1.2c.5-.9 1.5-1.4 2.8-1.4 2.4 0 3.3 1.5 3.3 3.8v4.7h-3v-4.2c0-1-.3-1.7-1.3-1.7-1.1 0-1.7.8-1.7 1.8v4.1H11z" fill="#fff" />
        </svg>
      );
    case "Instagram":
      return (
        <svg {...box}>
          <defs><linearGradient id={`${id}-ig`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#FEDA75" /><stop offset=".35" stopColor="#FA7E1E" /><stop offset=".62" stopColor="#D62976" /><stop offset="1" stopColor="#4F5BD5" /></linearGradient></defs>
          <rect width="24" height="24" rx="6" fill={`url(#${id}-ig)`} />
          <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.7" />
          <circle cx="16.2" cy="7.8" r="1" fill="#fff" />
        </svg>
      );
    case "Facebook":
      return (
        <svg {...box}>
          <circle cx="12" cy="12" r="12" fill="#1877F2" />
          <path d="M13.2 20v-6.3h2.1l.4-2.6h-2.5V9.5c0-.8.3-1.3 1.4-1.3h1.2V5.9c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v2h-2.1v2.6h2.1V20z" fill="#fff" />
        </svg>
      );
    case "TikTok":
      return (
        <svg {...box}>
          <rect width="24" height="24" rx="6" fill="#111" />
          <path d="M15.5 5.5c.3 1.5 1.3 2.5 2.7 2.7v2.2c-1-.1-1.9-.4-2.7-.9v4.6c0 2.6-2 4.4-4.4 4.4-2.4 0-4.2-1.8-4.2-4.2 0-2.6 2.2-4.5 4.7-4.1v2.3c-1.2-.4-2.4.4-2.4 1.8 0 1.1.9 2 2 2 1.2 0 2.1-.9 2.1-2.2V5.5z" fill="#fff" />
        </svg>
      );
    case "X":
      return (
        <svg {...box}>
          <rect width="24" height="24" rx="6" fill="#111" />
          <path d="M6.2 6h3.3l2.7 3.6L15.4 6h1.9l-4.2 4.9 4.8 7.1h-3.3l-3-4-3.5 4H6.2l4.6-5.3z" fill="#fff" />
        </svg>
      );
    case "YouTube":
      return (
        <svg {...box}>
          <rect width="24" height="24" rx="6" fill="#E62117" />
          <path d="M10 8.6v6.8l5.8-3.4z" fill="#fff" />
        </svg>
      );
    case "Newsletter":
      return <span className={`inline-grid shrink-0 place-items-center rounded-[6px] bg-[#0F8F8F] text-white ${className}`} style={{ width: size, height: size }}><Mail size={Math.round(size * 0.62)} /></span>;
    default:
      return <span className={`inline-grid shrink-0 place-items-center rounded-[6px] bg-[#55514B] text-[10px] font-bold text-white ${className}`} style={{ width: size, height: size }}>{name.slice(0, 1)}</span>;
  }
}
