begin;

-- Private delivery metadata only; no public reads or direct browser writes.
create table public.contact_submissions (
  id uuid primary key,
  email_hash text not null check (email_hash ~ '^[a-f0-9]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  attempted_at timestamptz not null default now(),
  attempts integer not null default 1,
  state text not null default 'sending' check (state in ('sending','failed','sent')),
  claim_id uuid not null,
  provider_id text
);
create index contact_submissions_email_time on public.contact_submissions(email_hash,created_at);
create index contact_submissions_time on public.contact_submissions(created_at);
alter table public.contact_submissions enable row level security;
revoke all on public.contact_submissions from public, anon, authenticated;

create function public.claim_contact_submission(p_id uuid, p_email_hash text, p_payload_hash text, p_claim uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare r public.contact_submissions; n integer;
begin
  -- Serialize reservations across all Edge Function instances.
  perform pg_advisory_xact_lock(609300001);
  select * into r from public.contact_submissions where id=p_id for update;
  if found then
    if r.email_hash<>p_email_hash or r.payload_hash<>p_payload_hash then return 'conflict'; end if;
    if r.state='sent' then return 'sent'; end if;
    -- Resend retains idempotency keys for 24 hours. Never retry an uncertain send beyond 23.
    if r.created_at < now()-interval '23 hours' or r.attempts>=5 then return 'expired'; end if;
    if r.attempted_at > now()-interval '60 seconds' then return 'busy'; end if;
    update public.contact_submissions set state='sending',claim_id=p_claim,attempted_at=now(),attempts=attempts+1 where id=p_id;
    return 'claimed';
  end if;
  select count(*) into n from public.contact_submissions where email_hash=p_email_hash and created_at>now()-interval '1 hour';
  if n>=3 then return 'limited'; end if;
  select count(*) into n from public.contact_submissions where created_at>now()-interval '1 hour';
  if n>=30 then return 'limited'; end if;
  select count(*) into n from public.contact_submissions where created_at>now()-interval '24 hours';
  if n>=100 then return 'limited'; end if;
  insert into public.contact_submissions(id,email_hash,payload_hash,claim_id) values(p_id,p_email_hash,p_payload_hash,p_claim);
  return 'claimed';
end;
$$;

create function public.finish_contact_submission(p_id uuid,p_claim uuid,p_receipt text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.contact_submissions set state=case when p_receipt is null then 'failed' else 'sent' end,provider_id=p_receipt
  where id=p_id and claim_id=p_claim and state='sending';
  return found;
end;
$$;
revoke all on function public.claim_contact_submission(uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function public.finish_contact_submission(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_contact_submission(uuid,text,text,uuid) to service_role;
grant execute on function public.finish_contact_submission(uuid,uuid,text) to service_role;

commit;
