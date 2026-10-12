-- Proposed starter data from the build brief. Fee figures are unconfirmed.
insert into public.agency_settings(id,agency_name,currency) values(1,'[Agency name]','EUR') on conflict(id) do nothing;
insert into public.packages(name,monthly_fee,posts_per_month,platforms,extras,description) values
 ('Essential',500,8,array['LinkedIn'],array[]::text[],'Proposed fee; confirm with María'),
 ('Growth',1000,12,array['LinkedIn','Instagram'],array['2 newsletters','monthly report'],'Proposed fee; confirm with María'),
 ('Custom',750,8,array['LinkedIn'],array[]::text[],'Housebuild package; proposed fee; confirm with María')
on conflict(name) do update set monthly_fee=excluded.monthly_fee,posts_per_month=excluded.posts_per_month,platforms=excluded.platforms,extras=excluded.extras,description=excluded.description;
insert into public.accounts(name,slug,status,package_id,brand_color,client_approval_required)
select v.name,v.slug,v.status::public.account_status,p.id,v.color,v.client_approval
from (values
 ('Marker Group','marker-group','active','Essential','#46796C',false),
 ('Housebuild','housebuild','active','Custom','#B7864B',true),
 ('BuildRegs','buildregs','active','Essential','#5376B4',true),
 ('Element','element','onboarding','Growth','#7C6AA6',true),
 ('iRevise','irevise','paused','Essential','#A37D68',true),
 ('EnergyFix','energyfix','onboarding','Essential','#5E8D55',true),
 ('CapCon','capcon','prospect','Growth','#A76C64',true)
) as v(name,slug,status,package_name,color,client_approval)
join public.packages p on p.name=v.package_name
on conflict(slug) do update set name=excluded.name,status=excluded.status,package_id=excluded.package_id,brand_color=excluded.brand_color,client_approval_required=excluded.client_approval_required;
insert into public.account_billing(account_id,monthly_fee,currency,agency_share_pct)
select a.id, case a.slug when 'marker-group' then 500 when 'housebuild' then 750 when 'buildregs' then 500 when 'element' then 1000 when 'irevise' then 500 when 'energyfix' then 500 when 'capcon' then 1000 end, 'EUR',100
from public.accounts a where a.slug in ('marker-group','housebuild','buildregs','element','irevise','energyfix','capcon')
on conflict(account_id) do update set monthly_fee=excluded.monthly_fee,currency=excluded.currency;
