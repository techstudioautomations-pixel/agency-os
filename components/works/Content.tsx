"use client";

import { useState } from "react";
import { useStore } from "@/lib/works/store";
import { monthName, turnOf } from "@/lib/works/logic";
import { Shell } from "./Shell";
import { PostCard } from "./Marketing";
import { Empty, Segmented } from "./kit";

/** Every post this month, grouped by who has to act next. */
export function Content() {
  const { state } = useStore();
  const [view, setView] = useState<"me" | "freelancers" | "reviewers" | "client" | "all">("me");
  const posts = state.posts.filter((post) => post.date.startsWith(state.month)).sort((a, b) => a.date.localeCompare(b.date));
  const withTurn = posts.map((post) => ({ post, turn: turnOf(state, post) }));
  const groups = {
    me: withTurn.filter(({ turn }) => turn.who === state.me),
    freelancers: withTurn.filter(({ turn }) => turn.tone === "freelancer" && turn.who !== state.me),
    reviewers: withTurn.filter(({ turn }) => turn.tone === "review" && turn.who !== state.me),
    client: withTurn.filter(({ turn }) => turn.tone === "client"),
    all: withTurn,
  };
  const shown = groups[view];
  const byClient = state.clients.map((client) => ({ client, items: shown.filter(({ post }) => post.clientId === client.id) })).filter((group) => group.items.length);

  return (
    <Shell title="Content approvals" sub={`${monthName(state.month)} · every post across all clients, grouped by who acts next.`}>
      <div className="mb-5">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "me", label: "Waiting on me", count: groups.me.length },
            { value: "reviewers", label: "With reviewers", count: groups.reviewers.length },
            { value: "freelancers", label: "With freelancers", count: groups.freelancers.length },
            { value: "client", label: "With clients", count: groups.client.length },
            { value: "all", label: "All this month", count: groups.all.length },
          ]}
        />
      </div>
      {byClient.length === 0 && <Empty title={view === "me" ? "Nothing waiting on you" : "Nothing in this view"}>{view === "me" ? "When a freelancer submits copy or design, it appears here." : ""}</Empty>}
      <div className="space-y-6">
        {byClient.map(({ client, items }) => (
          <section key={client.id}>
            <h3 className="mb-2.5 flex items-center gap-2 text-[15px] font-bold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: client.color }} />{client.name}<span className="text-[13px] font-semibold text-[#8B867E]">{items.length}</span></h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {items.map(({ post }) => <PostCard key={post.id} post={post} />)}
            </div>
          </section>
        ))}
      </div>
    </Shell>
  );
}
