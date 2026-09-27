-- Independent 72-hour invitations. Supabase email OTP expiry remains 3600.
-- Apply this migration alone; unrelated migrations are not part of this change.
begin;

create table public.portal_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(trim(email)) and length(email) <= 254),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '72 hours'),
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent')),
  email_id text,
  claimed_by uuid,
  claim_until timestamptz,
  consumed_at timestamptz,
  revoked_at timestamptz
);
alter table public.portal_invitations enable row level security;
revoke all on public.portal_invitations from public, anon, authenticated;
grant all on public.portal_invitations to service_role;
create index portal_invitations_email_idx on public.portal_invitations (email);

create function public.issue_portal_invitation(recipient text, digest text)
returns table (id uuid, expires_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
begin
  -- Serialize reissues for the same recipient and invalidate previous links.
  perform pg_advisory_xact_lock(hashtextextended(recipient, 7281));
  update public.portal_invitations set revoked_at = now()
    where email = recipient and revoked_at is null and consumed_at is null;
  return query insert into public.portal_invitations (email, token_hash)
    values (recipient, digest) returning portal_invitations.id, portal_invitations.expires_at;
end;
$$;

create function public.claim_portal_invitation(digest text, claim_id uuid)
returns table (id uuid, email text)
language sql security invoker set search_path = '' as $$
  update public.portal_invitations
  set claimed_by = claim_id, claim_until = now() + interval '2 minutes'
  where token_hash = digest and delivery_status = 'sent'
    and expires_at > now() and revoked_at is null and consumed_at is null
    and (claim_until is null or claim_until <= now())
  returning id, email;
$$;

create function public.consume_portal_invitation(invitation_id uuid, claim_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare consumed boolean;
begin
  update public.portal_invitations
  set consumed_at = now(), claimed_by = null, claim_until = null
  where id = invitation_id and claimed_by = claim_id and claim_until > now()
    and expires_at > now() and revoked_at is null and consumed_at is null;
  consumed := found;
  return consumed;
end;
$$;

create function public.release_portal_invitation(invitation_id uuid, claim_id uuid)
returns void language sql security invoker set search_path = '' as $$
  update public.portal_invitations set claimed_by = null, claim_until = null
  where id = invitation_id and claimed_by = claim_id and consumed_at is null;
$$;

revoke all on function public.issue_portal_invitation(text, text) from public, anon, authenticated;
revoke all on function public.claim_portal_invitation(text, uuid) from public, anon, authenticated;
revoke all on function public.consume_portal_invitation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_portal_invitation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.issue_portal_invitation(text, text) to service_role;
grant execute on function public.claim_portal_invitation(text, uuid) to service_role;
grant execute on function public.consume_portal_invitation(uuid, uuid) to service_role;
grant execute on function public.release_portal_invitation(uuid, uuid) to service_role;

commit;
