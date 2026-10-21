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
  /** Detail steps track the work inside an area. Only the milestones decide "ready for production". */
  detail?: boolean;
  /** The area this step belongs to. Steps from the templates are placed by their group instead. */
  area?: string;
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
  /** Facts about the business, such as target, positioning and the boundary of what we claim. */
  facts?: { id: string; label: string; value: string }[];
  /** Ready-made calls to action and closing lines, to add to a caption. */
  ctas?: { id: string; text: string; group: string }[];
  /** What the content is for. */
  brief?: string;
};

/** What kind of work a client buys. Marketing has posts, packages and the monthly cycle. The others are projects. */
export type AreaKind = "marketing" | "web" | "custom";

export type Client = {
  id: string;
  /** Marketing, web design or another area. Decides which checklists and screens apply. */
  area: AreaKind;
  /** Name of the area when it is "custom", for example Branding. */
  areaName?: string;
  /** For projects: what we are delivering. */
  description?: string;
  /** The first month is mostly set-up and strategy. This is how many posts we promise in it. */
  setupPosts: number;
  /** Manual ticks on the monthly checklists: month, then step id, then the date it was ticked. */
  monthDone: Record<string, Record<string, string>>;
  /** An uploaded document for each part of the starter pack. A link goes in links instead. */
  packFiles?: Partial<Record<"brand" | "brain" | "templates", { name: string; url: string }>>;
  /** What the freelancer starter pack says, in words, so it can be read in the app. */
  packNotes: { brand: string; brain: string; templates: string };
  name: string;
  color: string;
  logo?: string;
  sector: string;
  /** Name of the package they bought, or "Custom". */
  package: string;
  packageId?: string;
  /** What they get: copied from the package at onboarding, then editable for this client only. */
  assets: ClientAsset[];
  /** The checklist sections this client has. Copied from the defaults, then editable for this client only. */
  sections: ClientSection[];
  /** A read-only link and code for the client to see what we choose to show. */
  share: ClientShare;
  stage: "Onboarding" | "Live" | "Paused";
  approvalMode: ApprovalMode;
  mainContact: { name: string; email: string; phone: string };
  approver: { name: string; email: string };
  billingContact: string;
  channel: "Email" | "Google Chat";
  expertReviewer: string;
  ownerId: string;
  opsId: string;
  freelancerId?: string;
  /** What the client pays in. Missing means the main currency in Settings. */
  currency?: string;
  /** What we pay the freelancer in for this client. Missing means the freelancer's own currency. */
  freelancerCurrency?: string;
  freelancerFee: number;
  fee: number;
  addOnFee: number;
  agreedPosts: number;
  platforms: string[];
  startDate: string;
  links: { drive: string; canva: string; publer: string; chat: string; brandKit: string; guide?: string; brain?: string };
  checklist: CheckItem[];
  strategy: Strategy;
  /** Light time tracking: hours per month per role. */
  hours: Record<string, { owner: number; ops: number; freelancer: number }>;
  /** Mode A and B: the client approves the month's plan. */
  planApproval: Record<string, { status: "Not sent" | "Sent" | "Approved"; date: string; via: string }>;
  /** Who can get into which account. Never passwords: only the vault reference. */
  access: AccessItem[];
  files: ClientFile[];
  /** Extra costs on this client. They also appear in Finance. */
  costs: ClientCost[];
};

/** "piece" counts towards the pieces a month in a package. "extra" is reviewed too but counted separately, like a newsletter. */
export type AssetKind = "piece" | "extra";
export type AssetPeriod = "month" | "quarter";

/** A kind of work we make, kept in Settings. */
export type AssetType = {
  id: string;
  name: string;
  /** Not used any more. An asset is just a kind of work. How many, and how often, is set where it is added to a package or a client. */
  kind?: AssetKind;
  /** Post format used for the artwork and the post type. */
  format: string;
  /** What we charge when it is sold as an add-on, per month. Leave blank if not set. */
  price?: number;
  /** Checklist sections a client needs when they get this asset. */
  sections: string[];
};

export type PackageItem = { assetId: string; qty: number; period: AssetPeriod };

