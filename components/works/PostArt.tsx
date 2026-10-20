"use client";

import { Play } from "lucide-react";
import type { Client, Post } from "@/lib/works/types";
import { asset } from "./kit";

const hash = (value: string) => [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);

/** Darken or lighten a hex colour. amount from -1 to 1. */
function shade(hex: string, amount: number) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
  const mixed = channels.map((channel) => Math.round(amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function Logo({ client, dark }: { client: Pick<Client, "name" | "logo" | "color">; dark?: boolean }) {
  return client.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={asset(client.logo)} alt="" className="h-[9cqw] max-w-[34cqw] rounded-[1.5cqw] bg-white object-contain p-[0.8cqw]" />
  ) : (
    <span className={`text-[4.2cqw] font-extrabold tracking-tight ${dark ? "text-white" : ""}`} style={dark ? undefined : { color: client.color }}>{client.name}</span>
  );
}

/**
 * The artwork for a post. Uploaded images win; otherwise a branded design is drawn
 * from the post's format, title and the client's colour, so every card shows a picture.
 */
export function PostArt({ post, client, className = "", rounded = "rounded-xl", index = 0 }: { post: Post; client: Pick<Client, "name" | "logo" | "color">; className?: string; rounded?: string; index?: number }) {
  const visuals = post.files.filter((file) => file.kind === "image" || file.kind === "video");
  const file = visuals[Math.min(index, Math.max(0, visuals.length - 1))];
  const ratio = file?.ratio;
  const base = `@container relative ${ratio ? "" : "aspect-[4/5]"} w-full overflow-hidden ${rounded} ${className}`;

  if (file) {
    return (
      <div className={`${base} bg-[#EFEDE8]`} style={ratio ? { aspectRatio: String(ratio) } : undefined}>
        {file.kind === "video" ? (
          <>
            <video src={asset(file.src)} muted playsInline loop autoPlay className="h-full w-full object-cover" />
            <span className="absolute bottom-[4cqw] left-[4cqw] grid h-[11cqw] w-[11cqw] place-items-center rounded-full bg-black/55 text-white"><Play className="h-[5cqw] w-[5cqw]" /></span>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset(file.src)} alt={post.title} className="h-full w-full object-cover" />
        )}
        {visuals.length > 1 && <span className="absolute right-[3cqw] top-[3cqw] rounded-full bg-black/60 px-[2.5cqw] py-[0.8cqw] text-[3.4cqw] font-bold text-white">1/{visuals.length}</span>}
      </div>
    );
  }

  const color = client.color;
  const variant = hash(post.id) % 3;
  const headline = post.art || post.title;
  const size = headline.length > 46 ? "text-[7.2cqw]" : headline.length > 28 ? "text-[8.6cqw]" : "text-[10.5cqw]";

  if ((post.format === "Reel" || post.format === "Video")) {
    return (
      <div className={base} style={{ background: `linear-gradient(160deg, ${shade(color, -0.55)}, ${shade(color, -0.2)})` }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `radial-gradient(circle at 80% 15%, ${shade(color, 0.4)} 0, transparent 45%)` }} />
        <div className="relative flex h-full flex-col justify-between p-[7cqw] text-white">
          <Logo client={client} dark />
          <span className="mx-auto grid h-[22cqw] w-[22cqw] place-items-center rounded-full border-[0.8cqw] border-white/70 bg-white/15"><Play className="ml-[1cqw] h-[10cqw] w-[10cqw]" fill="white" /></span>
          <div className={`${size} whitespace-pre-line font-extrabold leading-[1.05] tracking-tight`}>{headline}</div>
        </div>
      </div>
    );
  }

  if (post.format === "Text post") {
    return (
      <div className={`${base} bg-white`} style={{ boxShadow: `inset 0 0 0 1px ${shade(color, 0.75)}` }}>
        <div className="flex h-full flex-col justify-between p-[7cqw]">
          <div className="flex items-center gap-[2.5cqw]">
            <span className="grid h-[10cqw] w-[10cqw] place-items-center rounded-full text-[4.5cqw] font-extrabold text-white" style={{ background: color }}>{client.name[0]}</span>
            <span className="text-[4cqw] font-bold text-[#1E2430]">{client.name}</span>
          </div>
          <div>
            <div className="text-[16cqw] font-black leading-none" style={{ color: shade(color, 0.55) }}>“</div>
            <div className={`${size} -mt-[4cqw] font-extrabold leading-[1.1] tracking-tight text-[#1E2430]`}>{headline}</div>
          </div>
          <div className="h-[1.5cqw] w-[18cqw] rounded-full" style={{ background: color }} />
        </div>
      </div>
    );
  }

  if (post.format === "Carousel") {
    return (
      <div className={base} style={{ background: variant === 1 ? shade(color, 0.88) : color }}>
        <div className="absolute -right-[18cqw] -top-[18cqw] h-[62cqw] w-[62cqw] rounded-full" style={{ border: `9cqw solid ${variant === 1 ? shade(color, 0.6) : shade(color, 0.18)}` }} />
        <div className={`relative flex h-full flex-col justify-between p-[7cqw] ${variant === 1 ? "" : "text-white"}`}>
          <div className="flex items-start justify-between gap-[3cqw]">
            <span className="pt-[1cqw] text-[3.3cqw] font-extrabold uppercase tracking-[.16em]" style={{ color: variant === 1 ? color : shade(color, 0.65) }}>{client.name} • {post.format}</span>
            <Logo client={client} dark={variant !== 1} />
          </div>
          <div>
            <div className={`${size} whitespace-pre-line font-extrabold leading-[1.04] tracking-tight`} style={variant === 1 ? { color: shade(color, -0.35) } : undefined}>{headline}</div>
            <div className="mt-[5cqw] flex items-center gap-[1.5cqw]">
              {[0, 1, 2, 3, 4].map((dot) => <span key={dot} className="h-[1.6cqw] rounded-full" style={{ width: dot === 0 ? "7cqw" : "1.6cqw", background: variant === 1 ? (dot === 0 ? color : shade(color, 0.55)) : dot === 0 ? "#fff" : "rgba(255,255,255,.45)" }} />)}
              <span className="ml-auto text-[3.6cqw] font-bold opacity-80">Swipe →</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single image, newsletter and anything else
  return (
    <div className={`${base} bg-[#F7F5F1]`}>
      <div className="absolute inset-x-0 bottom-0 h-[42%]" style={{ background: `linear-gradient(135deg, ${color}, ${shade(color, -0.3)})` }} />
      <div className="absolute bottom-[30%] right-[7cqw] h-[26cqw] w-[26cqw] rounded-[5cqw] rotate-6" style={{ background: shade(color, 0.7) }} />
      <div className="relative flex h-full flex-col p-[7cqw]">
        <div className="flex items-start justify-between gap-[3cqw]">
          <span className="pt-[1cqw] text-[3.3cqw] font-extrabold uppercase tracking-[.16em]" style={{ color }}>{client.name} • {post.platforms[0] ?? "Post"}</span>
          <Logo client={client} />
        </div>
        <div className={`${size} mt-[7cqw] max-w-[88%] whitespace-pre-line font-extrabold leading-[1.05] tracking-tight text-[#1E2430]`}>{headline}</div>
        <div className="mt-auto text-[3.6cqw] font-bold uppercase tracking-[.12em] text-white/90">{post.format === "Newsletter" ? "Newsletter" : post.platforms[0] ?? ""}</div>
      </div>
    </div>
  );
}
