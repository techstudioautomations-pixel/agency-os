import { monthName } from "./logic";
import type { Client, MonthReport, Post, RevisionCategory } from "./types";

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const para = (value: string) => (value.trim() ? esc(value).replace(/\n/g, "<br>") : '<span class="muted">To add.</span>');

export type MonthFacts = { published: number; agreed: number; revisions: Record<RevisionCategory, number>; posts: Post[] };

export function monthFacts(client: Client, month: string, posts: Post[]): MonthFacts {
  const list = posts.filter((post) => post.clientId === client.id && post.date.startsWith(month));
  const revisions = { Brand: 0, Copy: 0, Layout: 0, Factual: 0 } as Record<RevisionCategory, number>;
  list.forEach((post) => post.comments.forEach((comment) => { if (comment.kind === "change" && comment.category) revisions[comment.category] += 1; }));
  return { published: list.filter((post) => post.status === "Published").length, agreed: client.agreedPosts, revisions, posts: list };
}

/** Client-ready report. Essential: one page. Growth: adds recommendations and the post list. */
export function reportHtml(client: Client, report: MonthReport, facts: MonthFacts, full = false) {
  const n = report.numbers;
  const growth = full;
  const tile = (label: string, value: string, note = "") => `<div class="tile"><small>${esc(label)}</small><b>${esc(value || "—")}</b>${note ? `<span>${esc(note)}</span>` : ""}</div>`;
  const delivered = Math.max(facts.published, Number(n?.postsPublished) || 0);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(client.name)} · ${esc(monthName(report.month))}</title><style>
*{box-sizing:border-box}body{font:15px/1.55 Arial,Helvetica,sans-serif;color:#1e2430;margin:0;background:#fff}.page{max-width:800px;margin:0 auto;padding:40px 34px}
header{border-bottom:5px solid ${client.color};padding-bottom:18px}header small{letter-spacing:.14em;color:#6b7280;font-weight:700;font-size:11px}h1{font-size:30px;margin:6px 0 0}
h2{font-size:17px;margin:28px 0 8px;color:${client.color}}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px}.tile{background:#f5f5f2;border-radius:12px;padding:14px}
.tile small{display:block;color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:700}.tile b{display:block;font-size:24px;margin-top:4px}.tile span{font-size:12px;color:#6b7280}
.box{background:#f8f7f4;border-radius:12px;padding:14px 16px}.muted{color:#9ca3af}table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:8px 6px;border-bottom:1px solid #eee}th{font-size:11px;color:#6b7280;text-transform:uppercase}
footer{margin-top:34px;color:#9ca3af;font-size:12px;border-top:1px solid #eee;padding-top:12px}@media(max-width:640px){.grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body><div class="page"><header><small>${growth ? "MONTHLY REPORT" : "MONTHLY SNAPSHOT"}</small><h1>${esc(client.name)} · ${esc(monthName(report.month))}</h1></header>
<div class="grid">${tile("Posts delivered", `${delivered} / ${facts.agreed}`)}${tile("Followers", n?.followers ?? "", n?.followerChange ? `${n.followerChange} this month` : "")}${tile("Reach", n?.reach ?? "")}${tile("Engagement", n?.engagementRate ? `${n.engagementRate}%` : "")}</div>
<h2>Summary</h2><div class="box">${para(report.summary)}</div>
${Object.keys(report.byPlatform ?? {}).length > 1 ? `<h2>By platform</h2><table><tr><th>Platform</th><th>Followers</th><th>Change</th><th>Reach</th><th>Engagement</th></tr>${Object.entries(report.byPlatform ?? {}).map(([name, row]) => `<tr><td>${esc(name)}</td><td>${esc(row.followers || "—")}</td><td>${esc(row.followerChange || "—")}</td><td>${esc(row.reach || "—")}</td><td>${esc(row.engagementRate ? `${row.engagementRate}%` : "—")}</td></tr>`).join("")}</table>` : ""}
${n?.topPost ? `<h2>Best performing post</h2><div class="box">${esc(n.topPost)}</div>` : ""}
${growth ? `<h2>What we recommend next</h2><div class="box">${para(report.recommendations)}</div>` : ""}
${growth && facts.posts.length ? `<h2>The work this month</h2><table><tr><th>Post</th><th>Format</th><th>Date</th><th>Status</th></tr>${facts.posts.map((post) => `<tr><td>${esc(post.title)}</td><td>${esc(post.format)}</td><td>${esc(post.date)}</td><td>${esc(post.status)}</td></tr>`).join("")}</table>` : ""}
<footer>Prepared by The Works. Figures come from each platform's own analytics.</footer></div></body></html>`;
}