export type PackageDef = {
  id: string;
  name: string;
  /** "From" price per month. */
  price: number;
  tagline: string;
  blurb: string;
  items: PackageItem[];
  /** Everything else included that is not an asset, for example calls and monitoring. */
  includes: string[];
  channels: string;
  /** Monthly report is the fuller version with recommendations. */
  fullReport: boolean;
  recommended?: boolean;
};

export type StepKind = "key" | "detail" | "info";
export type SectionStep = { id: string; label: string; group: string; kind: StepKind; owner: string; hint?: string; /** Only for these areas. Leave out for every area. */ areas?: AreaKind[] };

/** A default checklist section kept in Settings. Changing it affects new clients only. */
export type SectionDef = {
  id: string;
  /** Areas this section applies to. Leave out for every area. */
  areas?: AreaKind[];
  label: string;
  color: string;
  blurb: string;
  /** Always added to a new client, whatever they buy. */
  always: boolean;
  steps: SectionStep[];
};

export type ClientSection = { id: string; label: string; color: string; blurb: string };

export type ClientAsset = {
  id: string;
  /** Extra work can be given to a freelancer. It then shows up for them until it is made. */
  assignedTo?: string;
  /** Turn an assignment off without removing it. Treated as on when not set. */
  active?: boolean;
  due?: string;
  /** What the freelancer needs to know to make it. */
  brief?: string;
  /** The asset in Settings this was copied from. Custom assets have none. */
  assetId?: string;
  name: string;
  format: string;
  kind: AssetKind;
  qty: number;
  period: AssetPeriod;
  price?: number;
  source: "package" | "add-on" | "custom";
};

export type ClientShare = { enabled: boolean; token: string; code: string; postIds: string[] };

export type AccessItem = {
  id: string;
  platform: string;
  account: string;
  ownedBy: "Client" | "Agency";
  people: string;
  status: "Requested" | "Active" | "Removed";
  date: string;
  vaultRef: string;
};

export type Attachment = { name: string; url: string; addedAt: string; addedBy: string };
export type ClientFile = Attachment & { id: string; category: "Brand" | "Contract" | "Report" | "Photos" | "Other" };
export type ClientCost = { id: string; label: string; amount: number; month: string; recurring: boolean };

/** "Done" means the post was already made or scheduled before the idea was added here. */
export type IdeaDecision = "New" | "Approved" | "Maybe" | "Rejected" | "Done";

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
  /** The topic line from the research. */
  topic?: string;
  /** Drafted wording from the research, used to start the caption. */
  angle?: string;
  /** Where it sits in the research, for example "Priority 1". */
  group?: string;
  postId?: string;
  /** The month the idea is planned for. */
  month: string;
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

/** `pageOf` marks an image that is one page of an attached PDF, drawn so the PDF can be seen as slides. */
export type PostFile = { id: string; name: string; src: string; kind: "image" | "pdf" | "video" | "other"; pageOf?: string; /** Width divided by height, so the picture is shown in its own shape and never cropped. */ ratio?: number };

export type Post = {
  id: string;
  clientId: string;
  /** The freelancer update this post was sent in, if any. */
  updateId?: string;
  ideaId?: string;
  /** Extra work, such as a brochure. It does not count towards the monthly posts. */
  extra?: boolean;
  /** What kind of extra it is, for example "Brochure". */
  extraType?: string;
  /** Who the freelancer chose to review it. Falls back to the usual reviewer. */
  reviewerId?: string;
  title: string;
  format: string;
  /** The client's asset this post counts against, such as "Project carousel". */
  assetId?: string;
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
  /** Ticked items of the quality checklist the freelancer works through. */
  qa?: string[];
  expertOk: boolean;
  /** When the current review or client step started, for escalation. */
  waitingSince: string;
  clientDecision?: { status: "Approved" | "Changes requested"; via: string; date: string; note: string };
  scheduledVia?: string;
  liveUrl?: string;
};

