# Agency OS · The Works

The operating system for The Works: one place for client checklists, freelancer checklists, the monthly content cycle, approvals, reporting, leads and finance.

## What is where

| Screen | For | What it does |
|---|---|---|
| Today | Everyone (freelancers get quick actions: Create post, Ideas deck, Month-end report) | Greeting, the posts in review (as artwork), what goes out this week, clients at a glance (name, logo, progress only), and who is on which account. "In review now" is one big number you can expand or open in full |
| Clients | Owners, operations | Just logo, name and stage. **New client** opens a five-step pop-up: who (with start date and "add logo later"), people (can be skipped), area (Marketing, Web design or something else), services, set-up. Marketing clients pick Essential, Growth or custom. Other areas get a description, deliverables and a price, and only the checklists that apply |
| Client page | Owners, operations (freelancers see Marketing and Reporting only) | Overview (with what they get and Edit profile for colour and logo), Strategy (offer, personas, pillars), Checklists (one card per area, open any area for its full tick-list and add steps for this client), Access, Reporting, Files & links, Client view (share link + code, drag posts the client can see), Finance (owners) |
| Marketing | Everyone (freelancers see their own clients) | A pill at the top right switches between All clients and one client, with logos. A menu on the left: Posts, Ideas (upload or paste a research document and it is filed: facts about the business go to the client's Strategy tab, calls to action go to a library, ideas become cards with the decision read from the highlight colours; tap an idea to see its topic, why it matters and the content angle (draft copy). Card colours follow the document: yellow is a carousel to make, blue a text post to make, red rejected, green already made, grey to decide. After filing, a summary shows where everything went. A "Use" idea has a Create post button that starts the caption from the draft copy), Calendar, Results, My checklist, and the freelancer starter pack (closed until opened; brand guide, strategy brain, Canva templates shown as documents in the page). Posts (one group per step: Needs approval, With freelancer, With client, Approved, Scheduled & posted, All. Clicking a post waiting for approval opens the one-by-one review: Approve, Ask for changes, Skip, Back), Calendar (drag to move, open slots for agreed posts), Ideas (upload a document, approve / maybe / reject), This month (the monthly checklists) and Results (the freelancer's report for week 1, week 2, week 3 or the full month: a checklist, key numbers saved per platform, the document, then hand it to operations) |
| Post review | Everyone | Artwork and caption as they will appear, one conversation with change requests to tick off, the next action at the bottom, edit panel for the freelancer, Next for you |
| Reports | Everyone | Month-end per client: freelancer report in, client report sent, finance statement sent (owners) |
| Leads | Owners | Pipeline by stage. Marking a lead as won opens the New client pop-up with the lead filled in |
| Freelancers | Owners, operations | Setup tick-list with the NDA/contract gate, accounts, services and prices |
| Finance | Owners | Fees, invoices, payouts after the client pays, client and agency costs, profit, tax set-aside, finance statements, hours by account |
| This month (client page) | Owners, operations; freelancers see theirs in Marketing | Two monthly checklists per client: Operations and Freelancer. The first month is a set-up month with its own list and fewer posts. Steps tick themselves from posts, reports and invoices, or are ticked by hand. When the freelancer finishes theirs, operations is told |
| Starter pack | Everyone on the client | Brand guide, strategy brain and Canva templates readable in the app (a written summary plus what is in each), with a link to the full document. On the client page and in Marketing |
| Create post | Freelancers, operations | A five-step pop-up: client and month (with the day, so the post counts for that month), from an idea or new, type and channels, caption (the same on every channel or a different one for each) and files (several for a carousel, one for a single image, a video for a reel, a PDF for a newsletter; every file can be opened full size), and who reviews it, chosen from a list. Send for review or save a draft |
| Extra work | Operations assign, freelancers make | Brochure, flyer, video, reel, e-book, lead magnet, exhibition material and more are added to a client as add-ons (Settings → Assets has the list). On the client page, "Assign to a freelancer" gives one a due date and a brief; it then shows in that freelancer's Marketing menu, under My checklist, with a slim alert on their Today page, until it is made. In Create post, choose "Extra work" instead of "One of the monthly posts". Extras are not counted in the monthly total |
| PDF carousels | Everyone | Upload a LinkedIn carousel as one PDF and each page is drawn as a slide, so it can be flipped through, opened full size and reviewed like images. The PDF stays attached for downloading. A PDF attached earlier has a "Show pages" button in the post editor. Pictures and pages keep their own shape and are never cropped |
| Review one by one | Owners, operations | Opens each post waiting for review as it will appear, with Approve, Ask for changes and Skip |
| Settings | Owners | Packages (built from assets, with prices), Assets (post types, add-ons, prices), default Checklists (onboarding, access, strategy, website project…), Monthly checklists, Rules, General. Changes are defaults for new clients; existing clients keep their own |
| Client view | Client, with code | Read-only calendar of the posts you chose. The client only answers if you asked them to review |
| How we work | Everyone | "The month on one line" with a "you are here" marker and the next thing to do (owners can edit the dates, names and notes). Then three tabs: Client journey (8 stages from sales to reporting), Business areas (10 areas), and Day to day (post journey, month-end report, notifications, approval modes, rules). Every item can have Resources, Prompts and SOPs attached (link, file or text, with Copy for prompts). Owners can add, rename, reorder and remove stages and items |

