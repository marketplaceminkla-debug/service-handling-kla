-- ============================================================
-- ServiceTrack — Seragamkan casing Posisi Unit ke UPPERCASE
-- Biar konsisten sama pilihan dropdown (IPK, SERVICE CENTER,
-- SUPPLIER, CABANG) dan filter/dashboard gak kepecah gara-gara
-- beda huruf besar-kecil (mis. "Service Center" vs "SERVICE CENTER").
-- ============================================================

update public.service_tickets
set posisi_unit = upper(trim(posisi_unit))
where posisi_unit is not null
  and posisi_unit <> upper(trim(posisi_unit));
