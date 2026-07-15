-- ============================================================
-- ServiceTrack — Tanggal Masuk unit
-- Jalankan SETELAH supabase-tickets-setup.sql
-- ============================================================

alter table public.service_tickets
  add column if not exists tanggal_masuk date;
