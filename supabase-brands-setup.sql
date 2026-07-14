-- ============================================================
-- ServiceTrack — Master Brand + Follow-up channel + Excel-sync
-- Jalankan SETELAH supabase-tickets-setup.sql
-- ============================================================

-- Brand (buat follow-up ke brand via WhatsApp)
create table if not exists public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  wa_number   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.brands enable row level security;

drop policy if exists brands_select on public.brands;
create policy brands_select on public.brands
  for select using ( auth.uid() is not null );

drop policy if exists brands_write on public.brands;
create policy brands_write on public.brands
  for all using ( public.is_super_admin() ) with check ( public.is_super_admin() );

-- Tiket bisa dikaitkan ke brand (opsional, diisi manual di app)
alter table public.service_tickets
  add column if not exists brand_id uuid references public.brands(id) on delete set null;

create index if not exists idx_tickets_brand on public.service_tickets(brand_id);

-- Follow-up log: catat tujuan follow-up (WA ke cabang / WA ke brand / catatan manual)
alter table public.ticket_updates
  add column if not exists channel text check (channel in ('cabang','brand'));
