-- ============================================================
-- ServiceTrack — Sederhanakan daftar Status tiket
-- Balik dari 9 tahap ke 5: Baru, Diproses, Tunggu Sparepart,
-- Done Servis, Selesai
-- Jalankan SETELAH supabase-status-expand-setup.sql
-- ============================================================

-- Remap tiket yang kepalang kepakein status yang dihapus
update public.service_tickets set status = 'diproses' where status in ('masuk_service', 'pengecekan');
update public.service_tickets set status = 'done_service' where status = 'keluar_service';
update public.service_tickets set status = 'selesai' where status = 'diterima_cabang';

alter table public.service_tickets drop constraint if exists service_tickets_status_check;

alter table public.service_tickets add constraint service_tickets_status_check
  check (status in (
    'baru',
    'diproses',
    'tunggu_sparepart',
    'done_service',
    'selesai'
  ));
