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

This is a visual operations prototype: Home with saturated metric cards, projects across marketing/web development/operations, a filtered review queue, full post review with a 70/30 work-and-conversation layout, project content filters, larger portrait previews in project and agency calendars with high-contrast client-color labels, idea/brand libraries, weekly freelancer reports, and partner financials. Home now features an actual post image for the next review decision. FireRegs.ai has four sample posts built from the supplied product walkthrough and campaign images. Project detail opens on Overview with contract type, agreed fee, add-on scope, and freelancer cost; marketing projects have separate Plan, Content, Calendar, Ideas, and Brand sections. The global Idea Bank is client-selectable and follows the Command Center inspiration-board pattern with ideas, brand document uploads, inspiration uploads/links, and similar-account references. Weekly Updates contains Ryan's Marker Group report grouped into the 5–11 October Monday–Sunday week. Numeric analytics are left blank because the messages supplied no figures. New weekly reports support a Monday week picker, multiple platform reports per client/week, audience and engagement metrics, per-post results, next-week notes, comments, links, and repeatable freeform text/image sections. Project Overview includes editable social and tool link chips; URLs are entered per client rather than fabricated. Freelancer view is limited to assigned accounts and shows the freelancer fee allocated to that project, without client contract revenue or agency financials. Supplied brand marks are used for Marker Group, Housebuild, iRevise, and FireRegs.ai; BuildRegs will use its logo when provided. Housebuild sample content includes the timber span carousel, span lookup reel, and structural opening post using supplied artwork in `public/posts/`. Review actions change each post's status in local browser state and add activity history. Financials use the named client retainers and per-project freelance cost estimates supplied by María: Marker Group ($500), BuildRegs ($500), Element ($1,000), iRevise ($500 pending showcase), Housebuild ($750), CapCon ($1,000), and EnergyFix ($500), in USD. Three additional $1,000 rows from the sheet appear as Projects 3–5 with names pending. Together, these show $7,750 monthly revenue, $1,620 freelance costs, and $6,130 margin before tax and other costs. The unconfirmed $5,000 Agency operations job is excluded. Invoice states start as drafts because actual sent/received status was not supplied; invoice states start as drafts and cost-payment states as unmarked until updated; actions are local demo state. Creating a project captures its work type and revenue model.

All figures, posts, projects, comments, weekly updates, uploaded library files, references, and status changes are illustrative and reset on refresh. Brief edits, image previews, and document previews are held only in browser memory; files are not uploaded to persistent storage. Revenue and freelancer cost data are not accounting records, and tax calculations are not included. The client portal is a clickable showcase preview, not a secured client login. Supabase Auth/invites, persistent data loading/actions, full brief and weekly update persistence, real uploads, invoice delivery, and live notifications still need wiring before production. SQL includes core roles, scoped policies, brief approval transaction, post events/versioning, notifications, and storage policies as a foundation. Real finance reporting, time logging, meetings, and automated email remain later phases.




