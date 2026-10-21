import type { AreaKind, NewClientDraft, AssetType, MonthMark, MonthlyStep, Playbook, PlaybookStage, SectionStep, CheckItem, Client, ClientAsset, Freelancer, Idea, Lead, MonthReport, PackageDef, Person, Post, PostStatus, SectionDef, State, StepKind, Strategy } from "./types";

// ─── Dates are generated around today, so the demo always looks current ───
const pad = (value: number) => String(value).padStart(2, "0");
const localDate = () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/El_Salvador", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};
const today = localDate();
const now = new Date(`${today}T12:00:00Z`);
export const thisMonth = today.slice(0, 7);
const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
export const lastMonth = `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}`;
const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
const day = (value: number) => `${thisMonth}-${pad(Math.min(Math.max(1, value), daysInMonth))}`;
const ago = (days: number) => {
  const date = new Date(`${localDate()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
};
const ahead = (days: number) => ago(-days);

// ─── Checklist templates (the brief, section 3) ───
type Template = { group: string; label: string; hint?: string; soft?: boolean; detail?: boolean; owner: string };

export const clientChecklistTemplate: Template[] = [
  { group: "1 · The deal", label: "Package or services agreed", owner: "gareth" },
  { group: "1 · The deal", label: "Add-ons: extra newsletter, brand setup, other", soft: true, owner: "gareth" },
  { group: "1 · The deal", label: "Contract signed", owner: "gareth" },
  { group: "1 · The deal", label: "First invoice sent / paid", owner: "maria" },
  { group: "1 · The deal", label: "Billing contact", owner: "client" },
  { group: "1 · The deal", label: "Main contact and one named approver", owner: "client" },
  { group: "1 · The deal", label: "Where we talk: Google Chat or email", owner: "maria" },
  { group: "1 · The deal", label: "Approval route agreed", hint: "Default: we approve internally. Only if the client asks do they review the plan or posts.", owner: "maria" },

  { group: "2 · Questionnaire", label: "What the business does, services, typical projects", soft: true, owner: "client" },
  { group: "2 · Questionnaire", label: "Audience: who they want to reach and win", soft: true, owner: "client" },
  { group: "2 · Questionnaire", label: "Goals for social: credibility, recruitment, enquiries", soft: true, owner: "client" },
  { group: "2 · Questionnaire", label: "Competitors and accounts they admire", soft: true, owner: "client" },
  { group: "2 · Questionnaire", label: "Tone, and topics to avoid", soft: true, owner: "client" },
  { group: "2 · Questionnaire", label: "Do they need another service? Website, video, newsletter, photography, branding", soft: true, owner: "client" },
  { group: "2 · Questionnaire", label: "Brand presence: logo, guidelines, colours, fonts, photos, templates, own Canva", soft: true, owner: "client" },
  { group: "2 · Questionnaire", label: "Current platforms: which exist, which need creating", soft: true, owner: "client" },
  { group: "2 · Questionnaire", label: "Newsletter tool in use", soft: true, owner: "client" },
  { group: "2 · Questionnaire", label: "Claims that need client confirmation: technical, safety, named clients, testimonials", soft: true, owner: "client" },
  { group: "2 · Questionnaire", label: "Permission to use project photos and names", soft: true, owner: "client" },

  { group: "3 · Access", label: "LinkedIn page admin invite", hint: "Log who has access and when. Never store passwords here.", owner: "client" },
  { group: "3 · Access", label: "Meta Business / Facebook / Instagram access", owner: "client" },
  { group: "3 · Access", label: "Other platforms: TikTok, newsletter tool", soft: true, owner: "client" },
  { group: "3 · Access", label: "Publishing tool connected", owner: "niamh" },
  { group: "3 · Access", label: "Drive folder shared", owner: "niamh" },

  { group: "4 · Brand assets", label: "Logo files", owner: "client" },
  { group: "4 · Brand assets", label: "Guidelines, or flagged 'brand kit needed' (extra)", owner: "client" },
  { group: "4 · Brand assets", label: "Photo and footage folder, with a monthly top-up", owner: "client" },
  { group: "4 · Brand assets", label: "Reference accounts", soft: true, owner: "client" },

  { group: "5 · Baseline", label: "Followers, engagement and screenshots before any changes", owner: "freelancer" },

  { group: "6 · Our setup", label: "Client profile created", owner: "niamh" },
  { group: "6 · Our setup", label: "Drive folder, Google Chat space, publishing tool workspace, Canva folder and brand kit", owner: "niamh" },
  { group: "6 · Our setup", label: "Freelancer assigned", owner: "maria" },
  { group: "6 · Our setup", label: "Monthly dates set: capture by the 5th, scheduled by the 25th", owner: "niamh" },

  { group: "7 · Kick-off and first plan", label: "Kick-off call held", owner: "maria" },
  { group: "7 · Kick-off and first plan", label: "Audit done", owner: "freelancer" },
  { group: "7 · Kick-off and first plan", label: "First plan sent and approved", owner: "maria" },
  { group: "7 · Kick-off and first plan", label: "Launch posts approved", owner: "maria" },
  { group: "7 · Kick-off and first plan", label: "First calendar built", owner: "freelancer" },
];


// The starter pack every client gets before a freelancer starts: strategy brain, brand and creative direction guide,
// Canva templates and the handoff. Based on the Marker Group Brand Positioning & Creative Direction Guide.
export const packChecklistTemplate: Template[] = [
  // Strategy brain: the research done at the start
  { group: "Strategy brain · Research", label: "Business, services and typical projects researched", detail: true, owner: "maria" },
  { group: "Strategy brain · Research", label: "Audiences and buyer personas defined, with their pains", detail: true, owner: "maria" },
  { group: "Strategy brain · Research", label: "3–5 competitors and peers reviewed", detail: true, owner: "maria" },
  { group: "Strategy brain · Research", label: "Regulations and standards that matter, checked against official sources", detail: true, owner: "maria" },
  { group: "Strategy brain · Research", label: "Current social accounts audited, gaps listed", detail: true, owner: "freelancer" },
  { group: "Strategy brain · Research", label: "Content pillars proposed", detail: true, owner: "maria" },
  { group: "Strategy brain · Research", label: "Claims register: what we may and may not say", detail: true, owner: "maria" },
  { group: "Strategy brain · Research", label: "Questions for the client's expert listed", detail: true, owner: "maria" },
  { group: "Strategy brain · Sign-off", label: "Strategy brain document saved and linked", detail: true, owner: "maria" },
  { group: "Strategy brain · Sign-off", label: "Strategy brain approved", hint: "The brain is the research the freelancer builds ideas from.", owner: "maria" },

  // Brand positioning & creative direction guide: sections 1 to 6 of Garrett's template
  { group: "Brand guide · 1 Positioning & audience", label: "Working positioning statement (internal, not a public tagline)", detail: true, owner: "maria" },
  { group: "Brand guide · 1 Positioning & audience", label: "Audiences listed with their main concern and the message to lead with", detail: true, owner: "maria" },
  { group: "Brand guide · 1 Positioning & audience", label: "Message hierarchy set (what comes first, second, third)", detail: true, owner: "maria" },
  { group: "Brand guide · 1 Positioning & audience", label: "Brand personality and tone written", detail: true, owner: "maria" },
  { group: "Brand guide · 1 Positioning & audience", label: "Creative emphasis agreed (for example architectural, technical, people)", hint: "Visual emphasis, not a monthly quota.", detail: true, owner: "maria" },
  { group: "Brand guide · 2 Visual identity", label: "Approved visual treatments chosen", detail: true, owner: "maria" },
  { group: "Brand guide · 2 Visual identity", label: "Logo rules: original artwork, spacing, no recolouring", detail: true, owner: "freelancer" },
  { group: "Brand guide · 2 Visual identity", label: "Typefaces and exact colour values recorded", detail: true, owner: "freelancer" },
  { group: "Brand guide · 2 Visual identity", label: "Image policy: only real, approved projects, drawings and people", detail: true, owner: "maria" },
  { group: "Brand guide · 3 Social treatments", label: "Six creative studies produced (two for each treatment)", detail: true, owner: "freelancer" },
  { group: "Brand guide · 3 Social treatments", label: "Studies approved by the strategy lead", detail: true, owner: "maria" },
  { group: "Brand guide · 4 Freelancer rules", label: "Writing rules: lead with value, one clear claim, correct project and role", detail: true, owner: "maria" },
  { group: "Brand guide · 4 Freelancer rules", label: "Design rules: photography, whitespace, restrained accents, phone-size legibility", detail: true, owner: "maria" },
  { group: "Brand guide · 4 Freelancer rules", label: "Do and do-not list", detail: true, owner: "maria" },
  { group: "Brand guide · 4 Freelancer rules", label: "Practical examples of headlines", detail: true, owner: "maria" },
  { group: "Brand guide · 5 Quality & sign-off", label: "Quality checklist agreed for this client", detail: true, owner: "niamh" },
  { group: "Brand guide · 5 Quality & sign-off", label: "Responsibilities set: strategy lead, designer, coordinator, client's technical contact", detail: true, owner: "maria" },
  { group: "Brand guide · 5 Quality & sign-off", label: "Brand guide approved and shared", hint: "Creative direction every freelancer works from.", owner: "maria" },

  // Canva templates
  { group: "Canva templates · Setup", label: "Brand kit loaded in Canva: logo, fonts, colours", detail: true, owner: "freelancer" },
  { group: "Canva templates · Setup", label: "Client Canva folder created and shared", detail: true, owner: "niamh" },
  { group: "Canva templates · Masters", label: "P1 Project hero", hint: "Portrait 1080×1350 and square 1080×1080, each exported and checked.", detail: true, owner: "freelancer" },
  { group: "Canva templates · Masters", label: "P2 Project story", hint: "Portrait 1080×1350 and square 1080×1080, each exported and checked.", detail: true, owner: "freelancer" },
  { group: "Canva templates · Masters", label: "T1 Technical explainer", hint: "Portrait 1080×1350 and square 1080×1080, each exported and checked.", detail: true, owner: "freelancer" },
  { group: "Canva templates · Masters", label: "T2 Design consideration", hint: "Portrait 1080×1350 and square 1080×1080, each exported and checked.", detail: true, owner: "freelancer" },
  { group: "Canva templates · Masters", label: "E1 Expert perspective", hint: "Portrait 1080×1350 and square 1080×1080, each exported and checked.", detail: true, owner: "freelancer" },
  { group: "Canva templates · Masters", label: "E2 On-site expertise", hint: "Portrait 1080×1350 and square 1080×1080, each exported and checked.", detail: true, owner: "freelancer" },
  { group: "Canva templates · Masters", label: "K1 Knowledge carousel", hint: "Portrait 1080×1350 and square 1080×1080, each exported and checked.", detail: true, owner: "freelancer" },
  { group: "Canva templates · Masters", label: "K2 Engineering insight", hint: "Portrait 1080×1350 and square 1080×1080, each exported and checked.", detail: true, owner: "freelancer" },
  { group: "Canva templates · Masters", label: "N1 Announcement", hint: "Portrait 1080×1350 and square 1080×1080, each exported and checked.", detail: true, owner: "freelancer" },
  { group: "Canva templates · Masters", label: "N2 Achievement or event", hint: "Portrait 1080×1350 and square 1080×1080, each exported and checked.", detail: true, owner: "freelancer" },
  { group: "Canva templates · Masters", label: "Five-slide knowledge carousel populated as an example", detail: true, owner: "freelancer" },
  { group: "Canva templates · Masters", label: "Canva templates ready", hint: "All masters checked, saved by template ID.", owner: "maria" },

  // Handoff
  { group: "Freelancer handoff · The pack", label: "Strategy brain, brand guide and Canva folder linked on the client's page", detail: true, owner: "niamh" },
  { group: "Freelancer handoff · The pack", label: "Freelancer briefed on the pack", detail: true, owner: "maria" },
  { group: "Freelancer handoff · The pack", label: "Freelancer can pick a master, swap text and assets, export both sizes and pass the checklist without reinterpreting the strategy", detail: true, owner: "maria" },
  { group: "Freelancer handoff · The pack", label: "Pack handed to the freelancer", hint: "From here the freelancer builds ideas, posts and captions.", owner: "maria" },
];

/** The six checklist areas that are ticked off by hand. Group names place each step in an area. */
export const areaDefs = [
  { id: "onboarding", label: "Onboarding", color: "#2F6FDB", blurb: "The deal, the questionnaire and our setup.", groups: ["1 · The deal", "2 · Questionnaire", "5 · Baseline", "6 · Our setup"] },
  { id: "access", label: "Access", color: "#1D9E5A", blurb: "Who can get into which account.", groups: ["3 · Access"] },
  { id: "brain", label: "Strategy brain", color: "#7C5CD6", blurb: "The research the freelancer builds ideas from.", groups: ["Strategy brain · Research", "Strategy brain · Sign-off"] },
  { id: "brand", label: "Brand & creative guide", color: "#D6457A", blurb: "Positioning, visual identity, rules and quality sign-off.", groups: ["4 · Brand assets", "Brand guide · 1 Positioning & audience", "Brand guide · 2 Visual identity", "Brand guide · 3 Social treatments", "Brand guide · 4 Freelancer rules", "Brand guide · 5 Quality & sign-off"] },
  { id: "templates", label: "Canva templates", color: "#E08A1E", blurb: "Editable masters in portrait and square.", groups: ["Canva templates · Setup", "Canva templates · Masters"] },
  { id: "handoff", label: "Freelancer handoff", color: "#0F8F8F", blurb: "Kick-off, first plan and handing over the pack.", groups: ["7 · Kick-off and first plan", "Freelancer handoff · The pack"] },
] as const;

/** Everything a brand-new client starts with. */
export const newClientChecklist = (prefix: string, freelancerId?: string): CheckItem[] => [
  ...makeChecklist(clientChecklistTemplate, prefix, 0, [], freelancerId),
  ...makeChecklist(packChecklistTemplate, `${prefix}p`, 0, [], freelancerId),
];

/** Sample clients: the first `received` pack steps are done, in template order, and a few more are marked as asked. */
const withPack = (prefix: string, received: number, requested: number[] = [], freelancerId?: string) => makeChecklist(packChecklistTemplate, `${prefix}p`, received, requested, freelancerId);

export const freelancerChecklistTemplate: Template[] = [
  { group: "Profile", label: "Contact details, role and speciality", owner: "niamh" },
  { group: "Profile", label: "Rate, currency and payment method", owner: "maria" },
  { group: "Profile", label: "Capacity and availability", owner: "niamh" },
  { group: "Profile", label: "Service list", soft: true, owner: "niamh" },
  { group: "Profile", label: "Portfolio links", soft: true, owner: "niamh" },
  { group: "Trial", label: "Practical trial or sample done, with scorecard result", owner: "maria" },
  { group: "Paperwork", label: "NDA signed (date and link)", owner: "maria" },
  { group: "Paperwork", label: "Contract and payment terms signed", owner: "maria" },
  { group: "Tools", label: "Tool access: OS login, Google Chat, Drive folder, Canva seat, publishing tool role", owner: "niamh" },
  { group: "Tools", label: "Expectations and how-we-work briefing read", owner: "niamh" },
  { group: "Work", label: "Accounts assigned", owner: "maria" },
  { group: "Work", label: "Offboarding: access removed the same day", soft: true, owner: "niamh" },
];

/** Items a freelancer must have before they can be assigned to a client. */
export const freelancerGateLabels = ["NDA signed (date and link)", "Contract and payment terms signed"];

export function makeChecklist(template: Template[], prefix: string, received = 0, requested: number[] = [], freelancerId?: string): CheckItem[] {
  return template.map((item, index) => ({
    id: `${prefix}-${index + 1}`,
    group: item.group,
    label: item.label,
    hint: item.hint,
    soft: item.soft,
    detail: item.detail,
    owner: item.owner === "freelancer" ? freelancerId ?? "niamh" : item.owner,
    status: index < received ? "Received" : requested.includes(index) ? "Requested" : "Not asked",
    date: index < received ? ago(Math.max(1, Math.min(received, 40) - index)) : requested.includes(index) ? ago(4) : "",
    note: "",
  }));
}


/** Override individual items by the start of their label. */
function withStatus(list: CheckItem[], overrides: Record<string, CheckItem["status"]>): CheckItem[] {
  return list.map((item) => {
    const key = Object.keys(overrides).find((prefix) => item.label.startsWith(prefix));
    if (!key) return item;
    const status = overrides[key];
    return { ...item, status, date: status === "Not asked" ? "" : status === "Requested" ? ago(3) : item.date || ago(10) };
  });
}

// ─── What we sell: assets, packages and the default checklist sections. All of it is editable in Settings. ───
const uidPart = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const piecesPerMonth = (assets: ClientAsset[]) => assets.filter((asset) => asset.kind === "piece" && asset.period === "month").reduce((sum, asset) => sum + asset.qty, 0);

export const defaultAssets: AssetType[] = [
  { id: "company-post", name: "Company post", kind: "piece", format: "Single image", sections: ["brain", "brand", "templates"] },
  { id: "project-carousel", name: "Project carousel", kind: "piece", format: "Carousel", sections: ["brain", "brand", "templates"] },
  { id: "md-post", name: "Post written for your MD", kind: "piece", format: "Text post", sections: ["brain", "brand", "templates"] },
  { id: "short-video", name: "Short video edit", kind: "piece", format: "Video", sections: ["brain", "brand", "templates"] },
  { id: "explainer-video", name: "Explainer video", kind: "extra", format: "Video", sections: ["brain", "brand"] },
  { id: "newsletter", name: "Email newsletter", kind: "extra", format: "Newsletter", sections: ["newsletter"] },
  { id: "blog-post", name: "Blog post", kind: "extra", format: "Blog post", sections: ["brand"] },
  { id: "case-study", name: "Case study or capability sheet", kind: "extra", format: "Document", sections: ["brand"] },
  { id: "pdf-guide", name: "PDF guide", kind: "extra", format: "Document", sections: ["brand"] },
  { id: "flyer", name: "Flyer", kind: "extra", format: "Document", sections: ["brand", "templates"] },
  { id: "brochure", name: "Brochure", kind: "extra", format: "Document", sections: ["brand", "templates"] },
  { id: "promo-video", name: "Video", kind: "extra", format: "Video", sections: ["brain", "brand"] },
  { id: "reel", name: "Reel", kind: "extra", format: "Reel", sections: ["brain", "brand"] },
  { id: "ebook", name: "E-book", kind: "extra", format: "Document", sections: ["brain", "brand"] },
  { id: "lead-magnet", name: "Lead magnet", kind: "extra", format: "Document", sections: ["brain", "brand"] },
  { id: "exhibition", name: "Exhibition material", kind: "extra", format: "Document", sections: ["brand", "templates"] },
];

export const defaultPackages: PackageDef[] = [
  {
    id: "essential",
    name: "Essential",
    price: 795,
    tagline: "For smaller firms that need a consistent, professional marketing presence.",
    blurb: "Planned content, regular publishing and simple oversight.",
    items: [{ assetId: "company-post", qty: 8, period: "month" }, { assetId: "project-carousel", qty: 2, period: "month" }],
    includes: ["Quarterly marketing plan and review call", "Monthly content calendar for your approval", "One round of changes per monthly batch", "We monitor comments and messages and flag enquiries to you", "One-page monthly report", "Newsletter available as an add-on"],
    channels: "LinkedIn plus one more channel",
    fullReport: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: 1450,
    tagline: "For ambitious firms that want a dedicated partner planning and managing their marketing.",
    blurb: "Strategy, content, coordination, publishing and monthly accountability.",
    items: [
      { assetId: "company-post", qty: 7, period: "month" },
      { assetId: "short-video", qty: 1, period: "month" },
      { assetId: "project-carousel", qty: 3, period: "month" },
      { assetId: "md-post", qty: 4, period: "month" },
      { assetId: "newsletter", qty: 1, period: "month" },
      { assetId: "case-study", qty: 1, period: "quarter" },
    ],
    includes: ["Dedicated Marketing Lead", "Quarterly marketing plan and monthly review call", "Monthly content calendar for your approval", "Monthly performance report with recommendations", "We monitor comments and messages and flag enquiries to you"],
    channels: "LinkedIn plus up to two more channels",
    fullReport: true,
    recommended: true,
  },
];

const stepKind = (template: Template): StepKind => (template.soft ? "info" : template.detail ? "detail" : "key");
const areaIdForGroup = (group: string) => areaDefs.find((area) => (area.groups as readonly string[]).includes(group))?.id ?? "onboarding";

const newsletterSteps: { label: string; kind: StepKind; owner: string; group: string; hint?: string }[] = [
  { group: "Newsletter · Setup", label: "Newsletter tool and audience list access", kind: "key", owner: "client" },
  { group: "Newsletter · Setup", label: "Sender name, email and unsubscribe link set up, consent checked", kind: "detail", owner: "niamh", hint: "Check the client has permission to email each person on the list." },
  { group: "Newsletter · Setup", label: "Sections and regular topics agreed with the client", kind: "detail", owner: "maria" },
  { group: "Newsletter · Setup", label: "Newsletter template ready in the client's brand", kind: "key", owner: "freelancer" },
  { group: "Newsletter · First issue", label: "First issue planned and drafted", kind: "detail", owner: "freelancer" },
  { group: "Newsletter · First issue", label: "Test send checked on phone and desktop", kind: "detail", owner: "niamh" },
];

const websiteSteps: { label: string; kind: StepKind; owner: string; group: string; hint?: string }[] = [
  { group: "Website · Plan", label: "Brief and goals agreed in writing", kind: "key", owner: "maria" },
  { group: "Website · Plan", label: "Sitemap and pages agreed", kind: "key", owner: "maria" },
  { group: "Website · Plan", label: "Text, photos and logo collected from the client", kind: "key", owner: "client", hint: "The most common reason a website runs late." },
  { group: "Website · Build", label: "Design shown and approved by the client", kind: "key", owner: "freelancer" },
  { group: "Website · Build", label: "Built and working on a test site", kind: "detail", owner: "freelancer" },
  { group: "Website · Build", label: "Forms, speed, search basics and mobile checked", kind: "detail", owner: "niamh" },
  { group: "Website · Launch", label: "Domain, hosting and email ready", kind: "key", owner: "niamh" },
  { group: "Website · Launch", label: "Launch checklist signed off", kind: "key", owner: "maria" },
  { group: "Website · Launch", label: "Handover and short training done", kind: "detail", owner: "maria" },
  { group: "Website · Launch", label: "Care plan or updates agreed", kind: "info", owner: "maria" },
];

export const defaultMonthLine = (dates = { capture: 5, plan: 8, design: 15, approval: 20, schedule: 25 }): MonthMark[] => [
  { id: "m-capture", key: "capture", day: dates.capture, label: "Capture call", who: "Client + María", color: "#2F6FDB", note: "Talk to each client about what happened this month: projects, news, photos. Last month's reports go out." },
  { id: "m-plan", key: "plan", day: dates.plan, label: "Plan approved", who: "Reviewer → client", color: "#7C5CD6", note: "Ideas are decided and the plan is agreed, so the freelancer can start designs." },
  { id: "m-design", key: "design", day: dates.design, label: "Designs done", who: "Freelancer", color: "#E08A1E", note: "Freelancers finish copy and designs. Reviewers keep the review queue clear." },
  { id: "m-approval", key: "approval", day: dates.approval, label: "Client approval", who: "Operations logs it", color: "#E0567A", note: "Anything a client asked to see goes to them. Operations logs the answer." },
  { id: "m-schedule", key: "schedule", day: dates.schedule, label: "All scheduled", who: "Freelancer", color: "#1D9E5A", note: "Everything approved is scheduled in the publishing tool, with final files in the client's Drive." },
];

/** The client journey and the business areas, with the things each needs. A leading ★ means it is needed before the first new client. */
const stageDefs = (stages: [string, string, string, string, string, string[], boolean?][], group: string): PlaybookStage[] =>
  stages.map(([id, title, owner, color, icon, slots, forFreelancer]) => ({
    id, title, owner, color, icon, forFreelancer,
    slots: slots.map((slot, index) => ({ id: `${group}-${id}-${index + 1}`, title: slot.replace(/^★\s*/, ""), key: slot.startsWith("★"), attachments: [] })),
  }));

export const defaultPlaybook = (): Playbook => {
  const link = (stage: PlaybookStage[], stageId: string, slotTitle: string, title: string, url: string) => {
    const slot = stage.find((item) => item.id === stageId)?.slots.find((item) => item.title === slotTitle);
    slot?.attachments.push({ id: `${slot.id}-os`, kind: "resource", title, url, addedBy: "maria", addedAt: "" });
  };
  const workflow = stageDefs([
    ["sales", "Sales and leads", "Gareth", "#2F6FDB", "handshake", ["★ Sales and portfolio deck", "Services and pricing one-pager", "Marketing Snapshot (template and generator)", "Outreach message templates", "Lead to discovery call"]],
    ["deal", "Deal and agreement", "Gareth, María", "#1D9E5A", "file", ["★ Proposal and quote", "★ Contract", "Invoice (Revolut)", "Scope rules wording", "Client obligations list", "Terms and conditions", "Won deal to handover"]],
    ["discovery", "Discovery and questionnaire", "María, Operations", "#7C5CD6", "clipboard", ["★ Discovery call: what to ask and record", "★ Onboarding questionnaire (Tally)", "★ How to give us access guide (Instagram, LinkedIn, Meta, X, TikTok)", "Kick-off call agenda", "Phone photo guide for clients", "Questionnaire summary into the client profile"]],
    ["setup", "Access, assets and setup", "Operations", "#E08A1E", "key", ["★ Access: A) no accounts, create them / B) accounts exist, request and confirm", "★ Client setup: OS profile, Drive, scheduler, Canva, chat channel, assign freelancer", "Setup checklist in the OS", "Drive folder template", "Access register", "Missing access follow-up email"]],
    ["strategy", "Strategy and creative direction", "Gareth with AI, María", "#D6457A", "brain", ["★ Strategy (research prompt: pains, forums, channels, dates and events)", "★ Visual concepts (prompt for ChatGPT)", "★ Creative direction guide (generator and template)", "Reference library", "Approved visuals to Canva masters", "★ Strategy and creative direction (process)"]],
    ["ready", "Ready for production", "Operations", "#0F8F8F", "rocket", ["Production gate checklist", "Freelancer handover pack", "Handover to the freelancer"], true],
    ["delivery", "Monthly delivery", "Freelancer, María", "#E0567A", "calendar", ["★ Monthly content cycle", "★ Idea bank (generator)", "Idea document template", "Brief template", "Copy prompt per client", "Caption and platform adaptation prompt", "Per-post quality checklist", "Scheduling and publishing", "Freelancer month-end close"], true],
    ["reporting", "Reporting", "Operations, María", "#1E2430", "chart", ["★ Monthly client report", "Report templates", "Check, generate, approve, email"], true],
  ], "w");
  link(workflow, "setup", "Setup checklist in the OS", "Default checklists (Settings)", "#/settings/checklists");
  link(workflow, "ready", "Production gate checklist", "A client's checklists", "#/clients");
  link(workflow, "delivery", "Monthly content cycle", "Monthly checklists (Settings)", "#/settings/monthly");
  link(workflow, "delivery", "Per-post quality checklist", "Quality checklist on every post", "#/marketing/all/posts");
  link(workflow, "reporting", "Monthly client report", "Reports page", "#/reports");
  const areas = stageDefs([
    ["strategy", "Business strategy", "", "#1E2430", "target", ["Vision, goals, growth plan", "Monthly business summary", "Quarterly review"]],
    ["marketing", "Marketing and branding", "", "#D6457A", "megaphone", ["Works creative guide", "Website", "Founder video", "Agency post ideas", "Agency content, 2 posts a week"]],
    ["sales", "Sales and leads", "", "#2F6FDB", "handshake", ["Sales deck", "Marketing Snapshot template", "Outreach list", "Snapshot and proposal generators", "Lead to client"]],
    ["clients", "Client management", "", "#7C5CD6", "users", ["Questionnaire", "Access guide", "Welcome pack", "Questionnaire summary and missing access email", "Discovery, setup, communication and retention"]],
    ["delivery", "Service delivery", "", "#E0567A", "calendar", ["Guide template", "Prompts", "Quality gate", "Strategy, visuals, guide and idea bank generators", "Strategy and creative, monthly cycle"], true],
    ["ops", "Operations and quality", "", "#E08A1E", "shield", ["Workflow in the OS", "Revision categories", "Weekly ops summary", "Quality check and escalation"]],
    ["team", "Team and freelancers", "", "#0F8F8F", "user", ["Upwork and Fiverr posts", "Trial brief", "Scorecard", "NDA", "Contract", "Job post and trial brief generators", "Hiring and trial", "Onboarding with NDA", "Offboarding"]],
    ["finance", "Finance and accounting", "", "#1D9E5A", "coins", ["Tools", "Price list (Essential €795, Growth €1,450)", "Cost model", "Invoices and monthly close", "Billing", "Freelancer pay"]],
    ["reporting", "Reporting and analytics", "", "#2F6FDB", "chart", ["Report templates", "Founders' dashboard", "Client report and executive summary", "Month-end reporting"]],
    ["tech", "Technology and admin", "", "#55514B", "settings", ["OS", "Drive", "Chat", "Canva", "Scheduler", "Password manager", "IP agreement", "Tools, access and offboarding"]],
  ], "a");
  link(areas, "ops", "Workflow in the OS", "How we work (this page)", "#/how");
  link(areas, "ops", "Revision categories", "Quality checklist and revision labels", "#/marketing/all/posts");
  link(areas, "finance", "Price list (Essential €795, Growth €1,450)", "Packages (Settings)", "#/settings/packages");
  link(areas, "finance", "Invoices and monthly close", "Finance", "#/finance");
  link(areas, "reporting", "Month-end reporting", "Reports page", "#/reports");
  link(areas, "tech", "OS", "Settings", "#/settings");
  return { workflow, areas };
};

/** The monthly checklists. "{n}" is the number of posts promised that month, "{last}" is last month's name. */
export const defaultMonthly = (): MonthlyStep[] => [
  // Operations: first month
  { id: "o1", role: "ops", when: "first", label: "Kick-off call held" },
  { id: "o2", role: "ops", when: "first", label: "Client told what month 1 covers", hint: "Month 1 is set-up and strategy, plus a few posts. Full content starts the month after." },
  { id: "o3", role: "ops", when: "first", needs: "marketing", auto: "pack-ready", label: "Freelancer starter pack handed over" },
  { id: "o4", role: "ops", when: "first", needs: "marketing", auto: "ideas-decided", label: "First ideas decided" },
  { id: "o5", role: "ops", when: "first", needs: "marketing", auto: "posts-approved", label: "First {n} posts approved" },
  { id: "o6", role: "ops", when: "first", auto: "invoice-paid", label: "First invoice paid" },
  // Operations: every month after
  { id: "o10", role: "ops", when: "regular", needs: "marketing", auto: "ideas-decided", label: "Ideas for the month decided" },
  { id: "o11", role: "ops", when: "regular", needs: "client-review", auto: "plan-agreed", label: "Month plan agreed with the client" },
  { id: "o12", role: "ops", when: "regular", needs: "marketing", auto: "posts-approved", label: "All {n} posts approved" },
  { id: "o13", role: "ops", when: "regular", needs: "marketing", auto: "posts-scheduled", label: "All {n} posts scheduled" },
  { id: "o14", role: "ops", when: "regular", auto: "report-sent", label: "{last} report checked and sent" },
  { id: "o15", role: "ops", when: "regular", auto: "finance-sent", label: "{last} finance statement sent" },
  { id: "o16", role: "ops", when: "regular", auto: "invoice-paid", label: "Invoice paid" },
  { id: "o17", role: "ops", when: "regular", auto: "freelancer-paid", label: "Freelancer paid" },
  { id: "o18", role: "ops", when: "regular", label: "Monthly check-in with the client" },
  // Freelancer: first month
  { id: "f1", role: "freelancer", when: "first", needs: "marketing", label: "Starter pack read: brand guide, strategy brain, Canva templates" },
  { id: "f2", role: "freelancer", when: "first", needs: "marketing", label: "Questions sent to operations" },
  { id: "f3", role: "freelancer", when: "first", needs: "marketing", label: "Account audit done" },
  // Freelancer: every month after
  { id: "f10", role: "freelancer", when: "regular", needs: "marketing", auto: "ideas-uploaded", label: "Ideas uploaded" },
  { id: "f11", role: "freelancer", when: "regular", needs: "marketing", auto: "posts-started", label: "All {n} posts started" },
  { id: "f12", role: "freelancer", when: "regular", needs: "marketing", auto: "submitted", label: "All posts sent for review" },
  { id: "f13", role: "freelancer", when: "regular", needs: "marketing", label: "Final files in the client's Drive" },
  { id: "f14", role: "freelancer", when: "regular", needs: "marketing", auto: "posts-scheduled", label: "All posts scheduled in the publishing tool" },
  { id: "f15", role: "freelancer", when: "regular", needs: "newsletter", label: "Newsletter sent" },
  { id: "f16", role: "freelancer", when: "regular", needs: "marketing", auto: "report-in", label: "{last} results report uploaded" },
];

/** Steps in the shared sections that only make sense for marketing clients. */
const marketingOnlySteps = new Set([
  "Approval route agreed",
  "Goals for social: credibility, recruitment, enquiries",
  "Current platforms: which exist, which need creating",
  "Newsletter tool in use",
  "Claims that need client confirmation: technical, safety, named clients, testimonials",
  "Permission to use project photos and names",
  "Followers, engagement and screenshots before any changes",
  "Monthly dates set: capture by the 5th, scheduled by the 25th",
  "LinkedIn page admin invite",
  "Meta Business / Facebook / Instagram access",
  "Other platforms: TikTok, newsletter tool",
  "Publishing tool connected",
]);
const otherAccess: SectionStep[] = [
  { id: "access-web-1", group: "3 · Access", label: "Domain registrar and DNS access", kind: "key", owner: "client", areas: ["web"], hint: "Log who has access and when. Never store passwords here." },
  { id: "access-web-2", group: "3 · Access", label: "Hosting or website platform access", kind: "key", owner: "client", areas: ["web"] },
  { id: "access-web-3", group: "3 · Access", label: "Existing website and analytics access, if there is one", kind: "detail", owner: "client", areas: ["web"] },
  { id: "access-custom-1", group: "3 · Access", label: "Access to the accounts or files we need for this work", kind: "key", owner: "client", areas: ["custom"], hint: "Log who has access and when. Never store passwords here." },
];

export const defaultSections = (): SectionDef[] => {
  const all = [...clientChecklistTemplate, ...packChecklistTemplate];
  const built: SectionDef[] = areaDefs.map((area) => ({
    id: area.id,
    label: area.label,
    color: area.color,
    blurb: area.blurb,
    always: ["onboarding", "access", "handoff"].includes(area.id),
    areas: ["brain", "brand", "templates", "handoff"].includes(area.id) ? (["marketing"] as AreaKind[]) : undefined,
    steps: all.filter((template) => (area.groups as readonly string[]).includes(template.group)).map((template, index) => ({ id: `${area.id}-${index + 1}`, label: template.label, group: template.group, kind: stepKind(template), owner: template.owner, hint: template.hint })),
  }));
  for (const section of built) {
    section.steps = section.steps.map((step) => (marketingOnlySteps.has(step.label) ? { ...step, areas: ["marketing" as AreaKind] } : step));
    if (section.id === "access") section.steps.push(...otherAccess);
  }
  built.push({ id: "website", label: "Website project", color: "#2F6FDB", blurb: "From brief to launch and handover.", always: true, areas: ["web"], steps: websiteSteps.map((step, index) => ({ id: `website-${index + 1}`, ...step })) });
  built.push({ id: "newsletter", label: "Newsletter setup", color: "#0F8F8F", blurb: "Tool, template and first issue.", always: false, areas: ["marketing"], steps: newsletterSteps.map((step, index) => ({ id: `newsletter-${index + 1}`, ...step })) });
  return built;
};

/** Turns sections into the ticks a client starts with. Owners named "freelancer" become the client's freelancer. */
export function buildClientChecklist(sections: SectionDef[], prefix: string, freelancerId?: string, area: AreaKind = "marketing"): CheckItem[] {
  return sections.flatMap((section) =>
    section.steps.filter((step) => !step.areas || step.areas.includes(area)).map((step, index) => ({
      id: `${prefix}-${section.id}-${index + 1}`,
      group: step.group,
      area: section.id,
      label: step.label,
      hint: step.hint,
      soft: step.kind === "info",
      detail: step.kind === "detail",
      owner: step.owner === "freelancer" ? freelancerId ?? "niamh" : step.owner,
      status: "Not asked" as const,
      date: "",
      note: "",
    })),
  );
}

export function packageAssets(pkg: PackageDef, assets: AssetType[] = defaultAssets, prefix = uidPart(pkg.id)): ClientAsset[] {
  return pkg.items.flatMap((item, index) => {
    const asset = assets.find((entry) => entry.id === item.assetId);
    return asset ? [{ id: `${prefix}-a${index + 1}`, assetId: asset.id, name: asset.name, format: asset.format, kind: "piece" as const, qty: item.qty, period: item.period, source: "package" as const }] : [];
  });
}

export const newShare = (clientId: string, seed = 0) => ({ enabled: false, token: `${uidPart(clientId)}-${(seed * 7919 + 104729).toString(36)}`, code: String(100000 + ((seed * 48271 + 913) % 900000)), postIds: [] as string[] });

// ─── People ───
export const people: Person[] = [
  { id: "maria", name: "María", role: "owner", title: "Managing partner", email: "maria@theworks.ie", color: "#E0567A" },
  { id: "gareth", name: "Gareth", role: "owner", title: "Partner · new business", email: "gareth@theworks.ie", color: "#2F6FDB" },
  { id: "niamh", name: "Nahomi", role: "ops", title: "Coordinator · Operations", email: "coordinator@theworks.ie", color: "#1B9C85" },
];

const serviceList: Record<string, string> = {
  chelsie: ["LinkedIn carousel (copy + design) | $45", "Text post | $15", "Monthly report | $20"].join("\n"),
  velinda: ["Instagram carousel | $40", "Reel edit (under 30s) | $60", "Story set | $20"].join("\n"),
  ryan: ["Copywriting per post | $15", "Monthly analytics report | $25"].join("\n"),
  eve: ["Carousel design | $40", "Single image | $20", "Brand template set | $150"].join("\n"),
  sam: "Short video edit | To agree",
};
const platformOf: Record<string, string> = { chelsie: "Upwork", velinda: "Fiverr", ryan: "Upwork", eve: "Fiverr", sam: "Direct" };
const jobsOf: Record<string, Freelancer["jobs"]> = {
  chelsie: [
    { id: "j-chelsie-1", date: "", client: "Marker Group", what: "LinkedIn carousels and copy, last month", amount: 110, link: "" },
    { id: "j-chelsie-2", date: "", what: "Brand voice sample for the agency website", amount: 60, link: "", client: "The Works" },
  ],
  velinda: [{ id: "j-velinda-1", date: "", client: "House Build", what: "Instagram carousels and a reel, last month", amount: 100, link: "" }],
  eve: [{ id: "j-eve-1", date: "", what: "Brand template set (Canva)", amount: 150, link: "", client: "The Works" }],
};
const freelancer = (id: string, name: string, color: string, speciality: string, rate: string, capacity: number, status: Freelancer["status"], done: number): Freelancer => ({
  id,
  platform: platformOf[id] ?? "",
  specialities: [],
  availability: { mode: "hours", amount: 0 },
  fees: [],
  tools: [],
  trialDone: false,
  ndaDate: "",
  contractDate: "",
  profileUrl: "",
  driveUrl: "",
  files: [],
  phone: "",
  notes: "",
  jobs: (jobsOf[id] ?? []).map((job, index) => ({ ...job, date: ago(30 + index * 12) })),
  name,
  role: "freelancer",
  title: speciality,
  email: `${id}@example.com`,
  color,
  speciality,
  rate,
  currency: "USD",
  paymentMethod: status === "Active" ? "Revolut" : "",
  capacity,
  services: serviceList[id] ?? "",
  portfolio: "",
  status,
  checklist: makeChecklist(freelancerChecklistTemplate, `fl-${id}`, done),
});

/** Example freelancers, kept only so older saved copies can be cleared. The app starts with none. */
const sampleFreelancers: Freelancer[] = [
  freelancer("chelsie", "Chelsie", "#8E5CD9", "Copy and LinkedIn carousels", "$110 / client / month", 3, "Active", 11),
  freelancer("velinda", "Velinda", "#E08A1E", "Design and Instagram", "$100 / client / month", 3, "Active", 10),
  freelancer("ryan", "Ryan", "#3D8BD9", "Copy and reporting", "$120 / client / month", 3, "Active", 9),
  freelancer("eve", "Eve", "#D94F70", "Design and content delivery", "$166 / client / month", 4, "Active", 11),
  { ...freelancer("sam", "Sam (trial)", "#5A6B7D", "Motion and video", "To agree", 2, "Trial", 3), email: "sam@example.com" },
];
/** Two example directory entries. */
const directoryEntry = (id: string, name: string, platform: string, speciality: string, services: string, color: string): Freelancer => ({
  ...freelancer(id, name, color, speciality, "", 0, "Directory", 0),
  platform,
  services,
  notes: "Example entry. Delete it when you add real ones.",
});
sampleFreelancers.push(
  directoryEntry("dana", "Dana (example)", "Fiverr", "Reels and short video editing", ["Reel edit (under 30s) | $55", "Story set | $18"].join("\n"), "#C2578A"),
  directoryEntry("marco", "Marco (example)", "Upwork", "B2B copywriter", ["LinkedIn text post | $20", "Newsletter | $60"].join("\n"), "#4C8B6F"),
);
// Sam's NDA is out for signature, so Sam cannot be assigned yet.
sampleFreelancers[4].checklist[6] = { ...sampleFreelancers[4].checklist[6], status: "Requested", date: ago(2) };
/** Starts empty: freelancers are added in the directory. */
export const freelancers: Freelancer[] = [];
export const sampleFreelancerIds = sampleFreelancers.map((person) => person.id);

// ─── Strategies ───
const strategy = (s: Partial<Strategy>): Strategy => ({
  offer: "",
  services: "",
  personas: [],
  pillars: [],
  tone: "",
  avoid: "",
  claims: "",
  approved: false,
  ...s,
});

const pillar = (id: string, name: string, color: string) => ({ id, name, color });

// ─── Clients ───
const baseClient = (c: Partial<Client> & Pick<Client, "id" | "name" | "color">): Client => ({
  area: "marketing",
  setupPosts: 2,
  monthDone: {},
  packNotes: { brand: "", brain: "", templates: "" },
  sector: "Construction",
  package: "Essential",
  assets: [],
  sections: [],
  share: { enabled: false, token: "", code: "", postIds: [] },
  stage: "Live",
  approvalMode: "C",
  mainContact: { name: "", email: "", phone: "" },
  approver: { name: "", email: "" },
  billingContact: "",
  channel: "Email",
  expertReviewer: "",
  ownerId: "maria",
  opsId: "niamh",
  freelancerFee: 0,
  fee: 0,
  addOnFee: 0,
  agreedPosts: 8,
  platforms: ["LinkedIn"],
  startDate: ago(60),
  links: { drive: "", canva: "", publer: "", chat: "", brandKit: "", guide: "", brain: "" },
  checklist: [],
  strategy: strategy({}),
  hours: {},
  planApproval: {},
  access: [],
  files: [],
  costs: [],
  ...c,
});

export const clients: Client[] = [
  baseClient({
    id: "marker",
    name: "Marker Group",
    color: "#258A44",
    logo: "/posts/marker-group-logo.png",
    sector: "Fire safety and compliance",
    freelancerId: "chelsie",
    freelancerFee: 110,
    fee: 500,
    mainContact: { name: "Client contact (to add)", email: "", phone: "" },
    approver: { name: "Named approver (to add)", email: "" },
    expertReviewer: "Fire safety lead (to confirm)",
    links: { drive: "https://drive.google.com/", canva: "https://www.canva.com/", publer: "https://app.publer.com/", chat: "", brandKit: "" },
    checklist: makeChecklist(clientChecklistTemplate, "marker", 38, [], "chelsie"),
    strategy: strategy({
      offer: "Fire door inspection, maintenance and compliance support for building owners and facilities teams.",
      services: "Fire door inspections · Remedial works · Compliance reporting",
      personas: [
        { id: "p1", name: "Facilities managers", cares: "Passing inspections without disruption to the building.", pains: "Small defects turning into failed audits and expensive remedial work.", wants: "Checklists they can save and use on a walk-round." },
        { id: "p2", name: "Building owners", cares: "Liability and insurance.", pains: "Not knowing what the regulations actually require of them.", wants: "Plain answers: what to do, how often, what it costs to ignore." },
      ],
      pillars: [pillar("pl1", "Practical checklists", "#258A44"), pillar("pl2", "Compliance explained", "#2F6FDB"), pillar("pl3", "Behind the inspection", "#E08A1E")],
      tone: "Direct, practical, calm. Never fear-based.",
      avoid: "Naming buildings or clients without permission. Scare statistics.",
      claims: "Any reference to regulations or certification must be checked by the client.",
      approved: true,
    }),
    hours: { [thisMonth]: { owner: 2, ops: 3, freelancer: 9 } },
    access: [
      { id: "a1", platform: "LinkedIn page", account: "Marker Group company page", ownedBy: "Client", people: "Coordinator (admin), Chelsie (content admin)", status: "Active", date: ago(50), vaultRef: "" },
      { id: "a2", platform: "Publishing tool", account: "The Works workspace · Marker Group", ownedBy: "Agency", people: "Coordinator, Chelsie (editor, approval needed)", status: "Active", date: ago(48), vaultRef: "Vault · Publishing tool" },
      { id: "a3", platform: "Canva", account: "Marker Group brand kit", ownedBy: "Agency", people: "Chelsie", status: "Active", date: ago(48), vaultRef: "" },
    ],
    files: [
      { id: "cf1", name: "Service agreement (signed).pdf", url: "https://drive.google.com/", category: "Contract", addedAt: ago(55), addedBy: "gareth" },
      { id: "cf2", name: "Marker Group logo pack", url: "https://drive.google.com/", category: "Brand", addedAt: ago(52), addedBy: "niamh" },
      { id: "cf3", name: "Site photo library", url: "https://drive.google.com/", category: "Photos", addedAt: ago(40), addedBy: "niamh" },
    ],
    planApproval: { [thisMonth]: { status: "Approved", date: day(7), via: "Email" } },
  }),
  baseClient({
    id: "housebuild",
    name: "House Build",
    color: "#0759B5",
    logo: "/posts/housebuild-logo.jpg",
    sector: "Construction software",
    freelancerId: "velinda",
    freelancerFee: 100,
    fee: 750,
    addOnFee: 250,
    approvalMode: "A",
    platforms: ["Instagram", "LinkedIn"],
    mainContact: { name: "Client contact (to add)", email: "", phone: "" },
    approver: { name: "Named approver (to add)", email: "" },
    expertReviewer: "Client's structural engineer",
    links: { drive: "https://drive.google.com/", canva: "https://www.canva.com/", publer: "", chat: "", brandKit: "" },
    checklist: withStatus(makeChecklist(clientChecklistTemplate, "housebuild", 38, [], "velinda"), { "Permission to use": "Requested", "Newsletter tool": "Not asked" }),
    strategy: strategy({
      offer: "Online tools that help self-builders, architects and engineers check spans, openings and regulations quickly.",
      services: "Span lookup · Structural opening guidance · Regulation explainers",
      personas: [
        { id: "p1", name: "Architects and engineers", cares: "Accurate numbers fast, without opening a manual.", pains: "Repetitive lookups and questions from clients.", wants: "Clear rules of thumb with the source behind them." },
        { id: "p2", name: "Self-builders", cares: "Not making a costly structural mistake.", pains: "Jargon and conflicting advice online.", wants: "Simple visuals that explain what decides the answer." },
      ],
      pillars: [pillar("pl1", "Tools and calculations", "#0759B5"), pillar("pl2", "Building regulations", "#8E5CD9"), pillar("pl3", "Site know-how", "#E08A1E")],
      tone: "Helpful, precise, plain English.",
      avoid: "Giving a definitive structural answer. Always point back to an engineer.",
      claims: "Every span, load or regulation reference is checked by the client's engineer. Add 'Guidance only. Confirm with your engineer.'",
      approved: true,
    }),
    hours: { [thisMonth]: { owner: 1, ops: 4, freelancer: 11 } },
    access: [
      { id: "a1", platform: "Instagram", account: "@housebuild", ownedBy: "Client", people: "Coordinator, Velinda (via Meta Business)", status: "Active", date: ago(55), vaultRef: "" },
      { id: "a2", platform: "LinkedIn page", account: "House Build", ownedBy: "Client", people: "Coordinator (admin)", status: "Active", date: ago(55), vaultRef: "" },
      { id: "a3", platform: "Newsletter tool", account: "Client's Mailchimp", ownedBy: "Client", people: "Requested for Coordinator", status: "Requested", date: ago(3), vaultRef: "" },
    ],
    files: [
      { id: "cf1", name: "Service agreement (signed).pdf", url: "https://drive.google.com/", category: "Contract", addedAt: ago(58), addedBy: "gareth" },
      { id: "cf2", name: "Brand guidelines", url: "https://drive.google.com/", category: "Brand", addedAt: ago(56), addedBy: "niamh" },
    ],
    costs: [{ id: "cc1", label: "Stock video licence", amount: 29, month: thisMonth, recurring: false }],
    planApproval: { [thisMonth]: { status: "Approved", date: day(8), via: "Canva comment" } },
  }),
  baseClient({
    id: "buildregs",
    name: "Buildreg",
    color: "#145CC0",
    sector: "Building regulations",
    freelancerId: "ryan",
    freelancerFee: 120,
    fee: 500,
    checklist: withStatus(makeChecklist(clientChecklistTemplate, "buildregs", 38, [], "ryan"), { "Followers, engagement": "Requested", "Competitors": "Not asked" }),
    strategy: strategy({
      offer: "Building regulations guidance for project teams.",
      services: "Regulation updates · Compliance guidance",
      personas: [{ id: "p1", name: "Project managers", cares: "Staying compliant without slowing the job.", pains: "Regulation changes they hear about too late.", wants: "What changed, and the three things to do this week." }],
      pillars: [pillar("pl1", "What changed", "#145CC0"), pillar("pl2", "How to comply", "#258A44")],
      tone: "Clear and factual.",
      avoid: "Legal advice.",
      claims: "Regulation references link to the official source.",
      approved: true,
    }),
    planApproval: { [thisMonth]: { status: "Approved", date: day(9), via: "Email" } },
  }),
  baseClient({
    id: "element",
    name: "Element",
    color: "#743CC5",
    sector: "Engineering",
    freelancerId: "eve",
    freelancerFee: 166.67,
    fee: 1000,
    platforms: ["LinkedIn", "Instagram"],
    checklist: withStatus(makeChecklist(clientChecklistTemplate, "element", 38, [], "eve"), { "Claims that need": "Not asked", "Photo and footage": "Requested" }),
    strategy: strategy({ offer: "To confirm with client.", approved: false }),
  }),
  baseClient({
    id: "fireregs",
    name: "Firereg",
    color: "#1557B8",
    logo: "/posts/fireregs-logo.svg",
    sector: "Fire safety software",
    freelancerId: "eve",
    freelancerFee: 0,
    fee: 0,
    agreedPosts: 4,
    stage: "Onboarding",
    startDate: day(1),
    checklist: withStatus(makeChecklist(clientChecklistTemplate, "fireregs", 38, [], "eve"), { "Audit done": "Requested", "First plan sent": "Requested", "Launch posts": "Not asked", "First calendar": "Not asked", "Photo and footage": "Requested", "Permission to use": "Not asked" }),
    strategy: strategy({
      offer: "Software that turns building drawings into a Part B fire-safety report.",
      services: "Drawing upload · Guided questions · Part B report",
      personas: [{ id: "p1", name: "Building designers", cares: "Getting a compliant Part B report done quickly.", pains: "Hours lost on manual checks and back-and-forth.", wants: "To see the workflow before they trust it." }],
      pillars: [pillar("pl1", "Product walkthroughs", "#1557B8"), pillar("pl2", "Part B questions", "#E0567A")],
      tone: "Confident, clear, product-led.",
      claims: "All regulatory statements checked by a fire-safety specialist before publishing.",
      approved: true,
    }),
  }),
  baseClient({
    id: "energyfix",
    name: "EnergyFix",
    color: "#2E7D32",
    sector: "Energy retrofit",
    fee: 500,
    checklist: withStatus(makeChecklist(clientChecklistTemplate, "energyfix", 38, [], undefined), { "Freelancer assigned": "Not asked", "Followers, engagement": "Not asked" }),
    strategy: strategy({ offer: "Home energy upgrades and grant guidance.", approved: false }),
  }),
  baseClient({
    id: "capcon",
    name: "CapCon",
    color: "#D65A12",
    sector: "Construction",
    stage: "Onboarding",
    ownerId: "gareth",
    fee: 1000,
    startDate: ago(5),
    checklist: withStatus(makeChecklist(clientChecklistTemplate, "capcon", 3, [3, 8, 9, 10, 11, 12, 19, 20], undefined), { "Billing contact": "Received" }),
    strategy: strategy({}),
  }),
];

// New areas for the sample clients. Clients that started before this process was written are being backfilled.
const handedOver = { "Strategy brain, brand guide": "Received", "Freelancer briefed": "Received", "Pack handed": "Received" } as const;
const packFor: Record<string, CheckItem[]> = {
  marker: withStatus(withPack("marker", 36, [36, 37, 38], "chelsie"), { ...handedOver, "Canva templates ready": "Requested" }),
  housebuild: withPack("housebuild", 46, [], "velinda"),
  buildregs: withStatus(withPack("buildregs", 33, [33, 34], "ryan"), { ...handedOver, "Canva templates ready": "Requested" }),
  element: withPack("element", 22, [22, 23], "eve"),
  fireregs: withPack("fireregs", 6, [6, 7], "eve"),
  energyfix: withPack("energyfix", 0, [], undefined),
  capcon: withPack("capcon", 0, [0, 1], undefined),
};
const packLinks: Record<string, { guide?: string; brain?: string }> = {
  marker: { guide: "https://docs.google.com/", brain: "https://docs.google.com/" },
  housebuild: { guide: "https://docs.google.com/", brain: "https://docs.google.com/" },
  buildregs: { guide: "https://docs.google.com/", brain: "https://docs.google.com/" },
  element: { brain: "https://docs.google.com/" },
};
const packNotes: Record<string, Client["packNotes"]> = {
  marker: {
    brand: "Sample text, replace with the real guide.\nVoice: calm, practical, plain English. We explain what an inspector looks for, we do not scare.\nColours: Marker green with white space. Keep one idea per slide.\nAvoid: stock photos of hard hats, fear headlines, claims we cannot source.",
    brain: "Sample text, replace with the real research.\nBuyers: facilities managers and housing associations who must prove fire doors are inspected.\nWhat they worry about: missed inspections, unclear sign-off, being the named responsible person.\nPillars: Inspection basics, Compliance made simple, A day on site.",
    templates: "Sample text, replace with the real list.\nPortrait 1080×1350 and square 1080×1080 masters. Use the carousel master for checklists and the quote master for people.",
  },
};
const clientPackage: Record<string, string> = { marker: "essential", housebuild: "essential", buildregs: "essential", element: "growth", energyfix: "essential", capcon: "growth" };
const sectionDefs = defaultSections();
/** Next month's House Build posts, the example for the client portal. */
export const portalIds = ["hb-n1", "hb-n2", "hb-n3", "hb-n4", "hb-n5", "hb-n6", "hb-n7", "hb-n8", "hb-n9"];
clients.forEach((client, index) => {
  client.checklist = [...client.checklist, ...(packFor[client.id] ?? [])];
  client.links = { ...client.links, ...packLinks[client.id] };
  if (packNotes[client.id]) client.packNotes = packNotes[client.id];
  const pkg = defaultPackages.find((item) => item.id === clientPackage[client.id]);
  client.packageId = pkg?.id;
  client.package = pkg?.name ?? "Custom";
  client.assets = pkg ? packageAssets(pkg, defaultAssets, client.id) : [{ id: `${client.id}-a1`, name: "Product post", format: "Single image", kind: "piece", qty: 4, period: "month", source: "custom" }];
  if (client.id === "buildregs") client.assets.push({ id: `${client.id}-x1`, assetId: "brochure", name: "Brochure", format: "Document", kind: "extra", qty: 1, period: "month", source: "add-on", assignedTo: "ryan", due: ahead(10), brief: "Sample: a 4-page A4 brochure on Buildreg's services, using the brand guide and the Canva brochure template." });
  const newsletter = client.id === "housebuild";
  if (newsletter) client.assets.push({ id: `${client.id}-a9`, assetId: "newsletter", name: "Email newsletter", format: "Newsletter", kind: "extra", qty: 1, period: "month", price: 250, source: "add-on" });
  const wanted = new Set(sectionDefs.filter((section) => section.always || client.assets.some((asset) => defaultAssets.find((entry) => entry.id === asset.assetId)?.sections.includes(section.id) ?? ["brain", "brand", "templates"].includes(section.id))).map((section) => section.id));
  if (newsletter) wanted.add("newsletter");
  client.sections = sectionDefs.filter((section) => wanted.has(section.id)).map(({ id, label, color, blurb }) => ({ id, label, color, blurb }));
  client.checklist.forEach((item) => { item.area = item.area ?? areaIdForGroup(item.group); });
  if (newsletter) client.checklist.push(...buildClientChecklist(sectionDefs.filter((section) => section.id === "newsletter"), client.id).map((item, i) => (i === 0 ? { ...item, status: "Requested" as const, date: ago(3) } : item)));
  client.agreedPosts = piecesPerMonth(client.assets);
  client.share = { ...newShare(client.id, index + 1), enabled: client.id === "housebuild", postIds: client.id === "housebuild" ? ["h1", "h3", "h6", ...portalIds] : [] };
});

// ─── Posts ───
const post = (p: Partial<Post> & Pick<Post, "id" | "clientId" | "title" | "status">): Post => ({
  format: "Single image",
  platforms: ["LinkedIn"],
  date: day(20),
  copy: "",
  captions: {},
  files: [],
  art: p.title,
  designLink: "",
  driveLink: "",
  version: 1,
  comments: [],
  history: [],
  needsExpert: false,
  expertOk: false,
  waitingSince: ago(1),
  ...p,
});

const img = (id: string, src: string) => ({ id, name: src.split("/").pop() ?? id, src, kind: (src.endsWith(".mp4") ? "video" : "image") as "video" | "image" });

const monthAfter = (() => { const date = new Date(`${thisMonth}-15T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + 1); return date.toISOString().slice(0, 7); })();
const nextDay = (value: number) => `${monthAfter}-${pad(value)}`;
/** What House Build's next month looks like, from first idea to scheduled. */
export const portalPosts: Post[] = [
  post({ id: "hb-n1", clientId: "housebuild", title: "Look up your span in seconds", platforms: ["Instagram", "LinkedIn"], pillarId: "pl1", status: "Scheduled", date: nextDay(3), copy: "Which timber fits your span? Enter the opening, the load and the grade, and the HouseBuild span lookup gives you the answer in seconds.\n\nGuidance only. Confirm with your engineer.", files: [img("pn1", "/posts/housebuild-span-cover.jpg")], scheduledVia: "Publishing tool" }),
  post({ id: "hb-n2", clientId: "housebuild", title: "Steel or timber beam: when does each make sense?", format: "Carousel", platforms: ["Instagram", "LinkedIn"], pillarId: "pl1", status: "Scheduled", date: nextDay(5), copy: "Steel is not always the answer, and timber is not always the cheaper one. Four questions to ask before you choose a beam.\n\nSwipe through, then try the span tool.", art: "Steel or timber beam?", scheduledVia: "Publishing tool" }),
  post({ id: "hb-n3", clientId: "housebuild", title: "Every opening has a structural rule behind it", platforms: ["Instagram"], pillarId: "pl2", status: "Ready to schedule", date: nextDay(7), copy: "Every opening in a wall needs support above it. Review the openings guidance on HouseBuild before you cut.", files: [img("pn3", "/posts/housebuild-openings.jpg")] }),
  post({ id: "hb-n4", clientId: "housebuild", title: "Top 3 mistakes self-builders make with foundations", format: "Carousel", platforms: ["Instagram", "LinkedIn"], pillarId: "pl3", status: "Ready to schedule", date: nextDay(10), copy: "From the questions our support inbox gets every week: the three foundation mistakes that cost the most to fix, and how to avoid each one.", art: "3 foundation mistakes" }),
  post({ id: "hb-n5", clientId: "housebuild", title: "What will your build really cost?", platforms: ["Instagram", "LinkedIn"], pillarId: "pl1", status: "Ready to schedule", date: nextDay(12), copy: "Design fees, structural sign-off, BER, site surveys: the costs most self-builders forget. Our cost calculator lists them line by line so nothing surprises you.", files: [img("pn5", "/posts/housebuild-cost-calculator.jpg")] }),
  post({ id: "hb-n6", clientId: "housebuild", title: "Myth: you can always remove an internal wall", format: "Reel", platforms: ["Instagram"], pillarId: "pl2", status: "Design review", date: nextDay(14), copy: "Some walls hold the house up. Here is how to tell which, and what a structural opening really involves.", art: "Can you really remove that wall?" }),
  post({ id: "hb-n7", clientId: "housebuild", title: "Timber only performs to its grade if it's stored right", platforms: ["Instagram"], pillarId: "pl3", status: "Design review", date: nextDay(17), copy: "Off the ground, covered, ventilated. Storage and protection of materials on housebuild.com.", files: [img("pn7", "/posts/housebuild-timber-storage.jpg")] }),
  post({ id: "hb-n8", clientId: "housebuild", title: "What Part A means for your extension", format: "Text post", platforms: ["LinkedIn"], pillarId: "pl2", status: "Copy review", date: nextDay(19), copy: "Planning an extension? Part A covers structure, and it decides more than most people expect: foundations, loads, openings and the way the new build ties into the old.\n\nThree things to settle with your engineer before the drawings go out.", art: "What Part A means for your extension" }),
  post({ id: "hb-n9", clientId: "housebuild", title: "Timber span: 4 things decide it", format: "Carousel", platforms: ["Instagram", "LinkedIn"], pillarId: "pl1", status: "Copy in progress", date: nextDay(21), copy: "", art: "Timber span: 4 things decide it" }),
];