Use the name at the bottom of the sidebar to preview the OS as María, Gareth, Niamh (operations) or a freelancer.

## Checklist areas on every client

Each client has eight areas. Six are ticked by hand: Onboarding, Access, Strategy brain (the research), Brand & creative guide (positioning, visual identity, social treatments, freelancer rules, quality sign-off, following Garrett's guide), Canva templates (ten editable masters in portrait and square) and Freelancer handoff. Two fill themselves in from the work: Content this month, and Reports & money. Key steps decide whether a client is ready for production; the detail steps track the work inside an area. Steps can be added or removed per client. The freelancer sees a starter pack (guide, brain, Canva templates) at the top of Marketing, and a quality checklist on every post.

## How a post moves

Idea approved → copy → copy review → design → design review (expert check for technical claims) → client approval (mode A, logged by operations) → scheduled → live. Each step shows whose turn it is, notifies the next person, and logs change requests with a category (brand, copy, layout, factual) for the freelancer to tick off. Posts without uploaded artwork show a branded preview drawn from the title and client colour.

## Data in this version

Sample data is generated around today's date. Changes are saved in this browser only (localStorage), so each device has its own copy. "Reset sample data" in How we work restores it. Files under 1.5 MB are kept; larger ones last only for the session. Email and Slack notifications are shown in the bell but not sent until a database and email provider are connected (see `supabase/`).

The previous version is still available at `/classic/`.

## Run it

```bash
npm install
npm run dev
```

Code: `app/page.tsx` (routes), `components/works/` (screens), `lib/works/` (types, seed data, rules, store).

---

## Previous README

# Agency OS

Phase 1 workspace prototype for a small content agency. The interface is available in demo mode; the database is designed for a separate Supabase project and does not reuse the command center's auth or data.

## Run the preview

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The screen uses illustrative content and local state until Supabase is configured.

## Connect Supabase

1. Create a new Supabase project dedicated to Agency OS.
2. Copy `.env.example` to `.env.local` and fill in the project's URL and anon key.
3. Run `supabase/schema.sql`, then `supabase/seed.sql` in the Supabase SQL editor.
4. Invite users from Supabase Auth. A database trigger creates a freelancer profile by default; promote María/Gareth to `admin`/`partner` through the Supabase SQL editor before they sign in.
5. Create a private Storage bucket named `assets`; `schema.sql` includes account-scoped policies.

Never add a service-role key to browser environment variables. RLS is the boundary for data access. The public showcase intentionally includes the example project fees and report links supplied for this demo. Do not treat the figures as accounting records.

## Phase 1 state

The public showcase has Home, project workspaces, an inbox for review, a visual calendar, client ideas and assets, weekly reports, a client preview, team records, CRM, operations, and internal finance. The account-first post form accepts several platforms, shared or channel-specific copy, a Canva or Drive link, several images or files, and a choice to save a draft, add to the plan, or send for review. Review comments and decisions remain with the post in this browser session.

Seeded account names and fees include Marker Group ($500 monthly), Buildreg ($500 monthly), House Build ($750 monthly), Element ($1,000), CapCon ($1,000), EnergyFix ($500), and iRevise ($500 pending showcase). Firereg has no confirmed fee. Marker Group is assigned to Chelsie at $110 monthly, with María approving posts. House Build is assigned to Velinda at $100 monthly. Ryan is assigned to Buildreg; his rate has not been supplied and remains unset. Three additional $1,000 rows from the earlier sheet are still marked as pending names. The unconfirmed $5,000 Agency operations job is excluded.

Supplied brand marks appear for Marker Group, House Build, iRevise, and Firereg. Buildreg uses a branded monogram until its logo is supplied. The House Build and Firereg sample posts use the artwork supplied for the showcase. The public page is a visual prototype: role selection illustrates access boundaries but is not authentication. Invoice and payout statuses are sample browser state, not payment confirmations.
The supplied client fees and named freelancer allocations are seeded into a public showcase alongside illustrative posts and workflow records. Interactive edits, comments, reports, expenses, and status changes reset on refresh. Brief edits, image previews, and document previews are held only in browser memory; files are not uploaded to persistent storage. Revenue and freelancer cost data are not accounting records, and tax calculations are not included. The client portal is a clickable showcase preview, not a secured client login. Supabase Auth/invites, persistent data loading/actions, full brief and weekly update persistence, real uploads, invoice delivery, and live notifications still need wiring before production. SQL includes core roles, scoped policies, brief approval transaction, post events/versioning, notifications, and storage policies as a foundation. Real finance reporting, time logging, meetings, and automated email remain later phases.






The Operations area includes Garrett’s plain-language explainer, an editable client-stage board, repeatable onboarding/security/delivery/reporting SOPs, and a freelancer directory template with skill, rate, availability, NDA, payment method, and backup fields. Financials adds an expense and freelancer payout ledger with recurring/custom frequency, due dates, payment status, and Revolut reconciliation references. These records are browser-only in the public demo.

## Content workflow in this local version

Each marketing project now starts with a client profile containing strategy and Brand Kit fields. The content pipeline shows counts and the next owner for each stage. The existing Ideas & assets tab accepts individual ideas or bulk `.txt`, `.md`, `.csv`, and `.json` lists, presents imported drafts for review, and records the approver's yellow carousel, blue text, red irrelevant, or green created decision. Creating a post from an approved idea keeps the idea and links the resulting draft. Research sources, inspiration, and categorized industry accounts live beside the ideas. Industry account lists accept CSV with `name`, `url`, `category`, and `note` columns. Excel files should be exported as CSV first.

The post detail allows a freelancer to save a new creative/caption version after feedback and submit it again. After approval, the freelancer or agency can record a manual or Publer schedule date and later mark the post published. Schedule and live URLs are optional. These are manual status records; no Publer API or publishing automation is connected.

Weekly report creation accepts an attached source document. Text, Markdown, and CSV can suggest metrics and narrative in an editable draft; PDF and Word files remain attached references that require manual entry. Screenshots and images can be added to report sections. The app does not claim to extract figures or images from PDF/Word, and all imported values must be reviewed before saving. Report sharing to the client preview remains a separate internal decision. All changes are browser-only until a backend, authenticated roles, durable storage, and notifications are implemented.
