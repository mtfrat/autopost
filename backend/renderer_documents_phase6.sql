-- Phase 6: carousel document idempotency metadata. No content or signed URLs are stored.
alter table public.worker_render_runs
  add column if not exists page_count integer;

alter table public.worker_render_runs
  drop constraint if exists worker_render_runs_page_count_check,
  drop constraint if exists worker_render_runs_mime_type_check;

alter table public.worker_render_runs
  add constraint worker_render_runs_page_count_check
    check (page_count is null or page_count between 3 and 7),
  add constraint worker_render_runs_mime_type_check
    check (mime_type is null or mime_type in ('image/png', 'image/jpeg', 'application/pdf'));

comment on column public.worker_render_runs.page_count is
  'Number of pages in a rendered carousel PDF; null for image renders.';