/** What the create-post flow collects. */
export type PostDraft = {
  clientId: string;
  ideaId?: string;
  extra?: boolean;
  extraType?: string;
  assetId?: string;
  title: string;
  format: string;
  platforms: string[];
  date: string;
  copy: string;
  /** A different caption for some channels. Empty means the same caption everywhere. */
  captions: Record<string, string>;
  files: PostFile[];
  reviewerId?: string;
  /** Send it for review now, or keep it as a draft to finish later. */
  send: boolean;
};

/** A message from a freelancer with the posts that came with it. */
export type FreelancerUpdate = { id: string; clientId: string; by: string; date: string; at: string; message: string; reviewerId?: string; postIds: string[] };

/** One post in an update, before it is made. */
export type UpdateItem = { title: string; format: string; platforms: string[]; date: string; copy: string; files: PostFile[]; send: boolean };

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

/** A report for part of the month: one week, or weeks in a row. The full month report is the MonthReport itself. */
export type WeekReport = {
  byPlatform?: Record<string, ReportNumbers & { savedAt: string; savedBy: string }>;
  checks?: Record<string, string>;
  submittedAt?: string;
  freelancerReport?: Attachment;
};
/** "month" for the full month, "w2" for week 2, "w1-2" for weeks 1 and 2 together. */
export type ReportPeriod = string;

export type MonthReport = {
  id: string;
  clientId: string;
  month: string;
  numbers?: ReportNumbers;
  numbersBy?: string;
  numbersAt?: string;
  /** Key numbers for each platform, saved one by one. `numbers` holds the main one for the client report. */
  byPlatform?: Record<string, ReportNumbers & { savedAt: string; savedBy: string }>;
  /** Steps on the freelancer's report checklist that are ticked by hand. */
  checks?: Record<string, string>;
  /** When the freelancer handed the report to operations. */
  submittedAt?: string;
  /** Reports for one week or several weeks in a row, if the freelancer sends them that way. Keyed like "w1" or "w1-2". */
  weekly?: Record<string, WeekReport>;
  checked: boolean;
  summary: string;
  recommendations: string;
  approved: boolean;
  sentAt: string;
  reportLink: string;
  /** The freelancer's month-end report, as a file or link. */
  freelancerReport?: Attachment;
  /** The report we send the client. */
  clientReport?: Attachment;
  financeReport?: Attachment;
  financeSentAt?: string;
};

export type LeadStage = "New" | "Contacted" | "Discovery call" | "Proposal sent" | "Won" | "Lost";

export type Lead = {
  id: string;
  company: string;
  contact: string;
  email: string;
  sector: string;
  source: string;
  /** Name of a package in Settings, or "Not sure". */
  package: string;
  value: number;
  stage: LeadStage;
  followUp: string;
  notes: { at: string; body: string }[];
  ownerId: string;
  clientId?: string;
};

/** Work a freelancer did for us: what, for whom, and what it cost. */
export type FreelancerJob = { id: string; date: string; clientId?: string; client?: string; what: string; amount: number; link?: string };

export type Freelancer = Person & {
  speciality: string;
  /** Where we found them: Fiverr, Upwork, Direct, Other. */
  platform: string;
  profileUrl: string;
  phone: string;
  notes: string;
  /** Work done for us, newest first. */
  jobs: FreelancerJob[];
  rate: string;
  currency: string;
  paymentMethod: string;
  capacity: number;
  services: string;
  portfolio: string;
  /** Directory: someone we know about but have not hired. */
  status: "Active" | "Trial" | "Offboarded" | "Directory";
  checklist: CheckItem[];
};

export type Invoice = { clientId: string; month: string; status: "Not sent" | "Sent" | "Paid"; date: string };
/** A freelancer payment. The amount is in the currency it was paid in. */
export type Payout = { clientId: string; month: string; status: "Paid"; date: string; amount?: number; currency?: string };
export type FixedCost = { id: string; label: string; amount: number; category: string };

export type Notice = {
  id: string;
  to: string;
  text: string;
  at: string;
  read: boolean;
  channels: ("In app" | "Email" | "Google Chat")[];
  link: Route;
};

