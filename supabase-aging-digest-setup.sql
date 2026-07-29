-- ============================================================
-- ServiceTrack — Auto Follow-Up Tiket Menua (Aging Digest)
-- Jalankan SETELAH supabase-status-simplify-setup.sql
--
-- Aman dijalankan ulang (idempoten): semua create pakai `if not exists`,
-- semua seed pakai `on conflict do nothing`, dan konversi status dilewati
-- kalau kolomnya sudah bertipe unit_status.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enum status unit
--
-- Status sebelumnya disimpan sebagai `text` + check constraint dengan 5
-- nilai. Nama tiga di antaranya diganti biar seragam dengan istilah yang
-- dipakai di seluruh sistem (lihat src/types/index.ts):
--
--   PEMETAAN NILAI LAMA -> BARU
--   baru              -> baru              (tetap)
--   diproses          -> dalam_pengerjaan
--   tunggu_sparepart  -> menunggu_part
--   done_service      -> siap_diambil
--   selesai           -> selesai           (tetap)
--
-- Nilai lama tidak dibuang: sebelum konversi, isi kolom `status` disalin
-- apa adanya ke kolom `status_legacy` sebagai jaring pengaman. Kolom itu
-- SENGAJA tidak di-drop di migrasi ini — hapus manual setelah hasilnya
-- dikonfirmasi benar.
-- ------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'unit_status') then
    create type public.unit_status as enum (
      'baru',
      'menunggu_part',
      'dalam_pengerjaan',
      'siap_diambil',
      'selesai'
    );
  end if;
end $$;

alter table public.service_tickets
  add column if not exists status_legacy text;

do $$
begin
  -- Cuma jalan kalau kolom status masih bertipe text (belum dikonversi).
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_tickets'
      and column_name = 'status'
      and udt_name <> 'unit_status'
  ) then
    -- Simpan nilai lama dulu, cuma buat baris yang belum pernah disalin.
    update public.service_tickets
      set status_legacy = status
      where status_legacy is null;

    -- Check constraint lama menolak nilai baru, jadi dilepas dulu.
    alter table public.service_tickets
      drop constraint if exists service_tickets_status_check;

    update public.service_tickets set status = 'dalam_pengerjaan' where status = 'diproses';
    update public.service_tickets set status = 'menunggu_part'    where status = 'tunggu_sparepart';
    update public.service_tickets set status = 'siap_diambil'     where status = 'done_service';

    -- Sisa nilai tak dikenal (kalau ada data lama yang lolos) diamankan ke
    -- 'baru' supaya konversi tipe tidak gagal — nilai aslinya tetap
    -- tersimpan di status_legacy.
    update public.service_tickets
      set status = 'baru'
      where status not in (
        'baru', 'menunggu_part', 'dalam_pengerjaan', 'siap_diambil', 'selesai'
      );

    alter table public.service_tickets
      alter column status drop default;

    alter table public.service_tickets
      alter column status type public.unit_status using status::public.unit_status;

    alter table public.service_tickets
      alter column status set default 'baru'::public.unit_status;
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. Jam per status
--
-- Umur tiket punya dua ukuran dan dua-duanya dipakai digest:
--   days_since_intake -> dari tanggal_masuk / created_at (total umur)
--   days_in_status    -> dari status_changed_at (mandek di tahap sekarang)
-- ------------------------------------------------------------

alter table public.service_tickets
  add column if not exists status_changed_at timestamptz not null default now();

create or replace function public.touch_status_changed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_status_changed_at on public.service_tickets;
create trigger trg_status_changed_at
  before update on public.service_tickets
  for each row
  execute function public.touch_status_changed_at();

-- ------------------------------------------------------------
-- 3. Cooldown per tiket
--
-- Tanpa ini, tiket 'menunggu_part' yang memang harus nunggu 12 hari bakal
-- nongol 12 hari berturut-turut dan jadi kebisingan.
-- ------------------------------------------------------------

alter table public.service_tickets
  add column if not exists last_aging_notified_at timestamptz;

create index if not exists idx_tickets_aging
  on public.service_tickets(status, status_changed_at);

-- ------------------------------------------------------------
-- 4. Telegram chat id per cabang
--
-- Sengaja dibiarkan null — chat id diisi manual, jangan dikarang.
-- ------------------------------------------------------------

alter table public.branches
  add column if not exists telegram_chat_id text;

-- ------------------------------------------------------------
-- 5. Aturan aging per status
-- ------------------------------------------------------------

create table if not exists public.aging_rules (
  status         public.unit_status primary key,
  basis          text not null default 'intake'
    check (basis in ('intake','status')),
  warn_days      int  not null,
  escalate_days  int  not null,
  cooldown_days  int  not null default 3,
  active         boolean not null default true
);

insert into public.aging_rules (status, basis, warn_days, escalate_days, cooldown_days) values
  ('baru',             'status', 7, 15, 3),
  ('menunggu_part',    'status', 7, 15, 3),
  ('dalam_pengerjaan', 'status', 7, 15, 3),
  ('siap_diambil',     'status', 7, 15, 3)
on conflict (status) do nothing;

alter table public.aging_rules enable row level security;

drop policy if exists aging_rules_select on public.aging_rules;
create policy aging_rules_select on public.aging_rules
  for select using ( auth.uid() is not null );

drop policy if exists aging_rules_write on public.aging_rules;
create policy aging_rules_write on public.aging_rules
  for all using ( public.is_super_admin() ) with check ( public.is_super_admin() );

-- ------------------------------------------------------------
-- 6. Batch digest yang sudah dikirim
--
-- batch_key unik = kunci idempotensi. Kalau n8n kepicu dua kali sehari,
-- insert kedua gagal di level database, bukan dicek di aplikasi.
-- ------------------------------------------------------------

create table if not exists public.followup_batches (
  id            uuid primary key default gen_random_uuid(),
  batch_key     text unique not null,
  level         text not null check (level in ('warn','escalate')),
  branch_id     uuid references public.branches(id) on delete set null,
  branch_name   text,
  ticket_count  int not null,
  ticket_ids    uuid[] not null,
  message       text not null,
  channel       text not null default 'telegram',
  sent_at       timestamptz,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_followup_batches_created
  on public.followup_batches(created_at desc);

alter table public.followup_batches enable row level security;

drop policy if exists followup_batches_select on public.followup_batches;
create policy followup_batches_select on public.followup_batches
  for select using ( auth.uid() is not null );

-- ------------------------------------------------------------
-- 7. Kanal 'auto' di log follow-up
--
-- Kejaran otomatis ikut dicatat di ticket_updates supaya hitungan "sudah
-- dikejar berapa kali" di halaman History Follow Up tetap benar, tapi
-- ditandai beda karena ini pengingat internal — bukan bicara ke customer.
-- ------------------------------------------------------------

alter table public.ticket_updates
  drop constraint if exists ticket_updates_channel_check;

alter table public.ticket_updates
  add constraint ticket_updates_channel_check
  check (channel in ('cabang','brand','auto'));
