-- Agency OS Phase 1. Run only in the separate Agency OS Supabase project.
create extension if not exists pgcrypto;
do $$ begin create type public.user_role as enum ('admin','partner','freelancer','client'); exception when duplicate_object then null; end $$;
do $$ begin create type public.account_status as enum ('prospect','onboarding','active','paused','ended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.member_role as enum ('lead','writer','designer','technical','client'); exception when duplicate_object then null; end $$;
do $$ begin create type public.post_status as enum ('planned','in_production','internal_review','changes_requested','client_review','approved','scheduled','posted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.post_format as enum ('carousel','single_image','text','video','newsletter','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.brief_status as enum ('draft','submitted','approved','changes_requested'); exception when duplicate_object then null; end $$;
do $$ begin create type public.block_type as enum ('heading','text','image','topic','link','gdoc'); exception when duplicate_object then null; end $$;
do $$ begin create type public.topic_decision as enum ('pending','approved','cut','revise'); exception when duplicate_object then null; end $$;
do $$ begin create type public.visibility as enum ('internal','client'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default 'New user', email text not null,
 role public.user_role not null default 'freelancer', avatar_url text,
 skills text[] not null default '{}', weekly_capacity_hours numeric not null default 10,
 active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.agency_settings (
 id int primary key default 1 check(id=1), agency_name text not null default '[Agency name]', logo_url text,
 currency text not null default 'EUR', partner_splits jsonb not null default '[]'
);
create table if not exists public.packages (
 id uuid primary key default gen_random_uuid(), name text not null unique,
 monthly_fee numeric not null check(monthly_fee>=0), posts_per_month int not null check(posts_per_month>0),
 platforms text[] not null default '{}', extras text[] not null default '{}', description text, active boolean not null default true
);
create table if not exists public.accounts (
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
 status public.account_status not null default 'onboarding', package_id uuid references public.packages,
 brand_color text not null default '#6B7280', logo_url text, drive_folder_url text,
 brief_due_weekday int not null default 4 check(brief_due_weekday between 1 and 7),
 client_approval_required boolean not null default false, client_auto_approve_days int,
 default_writer_id uuid references public.profiles, default_designer_id uuid references public.profiles,
 posts_per_month_override int, start_date date, created_at timestamptz not null default now()
);
create table if not exists public.account_billing (
 account_id uuid primary key references public.accounts on delete cascade,
 monthly_fee numeric not null default 0, currency text not null default 'EUR',
 agency_share_pct numeric not null default 100 check(agency_share_pct between 0 and 100), billing_entity text not null default 'agency', notes text
);
create table if not exists public.account_brand (
 account_id uuid primary key references public.accounts on delete cascade,
 tone text, audience text, pillars text[] not null default '{}', dos text, donts text,
 hashtags text[] not null default '{}', visual_notes text, links jsonb not null default '[]', files jsonb not null default '[]'
);
create table if not exists public.account_members (
 account_id uuid references public.accounts on delete cascade, user_id uuid references public.profiles on delete cascade,
 member_role public.member_role not null, primary key(account_id,user_id,member_role)
);
create table if not exists public.account_access_notes (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts on delete cascade,
 platform text not null, login_hint text, notes text
);
create table if not exists public.weekly_briefs (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts on delete cascade,
 week_start date not null, author_id uuid not null references public.profiles, status public.brief_status not null default 'draft',
 submitted_at timestamptz, reviewed_by uuid references public.profiles, reviewed_at timestamptz,
 created_at timestamptz not null default now(), unique(account_id,week_start)
);
create table if not exists public.library_items (
 id uuid primary key default gen_random_uuid(), title text not null, summary text, body text,
 source_urls text[] not null default '{}', image_urls text[] not null default '{}', tags text[] not null default '{}',
 created_by uuid references public.profiles, created_at timestamptz not null default now()
);
create table if not exists public.brief_blocks (
 id uuid primary key default gen_random_uuid(), brief_id uuid not null references public.weekly_briefs on delete cascade,
 position numeric not null, type public.block_type not null, content jsonb not null default '{}', topic_title text,
 topic_platform text, proposed_format public.post_format, decision public.topic_decision not null default 'pending',
 chosen_format public.post_format, reviewer_note text, library_item_id uuid references public.library_items, post_id uuid,
 updated_at timestamptz not null default now()
);
create table if not exists public.posts (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts on delete cascade,
 brief_block_id uuid references public.brief_blocks, library_item_id uuid references public.library_items,
 title text not null, platform text not null default 'LinkedIn', format public.post_format not null default 'single_image',
 status public.post_status not null default 'planned', copy text, caption text, hashtags text[] not null default '{}',
 asset_urls text[] not null default '{}', drive_url text, due_date date, scheduled_for timestamptz, posted_at timestamptz, posted_url text,
 writer_id uuid references public.profiles, designer_id uuid references public.profiles,
 version int not null default 1, status_changed_at timestamptz not null default now(), created_at timestamptz not null default now()
);
alter table public.brief_blocks drop constraint if exists brief_blocks_post_id_fkey;
alter table public.brief_blocks add constraint brief_blocks_post_id_fkey foreign key(post_id) references public.posts on delete set null;
create table if not exists public.post_events (
 id bigint generated always as identity primary key, post_id uuid not null references public.posts on delete cascade,
 actor_id uuid references public.profiles, from_status public.post_status, to_status public.post_status not null,
 note text, created_at timestamptz not null default now()
);
create table if not exists public.comments (
 id uuid primary key default gen_random_uuid(), account_id uuid references public.accounts on delete cascade,
 target_type text not null check(target_type in ('brief','brief_block','post','account')),
 target_id uuid not null, parent_id uuid references public.comments on delete cascade,
 author_id uuid not null references public.profiles, body text not null check(length(trim(body))>0),
 mentions uuid[] not null default '{}', visibility public.visibility not null default 'internal', resolved boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 type text not null, title text not null, link text not null, account_id uuid references public.accounts on delete cascade,
 read_at timestamptz, snoozed_until timestamptz, created_at timestamptz not null default now()
);
create index if not exists account_members_user_idx on public.account_members(user_id,account_id);
create index if not exists briefs_status_idx on public.weekly_briefs(status,submitted_at);
create index if not exists posts_account_status_idx on public.posts(account_id,status,due_date);
create index if not exists comments_target_idx on public.comments(target_type,target_id,created_at);
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);

create or replace function public.auth_role() returns public.user_role language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() and active $$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.auth_role() in ('admin','partner'),false) $$;
create or replace function public.is_member(p_account uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.is_staff() or exists(select 1 from public.account_members m where m.account_id=p_account and m.user_id=auth.uid()) $$;
create or replace function public.is_account_client(p_account uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.auth_role()='client' and exists(select 1 from public.account_members m where m.account_id=p_account and m.user_id=auth.uid() and m.member_role='client') $$;
revoke all on function public.auth_role(), public.is_staff(), public.is_member(uuid), public.is_account_client(uuid) from public;
grant execute on function public.auth_role(), public.is_staff(), public.is_member(uuid), public.is_account_client(uuid) to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,full_name,email) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.email); return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.log_post_status_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status is distinct from old.status then
   insert into public.post_events(post_id,actor_id,from_status,to_status) values(new.id,auth.uid(),old.status,new.status);
   new.status_changed_at=now();
   if old.status='changes_requested' and new.status in ('internal_review','client_review') then new.version=old.version+1; end if;
 end if;
 return new;
end $$;
drop trigger if exists posts_log_status on public.posts;
create trigger posts_log_status before update of status on public.posts for each row execute function public.log_post_status_change();

create or replace function public.guard_post_transition() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status is not distinct from old.status then return new; end if;
 if public.is_staff() then return new; end if;
 if public.auth_role()='freelancer' then
   if not (old.status in ('planned','in_production','changes_requested') and new.status='internal_review'
      or old.status='approved' and new.status='scheduled'
      or old.status='scheduled' and new.status='posted') then raise exception 'This post transition is not allowed'; end if;
 elsif public.auth_role()='client' then
   if not (old.status='client_review' and new.status in ('approved','changes_requested')) then raise exception 'This post transition is not allowed'; end if;
 else raise exception 'This post transition is not allowed'; end if;
 if new.status='changes_requested' and not exists(select 1 from public.comments c where c.target_type='post' and c.target_id=new.id and c.author_id=auth.uid() and c.created_at>now()-interval '2 minutes') then
   raise exception 'Add a comment explaining the requested changes';
 end if;
 if new.status='posted' and coalesce(new.posted_url,'')='' then raise exception 'Add the published link before marking as posted'; end if;
 return new;
end $$;
drop trigger if exists posts_guard_transition on public.posts;
create trigger posts_guard_transition before update of status on public.posts for each row execute function public.guard_post_transition();

create or replace function public.notify_comment_activity() returns trigger language plpgsql security definer set search_path=public as $$
declare recipient uuid; owner_id uuid;
begin
 foreach recipient in array new.mentions loop
   if recipient<>new.author_id then insert into public.notifications(user_id,type,title,link,account_id) values(recipient,'mention','You were mentioned in a comment','/inbox',new.account_id); end if;
 end loop;
 if new.target_type='post' then
   select coalesce(writer_id,designer_id) into owner_id from public.posts where id=new.target_id;
 elsif new.target_type='brief' then
   select author_id into owner_id from public.weekly_briefs where id=new.target_id;
 end if;
 if owner_id is not null and owner_id<>new.author_id and not(owner_id=any(new.mentions)) then
   insert into public.notifications(user_id,type,title,link,account_id) values(owner_id,'comment','New feedback on your work','/inbox',new.account_id);
 end if;
 return new;
end $$;
drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments for each row execute function public.notify_comment_activity();

create or replace function public.approve_brief(p_brief_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare b public.weekly_briefs; block public.brief_blocks; a public.accounts; any_revise boolean:=false; new_post uuid;
begin
 if not public.is_staff() then raise exception 'Only staff may finish a brief review'; end if;
 select * into b from public.weekly_briefs where id=p_brief_id for update;
 if b.id is null or b.status<>'submitted' then raise exception 'Brief is not submitted'; end if;
 select * into a from public.accounts where id=b.account_id;
 for block in select * from public.brief_blocks where brief_id=b.id and type='topic' order by position for update loop
   if block.decision='revise' then any_revise:=true; end if;
   if block.decision='approved' and block.post_id is null then
     insert into public.posts(account_id,brief_block_id,title,platform,format,status,writer_id,designer_id,due_date,copy)
     values(a.id,block.id,coalesce(block.topic_title,'Untitled topic'),coalesce(block.topic_platform,'LinkedIn'),coalesce(block.chosen_format,block.proposed_format,'single_image'),'planned',a.default_writer_id,a.default_designer_id,b.week_start)
     returning id into new_post;
     update public.brief_blocks set post_id=new_post where id=block.id;
   end if;
 end loop;
 update public.weekly_briefs set status=case when any_revise then 'changes_requested'::public.brief_status else 'approved'::public.brief_status end, reviewed_by=auth.uid(), reviewed_at=now() where id=b.id;
 if b.author_id<>auth.uid() then insert into public.notifications(user_id,type,title,link,account_id) values(b.author_id,case when any_revise then 'changes_requested' else 'approved' end,case when any_revise then 'Your brief needs revisions' else 'Your brief was approved' end,'/inbox',b.account_id); end if;
end $$;
revoke all on function public.approve_brief(uuid) from public;
grant execute on function public.approve_brief(uuid) to authenticated;

-- Enable RLS on every public table in this schema.
do $$ declare t text; begin foreach t in array array['profiles','agency_settings','packages','accounts','account_billing','account_brand','account_members','account_access_notes','weekly_briefs','library_items','brief_blocks','posts','post_events','comments','notifications'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy profiles_read on public.profiles for select to authenticated using (id=auth.uid() or public.is_staff());
create policy profiles_staff_update on public.profiles for update to authenticated using(public.is_staff()) with check(public.is_staff());
create policy profiles_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid() and role=public.auth_role());
create policy settings_staff on public.agency_settings for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy packages_read on public.packages for select to authenticated using(auth.uid() is not null);
create policy packages_staff_write on public.packages for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy accounts_read on public.accounts for select to authenticated using(public.is_staff() or public.is_member(id) or public.is_account_client(id));
create policy accounts_staff_write on public.accounts for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy billing_staff on public.account_billing for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy brand_read on public.account_brand for select to authenticated using(public.is_staff() or public.is_member(account_id));
create policy brand_staff_write on public.account_brand for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy members_staff_manage on public.account_members for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy members_read_scoped on public.account_members for select to authenticated using(user_id=auth.uid() or public.is_staff() or public.is_member(account_id));
create policy access_notes_staff on public.account_access_notes for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy briefs_read on public.weekly_briefs for select to authenticated using(public.is_staff() or (public.is_member(account_id) and public.auth_role()='freelancer' and author_id=auth.uid()));
create policy briefs_staff_write on public.weekly_briefs for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy briefs_author_write on public.weekly_briefs for insert to authenticated with check(public.auth_role()='freelancer' and author_id=auth.uid() and public.is_member(account_id));
create policy briefs_author_edit on public.weekly_briefs for update to authenticated using(public.auth_role()='freelancer' and author_id=auth.uid() and status in ('draft','changes_requested') and public.is_member(account_id)) with check(author_id=auth.uid());
create policy library_read on public.library_items for select to authenticated using(public.auth_role() in ('admin','partner','freelancer'));
create policy library_insert on public.library_items for insert to authenticated with check(public.auth_role() in ('admin','partner','freelancer') and created_by=auth.uid());
create policy library_staff_edit on public.library_items for update to authenticated using(public.is_staff()) with check(public.is_staff());
create policy library_staff_delete on public.library_items for delete to authenticated using(public.is_staff());
create policy blocks_read on public.brief_blocks for select to authenticated using(exists(select 1 from public.weekly_briefs b where b.id=brief_id and (public.is_staff() or (public.is_member(b.account_id) and b.author_id=auth.uid() and public.auth_role()='freelancer'))));
create policy blocks_staff_write on public.brief_blocks for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy blocks_author_insert on public.brief_blocks for insert to authenticated with check(exists(select 1 from public.weekly_briefs b where b.id=brief_id and b.author_id=auth.uid() and b.status in ('draft','changes_requested') and public.is_member(b.account_id)));
create policy blocks_author_update on public.brief_blocks for update to authenticated using(exists(select 1 from public.weekly_briefs b where b.id=brief_id and b.author_id=auth.uid() and b.status in ('draft','changes_requested') and public.is_member(b.account_id))) with check(exists(select 1 from public.weekly_briefs b where b.id=brief_id and b.author_id=auth.uid()));
create policy posts_read on public.posts for select to authenticated using((public.auth_role()='client' and public.is_account_client(account_id) and status in ('client_review','approved','scheduled','posted')) or (public.auth_role()='freelancer' and public.is_member(account_id) and (writer_id=auth.uid() or designer_id=auth.uid())) or public.is_staff());
create policy posts_staff_write on public.posts for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy posts_freelancer_update on public.posts for update to authenticated using(public.auth_role()='freelancer' and public.is_member(account_id) and (writer_id=auth.uid() or designer_id=auth.uid())) with check(public.auth_role()='freelancer' and public.is_member(account_id) and (writer_id=auth.uid() or designer_id=auth.uid()));
create policy posts_client_transition on public.posts for update to authenticated using(public.auth_role()='client' and public.is_account_client(account_id) and status='client_review') with check(public.auth_role()='client' and public.is_account_client(account_id) and status in ('approved','changes_requested'));
create policy events_read on public.post_events for select to authenticated using(exists(select 1 from public.posts p where p.id=post_id and (public.is_staff() or (public.is_member(p.account_id) and (p.writer_id=auth.uid() or p.designer_id=auth.uid())) or (public.is_account_client(p.account_id) and p.status in ('client_review','approved','scheduled','posted')))));
create policy events_insert on public.post_events for insert to authenticated with check(actor_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id and (public.is_staff() or public.is_member(p.account_id))));
create policy comments_read on public.comments for select to authenticated using((visibility='internal' and (public.is_staff() or (account_id is not null and public.is_member(account_id)))) or (visibility='client' and (public.is_staff() or public.is_account_client(account_id))));
create policy comments_insert on public.comments for insert to authenticated with check(author_id=auth.uid() and ((public.is_staff()) or (public.auth_role()='freelancer' and account_id is not null and public.is_member(account_id) and visibility='internal') or (public.auth_role()='client' and account_id is not null and public.is_account_client(account_id) and visibility='client')));
create policy comments_update on public.comments for update to authenticated using(author_id=auth.uid() or public.is_staff()) with check(author_id=auth.uid() or public.is_staff());
create policy notifications_own on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy notifications_insert_staff on public.notifications for insert to authenticated with check(public.is_staff());

-- Private assets bucket; object names begin with the account UUID.
insert into storage.buckets(id,name,public) values('assets','assets',false) on conflict(id) do update set public=false;
drop policy if exists assets_read on storage.objects;
drop policy if exists assets_insert on storage.objects;
drop policy if exists assets_update on storage.objects;
create policy assets_read on storage.objects for select to authenticated using(bucket_id='assets' and (public.is_staff() or public.is_member((storage.foldername(name))[1]::uuid)));
create policy assets_insert on storage.objects for insert to authenticated with check(bucket_id='assets' and (public.is_staff() or public.is_member((storage.foldername(name))[1]::uuid)));
create policy assets_update on storage.objects for update to authenticated using(bucket_id='assets' and (public.is_staff() or public.is_member((storage.foldername(name))[1]::uuid))) with check(bucket_id='assets' and (public.is_staff() or public.is_member((storage.foldername(name))[1]::uuid)));
