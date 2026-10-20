"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, ExternalLink, MessageSquareWarning, ShieldCheck, X } from "lucide-react";
import { useStore } from "@/lib/works/store";
import { shortDate } from "@/lib/works/logic";
import type { RevisionCategory } from "@/lib/works/types";
import { PostPreviewPanel } from "./PostView";
import { Button, Chip, ClientMark, fieldClass } from "./kit";

const categories: RevisionCategory[] = ["Copy", "Layout", "Brand", "Factual"];

/** Review the posts waiting on you one at a time: see it as it will appear, approve it or ask for changes, and move on. */
export function ReviewMode({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { state, go, approvePost, requestChanges, updatePost } = useStore();
  const [index, setIndex] = useState(0);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<RevisionCategory>("Copy");
  const [handled, setHandled] = useState(0);

  const post = state.posts.find((item) => item.id === ids[index]);
  const client = post ? state.clients.find((item) => item.id === post.clientId) : undefined;
  const next = () => { setAsking(false); setNote(""); setIndex((value) => value + 1); };

  return createPortal(
    <div className="fixed inset-0 z-[65] overflow-y-auto bg-[#F6F5F2]" role="dialog" aria-modal="true" aria-label="Review posts">
      <div className="mx-auto max-w-[1000px] px-4 py-5 sm:px-6">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={onClose} aria-label="Close review" className="rounded-xl p-2 text-[#55514B] hover:bg-white"><X size={20} /></button>
          <h2 className="text-[18px] font-extrabold">Review</h2>
          <div className="ml-auto flex items-center gap-2 text-[13px] font-semibold text-[#55514B]">
            {post ? `${index + 1} of ${ids.length}` : "Done"}
            <span className="flex gap-1">{ids.map((id, position) => <span key={id} className={`h-1.5 w-6 rounded-full ${position < index ? "bg-[#1D9E5A]" : position === index ? "bg-[#2F6FDB]" : "bg-[#DDD9D1]"}`} />)}</span>
          </div>
        </div>

        {!post || !client ? (
          <div className="mx-auto mt-16 max-w-md rounded-3xl border border-[#E9E6E0] bg-white p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#E6F5EC] text-[#17804A]"><Check size={28} /></div>
            <h3 className="mt-4 text-[20px] font-extrabold">All reviewed</h3>
            <p className="mt-1 text-[14px] text-[#6B6760]">{handled} of {ids.length} handled. Anything you skipped is still waiting in Needs me.</p>
            <Button kind="primary" className="mt-5" onClick={onClose}>Back to posts</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <ClientMark client={client} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-extrabold">{post.title}</div>
                <div className="text-[13px] text-[#6B6760]">{client.name} · {post.format} · goes out {shortDate(post.date)}</div>
              </div>
              <Chip t="amber">{post.status === "Copy review" ? "Check the words" : "Check the design"}</Chip>
              <button onClick={() => { onClose(); go({ view: "marketing", clientId: "all", postId: post.id }); }} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1F5BC4]">Open full post <ExternalLink size={13} /></button>
            </div>

            <PostPreviewPanel post={post} client={client} canEdit={false} onEdit={() => undefined} />

            {post.comments.some((comment) => comment.kind === "change" && !comment.resolved) && (
              <p className="rounded-xl bg-[#FFF3D9] px-4 py-3 text-[13px] text-[#6B4A06]">This is a revised version. Open the full post to see what was asked for.</p>
            )}

            {post.needsExpert && post.status === "Design review" && (
              <label className={`flex items-start gap-2 rounded-xl p-3 text-[13px] ${post.expertOk ? "bg-[#E7F6EE]" : "bg-[#F1ECFC]"}`}>
                <input type="checkbox" checked={post.expertOk} onChange={(event) => updatePost(post.id, { expertOk: event.target.checked })} className="mt-0.5 h-4 w-4" />
                <span><b className="inline-flex items-center gap-1"><ShieldCheck size={14} />Technical post.</b> The client's engineer has confirmed it is correct.</span>
              </label>
            )}

            {asking && (
              <div className="space-y-2 rounded-2xl border border-[#E9E6E0] bg-white p-4">
                <div className="flex flex-wrap gap-1.5">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} aria-pressed={category === item} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${category === item ? "bg-[#1E2430] text-white" : "bg-[#F1F0ED] text-[#6B6760]"}`}>{item}</button>)}</div>
                <textarea autoFocus value={note} onChange={(event) => setNote(event.target.value)} rows={3} aria-label="What to change" placeholder="What should change? Be specific so the freelancer can tick it off." className={fieldClass} />
              </div>
            )}

            <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-[#E9E6E0] bg-[#F6F5F2]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
              {asking ? (
                <>
                  <Button kind="warn" disabled={!note.trim()} onClick={() => { requestChanges(post.id, note.trim(), category); setHandled((value) => value + 1); next(); }}><MessageSquareWarning size={15} />Send changes</Button>
                  <Button kind="ghost" onClick={() => setAsking(false)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button kind="good" disabled={post.status === "Design review" && post.needsExpert && !post.expertOk} onClick={() => { approvePost(post.id); setHandled((value) => value + 1); next(); }}><Check size={15} />Approve {post.status === "Copy review" ? "copy" : "design"}</Button>
                  <Button onClick={() => setAsking(true)}><MessageSquareWarning size={15} />Ask for changes</Button>
                  <Button kind="ghost" className="ml-auto" onClick={next}>Skip <ArrowRight size={14} /></Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
