-- ============================================================
-- ServiceTrack — Database Merk (product_catalog)
-- Jalankan SETELAH supabase-brands-setup.sql
-- ============================================================

create table if not exists public.product_catalog (
  id           uuid primary key default gen_random_uuid(),
  nama_barang  text not null,
  kode_barang  text,
  brand_id     uuid references public.brands(id) on delete set null,
  keterangan   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists product_catalog_nama_barang_key
  on public.product_catalog (lower(nama_barang));

alter table public.product_catalog enable row level security;

drop policy if exists product_catalog_select on public.product_catalog;
create policy product_catalog_select on public.product_catalog
  for select using ( auth.uid() is not null );

-- Semua user login boleh nambah/edit — dipakai juga oleh proses lookup
-- otomatis saat upload Excel tiket servis.
drop policy if exists product_catalog_write on public.product_catalog;
create policy product_catalog_write on public.product_catalog
  for all using ( auth.uid() is not null ) with check ( auth.uid() is not null );
