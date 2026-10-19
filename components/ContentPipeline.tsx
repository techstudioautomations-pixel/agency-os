"use client";

import { ArrowRight } from "lucide-react";
import type { IdeaRecord } from "@/components/IdeasWorkspace";

type PipelinePost = { status: string };
type Stage = "Strategy & profile" | "Ideas to review" | "Ready for production" | "In production" | "Internal review" | "Client approval" | "Approved" | "Scheduled" | "Published";
const stages: { label: Stage; owner: string; color: string }[] = [
  { label: "Strategy & profile", owner: "Operations", color: "#743CC5" },
  { label: "Ideas to review", owner: "Approver", color: "#E56B13" },
  { label: "Ready for production", owner: "Freelancer", color: "#F6CD33" },
  { label: "In production", owner: "Freelancer", color: "#1557B8" },
  { label: "Internal review", owner: "Internal approver", color: "#F05B4F" },
  { label: "Client approval", owner: "Client / agency", color: "#743CC5" },
  { label: "Approved", owner: "Freelancer / scheduler", color: "#258A44" },
  { label: "Scheduled", owner: "Publisher", color: "#28A9A1" },
  { label: "Published", owner: "Reporting", color: "#302E32" },
];
export function ContentPipeline({ ideas, posts, onStage }: { ideas: IdeaRecord[]; posts: PipelinePost[]; onStage: (stage: Stage) => void }) {
  const counts: Record<Stage, number> = {
    "Strategy & profile": 1,
    "Ideas to review": ideas.filter(idea => !idea.decision).length,
    "Ready for production": ideas.filter(idea => ["carousel", "text"].includes(idea.decision ?? "") && !idea.linkedPostTitle).length,
    "In production": posts.filter(post => ["Draft", "Planned", "In production", "Changes requested"].includes(post.status)).length,
    "Internal review": posts.filter(post => post.status === "Internal review").length,
    "Client approval": posts.filter(post => post.status === "Waiting approval").length,
    "Approved": posts.filter(post => post.status === "Approved").length,
    "Scheduled": posts.filter(post => post.status === "Scheduled").length,
    "Published": posts.filter(post => post.status === "Posted").length,
  };
  return <section className="mt-4 rounded-[22px] border border-[#EAE6DF] bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-[10px] font-extrabold uppercase tracking-wide text-[#1557B8]">CONTENT FLOW</div><h3 className="mt-1 text-[17px] font-extrabold">What moves next?</h3></div><p className="text-[10px] text-[#77716A]">Choose a stage to open its work.</p></div><div className="mt-4 flex gap-2 overflow-x-auto pb-2">{stages.map((stage, index) => <div key={stage.label} className="flex shrink-0 items-center gap-2"><button onClick={() => onStage(stage.label)} className="min-w-[155px] rounded-2xl border border-[#EAE6DF] bg-[#FAF8F4] p-3 text-left hover:border-[#1557B8] hover:bg-[#F2F6FD]"><div className="flex items-center justify-between"><span className="h-3 w-3 rounded-full" style={{ background: stage.color }}/><strong className="text-[22px] leading-none">{counts[stage.label]}</strong></div><div className="mt-2 text-[11px] font-extrabold">{stage.label}</div><div className="mt-1 text-[9px] text-[#77716A]">Next: {stage.owner}</div></button>{index < stages.length - 1 && <ArrowRight size={14} className="text-[#A9A39B]"/>}</div>)}</div></section>;
}
