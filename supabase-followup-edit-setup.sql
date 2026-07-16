-- ============================================================
-- ServiceTrack — Izinkan edit & hapus Riwayat Follow-up
-- Jalankan SETELAH supabase-tickets-setup.sql
-- ============================================================

drop policy if exists ticket_updates_update on public.ticket_updates;
create policy ticket_updates_update on public.ticket_updates
  for update using ( auth.uid() is not null ) with check ( auth.uid() is not null );

drop policy if exists ticket_updates_delete on public.ticket_updates;
create policy ticket_updates_delete on public.ticket_updates
  for delete using ( auth.uid() is not null );
