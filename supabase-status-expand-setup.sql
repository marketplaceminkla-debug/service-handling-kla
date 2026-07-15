-- ============================================================
-- ServiceTrack — Perluas daftar Status tiket
-- Jalankan SETELAH supabase-tickets-setup.sql
-- ============================================================

alter table public.service_tickets drop constraint if exists service_tickets_status_check;

alter table public.service_tickets add constraint service_tickets_status_check
  check (status in (
    'baru',
    'diproses',
    'masuk_service',
    'pengecekan',
    'tunggu_sparepart',
    'done_service',
    'keluar_service',
    'diterima_cabang',
    'selesai'
  ));