/** A step on the monthly checklist. Operations and the freelancer each have one. */
export type MonthlyStep = {
  id: string;
  label: string;
  role: "ops" | "freelancer";
  /** First month is set-up. "regular" is every month after. */
  when: "first" | "regular" | "always";
  /** Ticks itself from the work when set. Otherwise someone ticks it. */
  auto?: string;
  /** Only shown when this applies to the client. */
  needs?: "marketing" | "client-review" | "newsletter";
  hint?: string;
};

/** One point on "the month on one line". */
export type MonthMark = {
  id: string;
  /** The default dates in Settings this mark drives, if any. */
  key?: "capture" | "plan" | "design" | "approval" | "schedule";
  day: number;
  label: string;
  who: string;
  color: string;
  /** What should be happening in the run-up to this day. */
  note: string;
};

/** Something attached to a slot: a resource made once, a reusable prompt, or an SOP. */
export type PlaybookItemKind = "resource" | "prompt" | "sop";
export type PlaybookItem = {
  id: string;
  kind: PlaybookItemKind;
  title: string;
  /** A link. Starts with # for a page inside the OS. */
  url?: string;
  file?: { name: string; url: string };
  /** The prompt itself, or the steps of an SOP, or a note. */
  text?: string;
  addedBy: string;
  addedAt: string;
};
/** A thing the agency needs to have ready, such as a contract or a research prompt. */
export type PlaybookSlot = { id: string; title: string; /** Needed before the first new client. */ key: boolean; attachments: PlaybookItem[] };
/** A stage of the client journey, or an area of the business. */
export type PlaybookStage = { id: string; title: string; owner: string; color: string; icon: string; slots: PlaybookSlot[]; forFreelancer?: boolean };
export type Playbook = { workflow: PlaybookStage[]; areas: PlaybookStage[] };

export type Settings = {
  monthLine: MonthMark[];
  monthly: MonthlyStep[];
  assets: AssetType[];
  packages: PackageDef[];
  sections: SectionDef[];
  defaultApprovalMode: ApprovalMode;
  reviewer: "ops-first" | "maria-all";
  escalationDays: number;
  followUpDays: number;
  clientApprovalDays: number;
  taxSetAside: number;
  dates: { capture: number; plan: number; design: number; approval: number; schedule: number };
  currency: string;
  /** What one unit of another currency is worth in the main currency. USD: 0.86 means 1 USD = 0.86 EUR. */
  rates?: Record<string, number>;
};

export type Route =
  | { view: "today" }
  | { view: "clients" }
  | { view: "client"; clientId: string; tab?: string; sub?: string; postId?: string }
  | { view: "marketing"; clientId?: string; tab?: string; postId?: string; filter?: string }
  | { view: "reports"; clientId?: string; month?: string }
  | { view: "leads"; leadId?: string }
  | { view: "freelancers"; freelancerId?: string }
  | { view: "finance" }
  | { view: "settings"; tab?: string }
  | { view: "view"; token: string }
  | { view: "how" };

export type State = {
  version: number;
  /** Set once the sample clients, posts and leads have been cleared away. */
  cleaned?: boolean;
  /** Set once the sample freelancers have been cleared away. */
  freelancersCleared?: boolean;
  /** Set once the first four clients have been added. */
  launchClientsAdded?: boolean;
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
  playbook: Playbook;
  /** Updates the freelancers have sent, newest first. */
  updates: FreelancerUpdate[];
  settings: Settings;
};

/** Everything the new-client wizard collects. */
export type NewClientDraft = {
  area: AreaKind;
  areaName?: string;
  description?: string;
  startDate: string;
  setupPosts: number;
  name: string;
  color: string;
  logo?: string;
  sector: string;
  mainContact: { name: string; email: string; phone: string };
  approver: { name: string; email: string };
  billingContact: string;
  /** Id of a package in Settings, or "custom". */
  packageId: string;
  assets: ClientAsset[];
  /** Checklist sections to set up for this client. */
  sectionIds: string[];
  approvalMode: ApprovalMode;
  freelancerId?: string;
  fee: number;
  /** What the client pays in. Missing means the main currency in Settings. */
  currency?: string;
  /** Channels they are posted on. */
  platforms?: string[];
  addOnFee: number;
  leadId?: string;
};