export const posts: Post[] = [
  ...portalPosts,
  post({ id: "m1", clientId: "marker", title: "The hidden cost of a delayed fire door inspection", format: "Carousel", pillarId: "pl2", status: "Published", date: day(3), copy: "Three places small inspection delays turn into big problems, and a checklist your facilities team can use this week.", liveUrl: "https://www.linkedin.com/", art: "Fire door inspection delays" }),
  post({ id: "m2", clientId: "marker", title: "Make compliance easier to act on", pillarId: "pl1", status: "Scheduled", date: day(21), copy: "Useful guidance your team can put to work this week.", scheduledVia: "Publishing tool", art: "CLEAR STEPS.\nSAFER SITES." }),
  post({ id: "m3", clientId: "marker", title: "Fire door maintenance: a 5-point checklist", format: "Carousel", pillarId: "pl1", status: "Ready to schedule", date: day(24), copy: "Five checks that keep a fire door doing its job: gaps, seals, closers, hinges and signage.", waitingSince: ago(2), art: "5-point fire door checklist" }),
  post({ id: "m4", clientId: "marker", title: "What an inspector looks for first", format: "Text post", pillarId: "pl3", status: "Design review", date: day(26), copy: "We asked our inspectors what they check in the first five minutes. The answer is rarely the door itself.", waitingSince: ago(4), art: "The first five minutes" }),
  post({
    id: "m5", clientId: "marker", title: "Winter fire-safety reminders for facilities teams", format: "Carousel", pillarId: "pl1", status: "Copy in progress", date: day(28), version: 2,
    copy: "As the heating goes on, a few fire-safety basics matter more.",
    comments: [{ id: "c1", by: "niamh", body: "Lead with the action, not the season. And cut the statistic in slide 2: we have no source for it.", at: ago(1), kind: "change", category: "Factual" }],
    art: "Winter reminders",
  }),

  post({ id: "h1", clientId: "housebuild", title: "Look up your span in seconds", format: "Reel", platforms: ["Instagram"], pillarId: "pl1", status: "Published", date: day(2), copy: "A quick walkthrough of the HouseBuild span lookup. Guidance only. Confirm with your engineer.", files: [img("f1", "/posts/timber-span-loop-hb.mp4")], liveUrl: "https://www.instagram.com/", needsExpert: true, expertOk: true }),
  post({
    id: "h2", clientId: "housebuild", title: "Timber span: 4 things decide it", format: "Carousel", platforms: ["Instagram", "LinkedIn"], pillarId: "pl1", status: "Design review", date: day(23), waitingSince: ago(1),
    copy: "Timber grade, joist size, spacing and load all affect the answer. Guidance only. Confirm with your engineer.",
    captions: { LinkedIn: "Architects ask us this every week: what actually decides a timber span? Four things. Here is how each one changes the answer. Guidance only. Confirm with your engineer." },
    files: [img("f2", "/posts/housebuild-span-cover.jpg"), img("f2b", "/posts/housebuild-span-four-things.jpg"), img("f3", "/posts/timber-span-4.jpg"), img("f4", "/posts/timber-span-5.jpg")],
    designLink: "https://www.canva.com/", needsExpert: true, expertOk: false,
  }),
  post({ id: "h3", clientId: "housebuild", title: "Every opening has a structural rule behind it", platforms: ["Instagram"], pillarId: "pl2", status: "Scheduled", date: day(22), copy: "Every opening in a wall needs support above it. Review the openings guidance on HouseBuild before you cut.", files: [img("f5", "/posts/housebuild-openings.jpg")], scheduledVia: "Publishing tool", needsExpert: true, expertOk: true }),
  post({
    id: "h5", clientId: "housebuild", title: "What will your build really cost?", format: "Carousel", platforms: ["Instagram", "LinkedIn"], pillarId: "pl1", status: "Client approval", date: day(26), waitingSince: ago(1),
    copy: "Design fees, structural sign-off, BER, site surveys: the costs most self-builders forget. Our cost calculator lists them line by line so nothing surprises you.",
    captions: { LinkedIn: "Most self-build budgets miss the professional fees: design, structural sign-off, BER and surveys. The HouseBuild cost calculator lists every line so clients see the real number up front." },
    files: [img("f6", "/posts/housebuild-cost-calculator.jpg")], designLink: "https://www.canva.com/",
  }),
  post({ id: "h6", clientId: "housebuild", title: "Timber only performs to its grade if it's stored right", platforms: ["Instagram"], pillarId: "pl3", status: "Published", date: day(8), copy: "Off the ground, covered, ventilated. Storage and protection of materials on housebuild.com.", files: [img("f7", "/posts/housebuild-timber-storage.jpg")], liveUrl: "https://www.instagram.com/" }),
  post({ id: "h4", clientId: "housebuild", title: "5 site checks before winter", format: "Carousel", platforms: ["Instagram"], pillarId: "pl3", status: "Copy review", date: day(27), waitingSince: ago(0), copy: "A quick site walk-through can prevent costly surprises when the weather turns: drainage, covers, scaffolding ties, stored materials, access routes.", art: "Five site checks before winter" }),

  post({
    id: "m8", clientId: "marker", title: "Marker Group: one partner for delivery, compliance and safety", format: "Carousel", platforms: ["LinkedIn", "Instagram"], pillarId: "pl3", status: "Design review", date: day(28), waitingSince: ago(2),
    copy: "One partner for project delivery, compliance and building safety. Project management, building control and certification, ESG, fire engineering and access, across the UK and Ireland since 2007.",
    captions: { Instagram: "One partner. Multiple areas of expertise. Swipe to see what we do and where we work. Follow for practical updates on building safety, Gateway approvals and fire strategy." },
    files: [img("mk1", "/posts/marker-01-hero.webp"), img("mk2", "/posts/marker-02-what-we-do.webp"), img("mk3", "/posts/marker-03-fire-access.webp"), img("mk4", "/posts/marker-04-where-we-work.png"), img("mk5", "/posts/marker-05-stay-informed.webp")],
    designLink: "https://www.canva.com/", needsExpert: true, expertOk: false,
    qa: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"],
    comments: [{ id: "mkc1", by: "chelsie", body: "Five slides: intro, services, fire & access, where we work, follow CTA. Copy is from their capability statement.", at: ago(2), kind: "comment" }],
  }),
  post({ id: "m6", clientId: "marker", title: "Fire door signage: what each sign means", format: "Carousel", pillarId: "pl2", status: "Published", date: day(9), copy: "Five signs, five meanings. Save this for your next walk-round.", liveUrl: "https://www.linkedin.com/", art: "What each fire door sign means" }),
  post({ id: "m7", clientId: "marker", title: "A day on inspection with our team", format: "Reel", pillarId: "pl3", status: "Scheduled", date: day(17), copy: "From the first door to the final report.", scheduledVia: "Publishing tool", art: "A day on inspection" }),
  post({ id: "b0", clientId: "buildregs", title: "Who signs off what under building control?", format: "Carousel", pillarId: "pl2", status: "Published", date: day(7), copy: "Owner, designer, builder, assigned certifier: who is responsible for what.", liveUrl: "https://www.linkedin.com/", art: "Who signs off what?" }),
  post({ id: "b3", clientId: "buildregs", title: "Commencement notice checklist", format: "Single image", pillarId: "pl2", status: "Design in progress", date: day(25), copy: "Seven things to have ready before you lodge a commencement notice.", art: "Commencement notice checklist" }),
  post({ id: "e3", clientId: "element", title: "Behind the calculation: how we check a beam", format: "Carousel", status: "Design review", date: day(24), waitingSince: ago(1), copy: "What our engineers check, step by step.", art: "How we check a beam", needsExpert: true, expertOk: true }),
  post({ id: "e4", clientId: "element", title: "We are hiring: graduate engineer", format: "Single image", status: "Scheduled", date: day(21), copy: "Join a team that explains engineering clearly.", scheduledVia: "Publishing tool", art: "We are hiring" }),
  post({ id: "b1", clientId: "buildregs", title: "Building control update: what changed?", format: "Text post", pillarId: "pl1", status: "Ready to schedule", date: day(22), copy: "The latest building control guidance, translated into three actions for project teams.", art: "Building control update" }),
  post({ id: "b2", clientId: "buildregs", title: "BCAR in plain English", format: "Carousel", pillarId: "pl2", status: "Copy in progress", date: day(29), art: "BCAR in plain English" }),

  post({ id: "e1", clientId: "element", title: "Meet the engineers behind the projects", format: "Carousel", platforms: ["LinkedIn"], status: "Design review", date: day(19), waitingSince: ago(6), copy: "A short introduction to the team.", art: "Meet the engineers" }),
  post({ id: "e2", clientId: "element", title: "Three questions to ask before you commission a survey", status: "Published", date: day(6), copy: "Save time and money with these three questions.", liveUrl: "https://www.linkedin.com/", art: "Before you commission a survey" }),

  post({ id: "f1", clientId: "fireregs", title: "How Firereg works", format: "Carousel", pillarId: "pl1", status: "Design review", date: day(20), waitingSince: ago(5), copy: "Four steps from your drawings to a Part B report: upload drawings, answer guided questions, get your report, then verify and download.", files: [img("ff1", "/posts/fireregs-how-it-works.png")], needsExpert: true }),
  post({ id: "f2", clientId: "fireregs", title: "Upload your drawings", pillarId: "pl1", status: "Ready to schedule", date: day(22), waitingSince: ago(1), copy: "Firereg reads heights, storeys and floor areas from your PDF drawings. Review and accept each suggested value.", files: [img("ff2", "/posts/fireregs-upload-drawings.png")], needsExpert: true, expertOk: true }),
  post({ id: "f3", clientId: "fireregs", title: "Answer guided questions", platforms: ["Instagram"], pillarId: "pl1", status: "Copy review", date: day(24), waitingSince: ago(0), copy: "Work through the questions that apply to your building, one step at a time.", files: [img("ff3", "/posts/fireregs-guided-questions.png")] }),
  post({ id: "f4", clientId: "fireregs", title: "11m vs 18m: what changes?", pillarId: "pl2", status: "Copy in progress", date: day(27), copy: "How building height affects external wall material requirements.", files: [img("ff4", "/posts/fireregs-height-rules.png")], needsExpert: true }),
];

