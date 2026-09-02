-- Phase 2 renderer idempotency. Never stores titles, content or signed URLs.
create table if not exists public.worker_render_runs (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 200),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  output_path text,
  width integer,
  height integer,
  mime_type text,
  sha256 text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index if not exists worker_render_runs_request_hash_unique on public.worker_render_runs (request_hash);

alter table public.worker_render_runs enable row level security;
revoke all on table public.worker_render_runs from anon, authenticated;
comment on table public.worker_render_runs is 'Private renderer idempotency records without content or signed URLs.';

drop function if exists public.begin_worker_render(text, text);
create function public.begin_worker_render(target_key text, target_hash text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare result public.worker_render_runs; acquired boolean := false;
begin
  insert into public.worker_render_runs (idempotency_key, request_hash)
  values (target_key, target_hash)
  on conflict do nothing
  returning * into result;
  if found then acquired := true;
  else
    select * into result from public.worker_render_runs
      where idempotency_key = target_key or request_hash = target_hash
      order by (idempotency_key = target_key) desc limit 1 for update;
  end if;
  if result.request_hash <> target_hash then
    raise exception using errcode = '40001', message = 'idempotency_key_reused_with_different_request';
  end if;
  if not acquired and result.status = 'failed' then
    update public.worker_render_runs set status = 'running', error_code = null, completed_at = null where id = result.id returning * into result;
    acquired := true;
  end if;
  return to_jsonb(result) || jsonb_build_object('acquired', acquired);
end;
$$;

revoke all on function public.begin_worker_render(text, text) from public, anon, authenticated;
grant execute on function public.begin_worker_render(text, text) to service_role;
