# Command center reference notes

- Keep the account-centered workspace, brand guidance, idea bank, scheduled content, and visible post states.
- Keep fast approve/request-changes actions and threaded feedback close to the content.
- Keep account logos, brand files, and reference media available in the account workspace.
- Keep status history and unread activity signals so handoffs are visible.
- The current marketing workspace spreads posts, calendar, ideas, plan, and brand across separate tabs; this build makes the inbox the first stop and review decisions explicit.
- The existing calendar uses a small status set (`draft`, `pending_approval`, `approved`, `changes_requested`, `posted`); this build uses the richer production pipeline from brief to publish.
- Existing contractor access uses a share token rather than an authenticated role; this build requires Supabase Auth and account membership for freelancers.
- Existing marketing policies allow any authenticated user full access; this build scopes reads and writes by role and assigned account in RLS.
- Existing comments store author names and roles as text; this build associates comments with authenticated profile IDs and visibility.
- The reference relies on service-role routes for external uploads; this build keeps uploads private and scopes the `assets` bucket by account membership.
- The existing account page loads large groups of unrelated data together; this build separates inbox, review, and account workspace tasks around the next action.
- The reference has no operational weekly brief decision loop; this build turns submitted topics into reviewable decisions and approved topics into posts.

# Phase 1 plan

1. Establish a separate Next.js App Router app with Inter, Tailwind, Supabase Auth, typed client setup, and a private environment template.
2. Create the Phase 1 schema with profiles, account membership, packages, briefs/blocks, posts/events, comments/mentions, notifications, and RLS policies. Keep money in staff-only tables.
3. Seed the seven provided packages/accounts and mark fee figures as unconfirmed in setup notes; do not seed users.
4. Build the first daily workflow: role-aware inbox, accounts, account brand/team/settings, weekly brief editing and reading, review queue with shortcuts, post pipeline/detail, and notifications.
5. Add the `approve_brief` transaction, status/version triggers, private asset storage policies, and invite flow hooks.
6. Provide local setup instructions, then review the Phase 1 experience and resolve the fee figures before connecting a live Supabase project.

## Seed figures to confirm

The prompt supplies monthly fees and package targets. These are represented as proposed seed values only and need María's confirmation before production use. Package fees are not copied into live billing records by the seed.
