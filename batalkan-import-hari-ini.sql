-- ============================================================
-- Batalkan import Excel yang salah (sekali pakai)
--
-- Dipakai untuk membersihkan tiket hasil import yang terlanjur masuk,
-- SEBELUM tombol "Batalkan Import" di aplikasi tersedia. Sesudah itu,
-- pakai tombolnya saja — jauh lebih aman karena menghapus tepat baris
-- yang dibuat import tersebut, bukan menebak lewat tanggal.
--
-- CARA PAKAI: jalankan LANGKAH 1 dulu, PERIKSA hasilnya, baru jalankan
-- LANGKAH 2. Jangan langsung menjalankan seluruh file ini.
-- ============================================================


-- ------------------------------------------------------------
-- LANGKAH 1 — LIHAT DULU apa yang akan dihapus. Tidak menghapus apa pun.
--
-- Tanda tiket hasil import yang belum tersentuh:
--   * updated_at hari ini      -> waktu impornya (created_at TIDAK dipakai,
--                                 karena sengaja dimundurkan sesuai umur
--                                 tiket saat impor)
--   * status 'baru'            -> import selalu menyetel ini
--   * posisi_unit 'CABANG'     -> import selalu menyetel ini
--   * belum ada follow-up      -> berarti belum ditindaklanjuti siapa pun
-- ------------------------------------------------------------

select
  t.no_service,
  b.name as cabang,
  t.kode_barang,
  t.serial_number,
  t.tanggal_masuk,
  t.updated_at
from public.service_tickets t
left join public.branches b on b.id = t.branch_id
where t.updated_at >= date_trunc('day', now() at time zone 'Asia/Jakarta')
                      at time zone 'Asia/Jakarta'
  and t.status::text = 'baru'
  and upper(coalesce(t.posisi_unit, '')) = 'CABANG'
  and not exists (
    select 1 from public.ticket_updates u where u.ticket_id = t.id
  )
order by t.no_service;


-- ------------------------------------------------------------
-- LANGKAH 2 — HAPUS. Jalankan HANYA kalau hasil LANGKAH 1 sudah benar.
--
-- Kondisinya sengaja disalin persis dari LANGKAH 1, supaya yang terhapus
-- tepat sama dengan yang barusan kamu periksa.
-- ------------------------------------------------------------

-- delete from public.service_tickets t
-- where t.updated_at >= date_trunc('day', now() at time zone 'Asia/Jakarta')
--                       at time zone 'Asia/Jakarta'
--   and t.status::text = 'baru'
--   and upper(coalesce(t.posisi_unit, '')) = 'CABANG'
--   and not exists (
--     select 1 from public.ticket_updates u where u.ticket_id = t.id
--   );

-- Hapus dua tanda minus di depan tiap baris di atas untuk menjalankannya.


-- ------------------------------------------------------------
-- Kalau ingin lebih aman lagi: hapus berdasarkan daftar No. Service
-- yang kamu tentukan sendiri dari hasil LANGKAH 1.
-- ------------------------------------------------------------

-- delete from public.service_tickets
-- where no_service in (
--   'SRV/00134/202607',
--   'SRV/00121/202607'
-- );
