// Data model for The Works Agency OS.

export type Role = "owner" | "ops" | "freelancer";

export type Person = {
  id: string;
  name: string;
  role: Role;
  title: string;
  email: string;
  color: string;
};

export type CheckStatus = "Not asked" | "Requested" | "Received" | "N/A";

export type CheckItem = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  /** Soft checks are information, not blockers. */
  soft?: boolean;
  /** Owner: a person id, or "client". */
  owner: string;
  status: CheckStatus;
  date: string;
  /** Answer, link or note. */
  note: string;
};

export type ApprovalMode = "A" | "B" | "C";

export type Persona = { id: string; name: string; cares: string; pains: string; wants: string };
export type Pillar = { id: string; name: string; color: string };

export type Strategy = {
  /** What the account is trying to sell, in one or two sentences. */
  offer: string;
  services: string;
  personas: Persona[];
  pillars: Pillar[];
  tone: string;
  avoid: string;
  /** Claims that need the client's expert to confirm. */
  claims: string;
  approved: boolean;
};

export type Client = {
  id: string;
  name: string;
  color: string;
  logo?: string;
  sector: string;
  package: "Essential" | "Growth";
  addOns: string[];
  stage: "Onboarding" | "Live" | "Paused";
  approvalMode: ApprovalMode;
  mainContact: { name: string; email: string; phone: string };
  approver: { name: string; email: string };
  billingContact: string;
  channel: "Email" | "Slack" | "Google Chat";
  expertReviewer: string;
  ownerId: string;
  opsId: string;
  freelancerId?: string;
  freelancerFee: number;
  fee: number;
  addOnFee: number;
  agreedPosts: number;
  platforms: string[];
  startDate: string;
  links: { drive: string; canva: string; publer: string; chat: string; brandKit: string };
  checklist: CheckItem[];
  strategy: Strategy;
  /** Light time tracking: hours per month per role. */
  hours: Record<string, { owner: number; ops: number; freelancer: number }>;
  /** Mode A and B: the client approves the month's plan. */
  planApproval: Record<string, { status: "Not sent" | "Sent" | "Approved"; date: string; via: string }>;
};

export type IdeaDecision = "New" | "Approved" | "Maybe" | "Rejected";

export type Idea = {
  id: string;
  clientId: string;
  title: string;
  notes: string;
  pillarId?: string;
  format: string;
  decision: IdeaDecision;
  comment: string;
  createdBy: string;
  createdAt: string;
  source?: string;
  postId?: string;
};

export type PostStatus =
  | "Copy in progress"
  | "Copy review"
  | "Design in progress"
  | "Design review"
  | "Client approval"
  | "Ready to schedule"
  | "Scheduled"
  | "Published";

export type RevisionCategory = "Brand" | "Copy" | "Layout" | "Factual";

export type PostComment = {
  id: string;
  by: string;
  body: string;
  at: string;
  kind: "comment" | "change" | "system";
  category?: RevisionCategory;
  resolved?: boolean;
};

export type PostFile = { id: string; name: string; src: string; kind: "image" | "pdf" | "video" | "other" };

export type Post = {
  id: string;
  clientId: string;
  ideaId?: string;
  title: string;
  format: string;
  pillarId?: string;
  platforms: string[];
  date: string;
  status: PostStatus;
  copy: string;
  /** Different wording for a platform or account type. Falls back to `copy`. */
  captions: Record<string, string>;
  files: PostFile[];
  art: string;
  designLink: string;
  driveLink: string;
  version: number;
  comments: PostComment[];
  history: { at: string; by: string; text: string }[];
  needsExpert: boolean;
  expertOk: boolean;
  /** When the current review or client step started, for escalation. */
  waitingSince: string;
  clientDecision?: { status: "Approved" | "Changes requested"; via: string; date: string; note: string };
  scheduledVia?: string;
  liveUrl?: string;
};

export type ReportNumbers = {
  followers: string;
  followerChange: string;
  reach: string;
  impressions: string;
  engagementRate: string;
  postsPublished: string;
  topPost: string;
  observations: string;
  screenshots: string;
};

export type MonthReport = {
  id: string;
  clientId: string;
  month: string;
  numbers?: ReportNumbers;
  numbersBy?: string;
  numbersAt?: string;
  checked: boolean;
  summary: string;
  recommendations: string;
  approved: boolean;
  sentAt: string;
  reportLink: string;
};

export type LeadStage = "New" | "Contacted" | "Discovery call" | "Proposal sent" | "Won" | "Lost";

export type Lead = {
  id: string;
  company: string;
  contact: string;
  email: string;
  sector: string;
  source: string;
  package: "Essential" | "Growth" | "Not sure";
  value: number;
  stage: LeadStage;
  followUp: string;
  notes: { at: string; body: string }[];
  ownerId: string;
  clientId?: string;
};

export type Freelancer = Person & {
  speciality: string;
  rate: string;
  currency: string;
  paymentMethod: string;
  capacity: number;
  services: string;
  portfolio: string;
  status: "Active" | "Trial" | "Offboarded";
  checklist: CheckItem[];
};

export type Invoice = { clientId: string; month: string; status: "Not sent" | "Sent" | "Paid"; date: string };
export type Payout = { clientId: string; month: string; status: "Paid"; date: string };
export type FixedCost = { id: string; label: string; amount: number; category: string };

export type Notice = {
  id: string;
  to: string;
  text: string;
  at: string;
  read: boolean;
  channels: ("In app" | "Email" | "Slack")[];
  link: Route;
};

export type Settings = {
  defaultApprovalMode: ApprovalMode;
  reviewer: "ops-first" | "maria-all";
  escalationDays: number;
  followUpDays: number;
  clientApprovalDays: number;
  taxSetAside: number;
  dates: { capture: number; plan: number; design: number; approval: number; schedule: number };
  currency: string;
};

export type Route =
  | { view: "today" }
  | { view: "clients" }
  | { view: "client"; clientId: string; tab?: string; sub?: string; postId?: string }
  | { view: "content" }
  | { view: "reports" }
  | { view: "leads"; leadId?: string }
  | { view: "freelancers"; freelancerId?: string }
  | { view: "finance" }
  | { view: "how" };

export type State = {
  version: number;
  me: string;
  month: string;
  people: Person[];
  freelancers: Freelancer[];
  clients: Client[];
  ideas: Idea[];
  posts: Post[];
  reports: MonthReport[];
  leads: Lead[];
  invoices: Invoice[];
  payouts: Payout[];
  fixedCosts: FixedCost[];
  notices: Notice[];
  settings: Settings;
};
