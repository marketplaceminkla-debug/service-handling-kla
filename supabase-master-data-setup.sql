-- ============================================================
-- ServiceTrack — Master Data (Cabang & Unit) setup
-- Jalankan SETELAH supabase-auth-setup.sql
-- ============================================================

-- Cabang
create table if not exists public.branches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  wa_number   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Migrasi kalau tabel branches sudah ada dari sebelumnya (sebelum ada wa_number)
alter table public.branches add column if not exists wa_number text;

alter table public.branches enable row level security;

drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches
  for select using ( auth.uid() is not null );

drop policy if exists branches_write on public.branches;
create policy branches_write on public.branches
  for all using ( public.is_super_admin() ) with check ( public.is_super_admin() );
-- Catatan: kalau mau Admin (bukan cuma Super Admin) juga bisa tambah cabang,
-- ganti kondisi di atas jadi: public.is_super_admin() or exists (select 1 from
-- public.profiles where id = auth.uid() and role in ('super_admin','admin'))

-- Master Data Unit sudah tidak dipakai lagi (diganti kolom kode_barang per
-- tiket servis). Drop tabelnya kalau masih ada dari instalasi sebelumnya.
drop table if exists public.units cascade;
