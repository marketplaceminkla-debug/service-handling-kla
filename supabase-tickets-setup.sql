-- ============================================================
-- ServiceTrack — Tiket Servis & Follow-up Log setup
-- Jalankan SETELAH supabase-auth-setup.sql dan supabase-master-data-setup.sql
-- ============================================================

-- Kolom mengikuti format data gudang servis (No. Service, Kode Barang, SN,
-- Cabang, Status, Posisi Unit, Keterangan). "Lama di-service" tidak disimpan
-- sebagai kolom — dihitung on-the-fly dari created_at (lihat ticketAgeDays di
-- src/lib/tickets.ts) supaya selalu akurat & tetap jalan setelah data diimpor.
create table if not exists public.service_tickets (
  id                uuid primary key default gen_random_uuid(),
  no_service        text not null unique,
  branch_id         uuid not null references public.branches(id) on delete cascade,
  kategori          text not null default 'stok' check (kategori in ('stok','user')),
  kode_barang       text not null,
  serial_number     text not null,
  status            text not null default 'baru' check (status in ('baru','diproses','tunggu_sparepart','selesai')),
  estimasi          text,
  posisi_unit       text,
  keterangan        text,
  reported_by       uuid references auth.users(id),
  reported_by_name  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  resolved_at       timestamptz
);

-- Migrasi kalau tabel service_tickets sudah ada dari skema lama (title/unit_id/priority)
alter table public.service_tickets drop column if exists unit_id;
alter table public.service_tickets drop column if exists title;
alter table public.service_tickets drop column if exists description;
alter table public.service_tickets drop column if exists priority;
alter table public.service_tickets drop column if exists assigned_to_name;
alter table public.service_tickets add column if not exists no_service text;
alter table public.service_tickets add column if not exists kategori text not null default 'stok';
alter table public.service_tickets add column if not exists kode_barang text not null default '-';
alter table public.service_tickets add column if not exists serial_number text not null default '-';
alter table public.service_tickets add column if not exists estimasi text;
alter table public.service_tickets add column if not exists posisi_unit text;
alter table public.service_tickets add column if not exists keterangan text;
create unique index if not exists service_tickets_no_service_key on public.service_tickets(no_service);

create index if not exists idx_tickets_branch on public.service_tickets(branch_id);
create index if not exists idx_tickets_status on public.service_tickets(status);
create index if not exists idx_tickets_kategori on public.service_tickets(kategori);

alter table public.service_tickets enable row level security;

-- Helper: cek apakah user boleh lihat cabang tertentu (branch_scope kosong = semua cabang)
create or replace function public.can_see_branch(target_branch uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_super_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (array_length(p.branch_scope, 1) is null or target_branch::text = any (p.branch_scope))
    );
$$;

drop policy if exists tickets_select on public.service_tickets;
create policy tickets_select on public.service_tickets
  for select using ( public.can_see_branch(branch_id) );

drop policy if exists tickets_write on public.service_tickets;
create policy tickets_write on public.service_tickets
  for all using ( auth.uid() is not null ) with check ( auth.uid() is not null );

-- Follow-up log (riwayat tiap tiket)
create table if not exists public.ticket_updates (
  id                uuid primary key default gen_random_uuid(),
  ticket_id         uuid not null references public.service_tickets(id) on delete cascade,
  note              text not null,
  status_from       text,
  status_to         text,
  created_by        uuid references auth.users(id),
  created_by_name   text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_ticket_updates_ticket on public.ticket_updates(ticket_id);

alter table public.ticket_updates enable row level security;

drop policy if exists ticket_updates_select on public.ticket_updates;
create policy ticket_updates_select on public.ticket_updates
  for select using ( auth.uid() is not null );

drop policy if exists ticket_updates_write on public.ticket_updates;
create policy ticket_updates_write on public.ticket_updates
  for insert with check ( auth.uid() is not null );