// ─── Ideas: a document from Velinda split into cards, partly decided ───
const nextMonth = (() => { const date = new Date(`${thisMonth}-15T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + 1); return date.toISOString().slice(0, 7); })();
const idea = (i: Partial<Idea> & Pick<Idea, "id" | "clientId" | "title">): Idea => ({ notes: "", format: "Carousel", decision: "New", comment: "", createdBy: "velinda", createdAt: ago(9), month: thisMonth, ...i });
export const ideas: Idea[] = [
  idea({ id: "i1", clientId: "housebuild", title: "Timber span: 4 things decide it", notes: "Architects keep asking which variable matters most. Show grade, size, spacing, load as four slides.", pillarId: "pl1", decision: "Approved", postId: "h2", source: "October ideas.docx" }),
  idea({ id: "i2", clientId: "housebuild", title: "5 site checks before winter", notes: "Seasonal. Drainage, covers, ties, materials, access.", pillarId: "pl3", decision: "Approved", postId: "h4", source: "October ideas.docx" }),
  idea({ id: "i3", clientId: "housebuild", title: "Steel vs timber beam: when does each make sense?", notes: "Comparison post. Needs engineer input on the numbers.", pillarId: "pl1", decision: "Maybe", comment: "Good, but only once their engineer gives us the figures.", source: "October ideas.docx" }),
  idea({ id: "i4", clientId: "housebuild", title: "Myth: you can always remove an internal wall", notes: "Myth-busting reel with a structural opening example.", pillarId: "pl2", format: "Reel", source: "October ideas.docx" }),
  idea({ id: "i5", clientId: "housebuild", title: "Top 3 mistakes self-builders make with foundations", notes: "From the questions their support inbox gets.", pillarId: "pl3", source: "October ideas.docx" }),
  idea({ id: "i6", clientId: "housebuild", title: "Day in the life of a site engineer", notes: "People content. Needs a willing engineer.", format: "Reel", decision: "Rejected", comment: "Not for this client: they are a tool, not a contractor.", source: "October ideas.docx" }),
  idea({ id: "i7", clientId: "housebuild", title: "How to read a span table in 30 seconds", notes: "Screen-recorded walkthrough of the tool.", pillarId: "pl1", format: "Reel", source: "October ideas.docx" }),
  idea({ id: "i8", clientId: "housebuild", title: "What Part A means for your extension", notes: "Regulation explainer, engineer check needed.", pillarId: "pl2", source: "October ideas.docx" }),
  idea({ id: "i9", clientId: "marker", title: "Fire door maintenance: a 5-point checklist", pillarId: "pl1", decision: "Approved", postId: "m3", createdBy: "chelsie" }),
  idea({ id: "i10", clientId: "marker", title: "What an inspector looks for first", pillarId: "pl3", decision: "Approved", postId: "m4", createdBy: "chelsie" }),
  idea({ id: "i11", clientId: "marker", title: "Fire doors in rented properties: who is responsible?", notes: "Landlord vs tenant. Needs client confirmation of responsibilities.", pillarId: "pl2", createdBy: "chelsie" }),
  idea({ id: "i12", clientId: "marker", title: "Christmas shutdown: fire-safety checks before you close", notes: "Seasonal checklist for facilities teams.", pillarId: "pl1", createdBy: "chelsie", month: nextMonth }),
  idea({ id: "i13", clientId: "marker", title: "Meet an inspector: 20 years of fire doors", notes: "People post, needs a photo and a quote.", pillarId: "pl3", format: "Single image", createdBy: "chelsie", month: nextMonth }),
  idea({ id: "i14", clientId: "buildregs", title: "BCAR in plain English", notes: "What it is, who signs what, when.", pillarId: "pl2", decision: "Approved", postId: "b2", createdBy: "ryan" }),
  idea({ id: "i15", clientId: "buildregs", title: "Three regulation changes coming next year", notes: "Needs official sources linked.", pillarId: "pl1", createdBy: "ryan" }),
  idea({ id: "i16", clientId: "fireregs", title: "Part B in 60 seconds", notes: "Reel explaining what a Part B report covers.", pillarId: "pl2", format: "Reel", createdBy: "eve" }),
];

// ─── Reports: last month's month-end, in different states ───
const numbers = (followers: string, change: string, reach: string, engagement: string, published: string, top: string) => ({ followers, followerChange: change, reach, impressions: "", engagementRate: engagement, postsPublished: published, topPost: top, observations: "", screenshots: "" });
export const reports: MonthReport[] = [
  { id: `marker-${lastMonth}`, clientId: "marker", month: lastMonth, numbers: numbers("1,240", "+38", "6,900", "4.1", "8", "Fire door checklist carousel"), numbersBy: "chelsie", numbersAt: ago(16), checked: true, summary: "Eight posts delivered. The practical checklist format earned the strongest engagement.", recommendations: "", approved: true, sentAt: ago(13), reportLink: "", freelancerReport: { name: "Chelsie · last month report.pdf", url: "https://drive.google.com/", addedAt: ago(16), addedBy: "chelsie" }, clientReport: { name: "Marker Group · monthly report.pdf", url: "https://drive.google.com/", addedAt: ago(13), addedBy: "niamh" }, financeReport: { name: "Marker Group · finance statement.pdf", url: "https://drive.google.com/", addedAt: ago(12), addedBy: "maria" }, financeSentAt: ago(12) },
  { id: `housebuild-${lastMonth}`, clientId: "housebuild", month: lastMonth, numbers: numbers("3,180", "+112", "21,400", "5.6", "8", "Span lookup reel"), numbersBy: "velinda", numbersAt: ago(15), freelancerReport: { name: "Velinda · monthly report", url: "https://docs.google.com/", addedAt: ago(15), addedBy: "velinda" }, checked: true, summary: "Reels outperformed static posts three to one.", recommendations: "", approved: true, sentAt: "", reportLink: "" },
  { id: `buildregs-${lastMonth}`, clientId: "buildregs", month: lastMonth, numbers: numbers("860", "+15", "3,200", "3.2", "7", "Building control update"), numbersBy: "ryan", numbersAt: ago(12), freelancerReport: { name: "Ryan · monthly numbers.xlsx", url: "https://docs.google.com/", addedAt: ago(12), addedBy: "ryan" }, checked: false, summary: "", recommendations: "", approved: false, sentAt: "", reportLink: "" },
  { id: `element-${lastMonth}`, clientId: "element", month: lastMonth, checked: false, summary: "", recommendations: "", approved: false, sentAt: "", reportLink: "" },
  { id: `energyfix-${lastMonth}`, clientId: "energyfix", month: lastMonth, checked: false, summary: "", recommendations: "", approved: false, sentAt: "", reportLink: "" },
];

// ─── Leads ───
export const leads: Lead[] = [
  { id: "l1", company: "iRevise", contact: "To add", email: "", sector: "Education", source: "Referral", package: "Essential", value: 500, stage: "Proposal sent", followUp: ago(2), notes: [{ at: ago(9), body: "Proposal sent for Essential. Interested in LinkedIn for school leaders." }], ownerId: "gareth" },
  { id: "l2", company: "Sample lead · M&E consultancy", contact: "To add", email: "", sector: "Engineering", source: "LinkedIn", package: "Growth", value: 1000, stage: "Discovery call", followUp: ahead(2), notes: [{ at: ago(3), body: "Call booked. They want recruitment content." }], ownerId: "gareth" },
  { id: "l3", company: "Sample lead · timber frame builder", contact: "To add", email: "", sector: "Construction", source: "Event", package: "Not sure", value: 500, stage: "Contacted", followUp: ahead(4), notes: [], ownerId: "gareth" },
  { id: "l4", company: "Sample lead · roofing contractor", contact: "To add", email: "", sector: "Construction", source: "Website", package: "Not sure", value: 500, stage: "New", followUp: ago(0), notes: [], ownerId: "gareth" },
  { id: "l5", company: "Sample lead · structural engineers", contact: "To add", email: "", sector: "Engineering", source: "Referral", package: "Growth", value: 1000, stage: "Lost", followUp: "", notes: [{ at: ago(20), body: "Went with an in-house hire." }], ownerId: "gareth" },
];

export function seedState(): State {
  return {
    version: 5,
    me: "maria",
    month: thisMonth,
    people,
    freelancers,
    // Starts empty: clients, posts and leads are added by the team. The sample ones above are kept only so older saved copies can be cleared.
    cleaned: true,
    freelancersCleared: true,
    launchClientsAdded: false,
    logosAdded: false,
    clients: [],
    ideas: [],
    posts: [],
    reports: [],
    leads: [],
    invoices: [],
    payouts: [],
    fixedCosts: [
      { id: "fc1", label: "Publishing tool", amount: 21, category: "Software" },
      { id: "fc2", label: "Canva Pro", amount: 15, category: "Software" },
      { id: "fc3", label: "Google Workspace", amount: 14, category: "Software" },
      { id: "fc4", label: "María's fee", amount: 0, category: "People" },
    ],
    notices: [],
    updates: [],
    playbook: defaultPlaybook(),
    settings: {
      assets: defaultAssets,
      packages: defaultPackages,
      sections: defaultSections(),
      monthly: defaultMonthly(),
      monthLine: defaultMonthLine(),
      defaultApprovalMode: "C",
      reviewer: "ops-first",
      escalationDays: 3,
      followUpDays: 5,
      clientApprovalDays: 3,
      taxSetAside: 25,
      dates: { capture: 5, plan: 8, design: 15, approval: 20, schedule: 25 },
      currency: "EUR",
      rates: { USD: 0.86 },
    },
  };
}

/** The first four clients, as the New client pop-up would collect them. Added once to a state that does not have them. */
export function launchClientDrafts(settings: State["settings"]): { id: string; draft: NewClientDraft }[] {
  const piece = (clientId: string, assetId: string, qty: number): ClientAsset => {
    const found = settings.assets.find((item) => item.id === assetId);
    return { id: `${clientId}-${assetId}`, assetId, name: found?.name ?? assetId, format: found?.format ?? "Single image", kind: "piece", qty, period: "month", source: "custom" };
  };
  const sectionsFor = (assets: ClientAsset[]) => settings.sections.filter((section) => (!section.areas || section.areas.includes("marketing")) && (section.always || assets.some((asset) => settings.assets.find((item) => item.id === asset.assetId)?.sections.includes(section.id)))).map((section) => section.id);
  const make = (id: string, name: string, color: string, fee: number, assets: ClientAsset[]) => ({
    id,
    draft: {
      area: "marketing", startDate: today, setupPosts: 2, name, color, sector: "", mainContact: { name: "", email: "", phone: "" }, approver: { name: "", email: "" }, billingContact: "",
      packageId: "custom", assets, sectionIds: sectionsFor(assets), approvalMode: settings.defaultApprovalMode, fee, currency: "EUR", platforms: ["LinkedIn", "Facebook", "Instagram"], addOnFee: 0,
    } as NewClientDraft,
  });
  return [
    make("house-build", "House Build", "#E08A1E", 750, [piece("house-build", "company-post", 8), piece("house-build", "newsletter", 2)]),
    make("buildreg", "Buildreg", "#2F6FDB", 500, [piece("buildreg", "short-video", 4)]),
    make("firereg", "Firereg.ai", "#5E7F3A", 500, [piece("firereg", "company-post", 8)]),
    make("marker-group", "Marker Group", "#070808", 500, [piece("marker-group", "company-post", 1)]),
  ];
}

export const allStatuses: PostStatus[] = ["Copy in progress", "Copy review", "Design in progress", "Design review", "Client approval", "Ready to schedule", "Scheduled", "Published"];
