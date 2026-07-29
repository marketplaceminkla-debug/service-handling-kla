# Digest Harian Tiket Menua

Tiap pagi sistem memindai seluruh tiket aktif dan merangkum tiket yang
mengendap jadi satu ringkasan per cabang. Hasilnya **tampil di dalam
aplikasi** pada menu **Digest Harian** — tidak ada pengiriman ke Telegram
atau WhatsApp. Ini pengingat internal.

## Bentuknya

```
Vercel Cron (harian)
        │
        ▼
GET /api/aging/run
        │  scan tiket → rakit pesan → catat batch
        ▼
followup_batches  ──────► halaman "Digest Harian"
        │
        └─► ticket_updates (channel 'auto') ──► halaman "History Follow Up"
```

Dua tingkat, dipisah supaya yang mendesak tidak tenggelam:

| Tingkat | Kriteria | Bentuk |
|---|---|---|
| `warn` | umur di pita 7–15 hari | satu ringkasan per cabang, dikelompokkan per status |
| `escalate` | umur di atas 15 hari | satu ringkasan lintas cabang, diurutkan umur terlama |

Kalau tidak ada tiket menua, **tidak ada apa-apa yang dicatat**. Sengaja
tidak dibuat entri "tidak ada tiket menua hari ini" — itu melatih orang
mengabaikan halamannya.

## Yang harus disiapkan

### 1. Jalankan migrasi

```
supabase-aging-digest-setup.sql
```

Aman dijalankan ulang. Migrasi ini juga yang mengubah `status` jadi enum
`unit_status`, jadi **wajib jalan sebelum kode versi baru dipakai** —
kalau tidak, simpan/edit tiket akan ditolak database.

### 2. Isi environment variable di Vercel

| Variable | Isi |
|---|---|
| `CRON_SECRET` | string acak, mis. hasil `openssl rand -hex 32` |
| `INTERNAL_API_KEY` | string acak lain — dipakai untuk memanggil endpoint secara manual |

Vercel otomatis mengirim `Authorization: Bearer $CRON_SECRET` saat cron
berjalan. Tanpa variable ini, endpoint menolak semua panggilan dengan 401.

### 3. Jadwalnya

Sudah ada di `vercel.json`:

```json
{ "crons": [{ "path": "/api/aging/run", "schedule": "0 0 * * *" }] }
```

**Jadwal cron Vercel memakai UTC**, jadi `0 0 * * *` = 07:00 WIB.

Dua hal yang perlu dicek sendiri di dashboard Vercel:

- **Paket Hobby membatasi jumlah & frekuensi cron** (kira-kira sekali
  sehari) dan waktu jalannya tidak presisi — bisa meleset sampai sekitar
  satu jam. Untuk digest pagi, itu tidak masalah.
- Cron baru aktif setelah deployment ke **production**, bukan preview.

## Menjalankan manual

Berguna untuk uji coba tanpa menunggu besok pagi:

```bash
curl -X POST https://APP_URL/api/aging/run \
  -H "x-internal-key: $INTERNAL_API_KEY"
```

Balasannya:

```json
{
  "ok": true,
  "generated_at": "2026-07-29T00:00:00.000Z",
  "results": [
    { "level": "warn", "groups": 3, "recorded": 3, "skipped": 0, "tickets": 11 },
    { "level": "escalate", "groups": 1, "recorded": 1, "skipped": 0, "tickets": 4 }
  ]
}
```

`skipped` = batch yang sudah pernah dicatat hari itu (lihat Idempotensi).

Untuk mengintip hasil scan **tanpa mencatat apa pun**:

```bash
curl "https://APP_URL/api/aging/scan?level=warn" \
  -H "x-internal-key: $INTERNAL_API_KEY"
```

## Aturan aging

Ada di tabel `aging_rules`, satu baris per status:

| Kolom | Arti |
|---|---|
| `basis` | `intake` (umur total) atau `status` (lama mandek di tahap sekarang) |
| `warn_days` / `escalate_days` | ambang tiap tingkat |
| `cooldown_days` | jeda minimal sebelum tiket boleh masuk digest lagi |
| `active` | matikan aturan tanpa menghapus barisnya |

Seed awal: semua status memakai basis `status`, warn 7 hari, escalate 15
hari, cooldown 3 hari. Ubah lewat SQL — belum ada halaman pengaturannya.

**Cooldown itu penting.** Tanpa itu, tiket `menunggu_part` yang memang harus
menunggu 12 hari akan muncul 12 hari berturut-turut dan jadi kebisingan.

## Idempotensi

`followup_batches.batch_key` punya unique constraint, bentuknya
`TANGGAL:cabang:level` dengan tanggal dihitung dalam WIB. Kalau cron
kepicu dua kali dalam satu hari, insert kedua ditolak **di level
database** — grup itu dilewati (`skipped`), cooldown tidak disentuh, dan
tidak ada baris ganda di `ticket_updates`.

## Hubungan dengan History Follow Up

Tiap tiket dalam digest dicatat sebagai satu baris `ticket_updates` dengan
`channel = 'auto'`, supaya hitungan "sudah dikejar berapa kali" tetap
benar. Di UI ditandai abu dengan ikon berbeda — ini pengingat internal,
bukan pesan yang dikirim ke cabang.

Digest **tidak** mengubah status tiket dan **tidak** menyentuh
`updated_at`, jadi tanda "macet" di daftar tiket tidak hilang cuma karena
sistem mencatat pengingat.

## Kalau nanti mau kirim ke Telegram

Fondasinya sudah ada dan tidak perlu dibongkar:

- `composeAgingMessage(group, level, { format: "markdownv2" })` menghasilkan
  teks dengan escaping MarkdownV2 yang benar (nomor tiket dan tanggal
  paling sering bikin pesan ditolak Telegram — sudah ada unit test-nya).
- Kolom `branches.telegram_chat_id` sudah tersedia, masih null.
- `followup_batches.channel` tinggal diisi `'telegram'`.

Yang perlu ditambah cuma pemanggilan Bot API di `/api/aging/run` setelah
batch berhasil dicatat.
