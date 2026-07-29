# n8n — Auto Follow-Up Tiket Menua (Aging Digest)

Instruksi rakit manual, node per node. **Sengaja tidak disediakan file JSON
untuk diimport** — import JSON di versi n8n yang dipakai merusak node IF.

Ada dua workflow dengan bentuk identik, cuma beda `level`, jam, dan tujuan
chat:

| Workflow | Level | Jam (WIB) | Tujuan |
|---|---|---|---|
| Aging Digest — Warn | `warn` | 07:00 | grup Telegram tiap cabang |
| Aging Digest — Escalate | `escalate` | 07:15 | satu grup Telegram manajemen |

---

## Prasyarat

1. **Env di Vercel**: `INTERNAL_API_KEY` diisi string acak panjang (mis.
   hasil `openssl rand -hex 32`). Nilai yang sama dipakai n8n.
2. **Kredensial n8n**: simpan `INTERNAL_API_KEY` sebagai credential, jangan
   ditulis langsung di node.
3. **Migrasi database** `supabase-aging-digest-setup.sql` sudah dijalankan.
4. **`branches.telegram_chat_id` sudah diisi** untuk tiap cabang. Kolomnya
   sengaja dibuat kosong (null) — chat id tidak boleh dikarang. Cabang yang
   chat id-nya masih null tetap muncul di respons API, tapi node Telegram
   akan gagal; isi dulu lewat SQL:
   ```sql
   update public.branches set telegram_chat_id = '-1001234567890'
   where code = 'NGALIYAN';
   ```

Base URL di bawah ditulis `https://APP_URL` — ganti dengan domain produksi.

---

## Workflow 1 — Aging Digest (Warn)

### Node 1 — Schedule Trigger

- Type: **Schedule Trigger**
- Trigger Interval: **Cron**
- Expression: `0 0 * * 1-6`

> Ini 07:00 WIB. n8n menjalankan cron dalam UTC, dan WIB = UTC+7, jadi
> 07:00 WIB ditulis sebagai jam 0 UTC. Rentang hari `1-6` = Senin–Sabtu.
> Kalau instance n8n kamu sudah diset timezone `Asia/Jakarta` di Settings,
> pakai `0 7 * * 1-6` sebagai gantinya — **cek dulu**, jangan diasumsikan.

### Node 2 — HTTP Request (ambil data)

- Type: **HTTP Request**
- Method: `GET`
- URL: `https://APP_URL/api/aging/scan?level=warn`
- Authentication: **Generic Credential Type → Header Auth**
  - Name: `x-internal-key`
  - Value: nilai `INTERNAL_API_KEY`
- Response → Format: **JSON**
- Options → **Never Error** : OFF (biar 401/500 kelihatan)

Bentuk responsnya:

```json
{
  "generated_at": "2026-07-29T00:00:00.000Z",
  "level": "warn",
  "groups": [
    {
      "batch_key": "2026-07-29:ngaliyan:warn",
      "branch": "Ngaliyan",
      "branch_id": "uuid",
      "telegram_chat_id": "-1001234567890",
      "ticket_count": 4,
      "ticket_ids": ["uuid", "..."],
      "by_status": [
        {
          "status": "menunggu_part",
          "label": "Menunggu part",
          "tickets": [
            {
              "id": "uuid",
              "ticket_no": "SRV/00113/202607",
              "device": "Lenovo ThinkPad T480",
              "serial_number": "PF1ABCDE",
              "branch": "Ngaliyan",
              "status": "menunggu_part",
              "days_since_intake": 9,
              "days_in_status": 7,
              "part_eta": "30 Jul",
              "pic": "jalva"
            }
          ]
        }
      ]
    }
  ]
}
```

### Node 3 — IF (berhenti kalau kosong)

- Type: **IF**
- Condition: **Number → Larger**
  - Value 1: `{{ $json.groups.length }}`
  - Value 2: `0`
- Cabang **true** → lanjut ke Node 4
- Cabang **false** → biarkan menggantung (tidak ada node)

> Kalau tidak ada tiket menua, **tidak ada pesan sama sekali**. Jangan
> tambahkan node yang mengirim "tidak ada tiket menua hari ini" — itu
> melatih orang mengabaikan notifikasi.

### Node 4 — Split Out

- Type: **Split Out**
- Field to Split Out: `groups`
- Include: **No Other Fields**

Setelah node ini, tiap item = satu cabang.

### Node 5 — Code (rakit pesan)

- Type: **Code**
- Mode: **Run Once for Each Item**

```js
const g = $input.item.json;

// Escape MarkdownV2. Perhatikan: '/' BUKAN karakter khusus, tapi '-' dan
// '.' iya — nomor tiket & tanggal paling sering bikin pesan ditolak.
const esc = (s) =>
  String(s ?? '').replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => '\\' + c);

const ORDER = ['baru', 'dalam_pengerjaan', 'menunggu_part', 'siap_diambil'];
const MAX = 15;

const age = (t) =>
  t.status === 'siap_diambil' ? t.days_in_status : t.days_since_intake;

const all = g.by_status.flatMap((s) => s.tickets);
const ages = all.map(age);
const lo = Math.min(...ages);
const hi = Math.max(...ages);
const range = lo === hi ? `${lo} hari` : `${lo}–${hi} hari`;

const line = (t) => {
  const head = [esc(t.ticket_no), esc(t.device)].join(' · ');
  const d = [];
  if (t.status === 'siap_diambil') d.push(`${age(t)} hari menunggu diambil`);
  else d.push(`${age(t)} hari`);
  if (t.status === 'menunggu_part')
    d.push(t.part_eta ? `part ETA ${esc(t.part_eta)}` : 'part ETA belum ada');
  if (t.pic) d.push(esc(t.pic));
  return `• ${head}\n  ${d.join(' · ')}`;
};

const blocks = [];
let written = 0;
for (const s of [...g.by_status].sort(
  (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status)
)) {
  if (written >= MAX) break;
  const sorted = [...s.tickets].sort((a, b) => age(b) - age(a));
  const shown = sorted.slice(0, MAX - written);
  written += shown.length;
  blocks.push(
    `${esc(s.label.toUpperCase())} \\(${s.tickets.length}\\)\n` +
      shown.map(line).join('\n')
  );
}

let message =
  `🔧 Tiket perlu ditindak — ${esc(g.branch)}\n` +
  `${all.length} tiket, umur ${range}\n\n` +
  blocks.join('\n\n');

const rest = all.length - written;
if (rest > 0) message += `\n\n\\+${rest} tiket lain, lihat daftar lengkap`;

return { json: { ...g, message } };
```

> **Pilih satu tempat saja untuk merakit pesan.** Kode di atas menyalin
> logika `src/lib/aging/compose.ts`. Kalau nanti formatnya berubah, ubah
> di satu tempat lalu salin — jangan biarkan dua versi hidup berdampingan
> dan saling menyimpang.

### Node 6 — Telegram

- Type: **Telegram**
- Resource: `Message`, Operation: `Send Message`
- Chat ID: `{{ $json.telegram_chat_id }}`
- Text: `{{ $json.message }}`
- Additional Fields → **Parse Mode: `MarkdownV2`**
- Settings → **On Error: Continue (using error output)**

Node ini punya dua output: sukses (atas) dan error (bawah).

### Node 7 — HTTP Request (catat sukses)

Sambungkan dari **output sukses** Node 6.

- Method: `POST`
- URL: `https://APP_URL/api/aging/batches`
- Authentication: Header Auth yang sama
- Body Content Type: **JSON**
- Specify Body: **Using JSON**

```
{{ JSON.stringify({
  batch_key: $('Code').item.json.batch_key,
  level: 'warn',
  branch: $('Code').item.json.branch,
  branch_id: $('Code').item.json.branch_id,
  ticket_ids: $('Code').item.json.ticket_ids,
  message: $('Code').item.json.message,
  status: 'sent'
}) }}
```

- Options → **Never Error: ON**

> **Kenapa Never Error?** Endpoint ini balas `409` kalau `batch_key` sudah
> pernah dicatat — artinya digest hari ini sudah terkirim dan panggilan ini
> duplikat. Itu hasil yang benar, bukan kegagalan: perlakukan sebagai
> "lewati". Tanpa Never Error, n8n menandai run-nya merah padahal tidak ada
> yang salah.

### Node 8 — HTTP Request (catat gagal)

Sambungkan dari **output error** Node 6. Sama seperti Node 7, kecuali:

```
{{ JSON.stringify({
  batch_key: $('Code').item.json.batch_key,
  level: 'warn',
  branch: $('Code').item.json.branch,
  branch_id: $('Code').item.json.branch_id,
  ticket_ids: $('Code').item.json.ticket_ids,
  message: $('Code').item.json.message,
  status: 'failed',
  error: $json.error?.message ?? 'Telegram gagal'
}) }}
```

> Batch gagal **tidak** menyentuh cooldown, jadi tiketnya otomatis dicoba
> lagi besok. Ini disengaja.

---

## Workflow 2 — Aging Digest (Escalate)

Duplikat workflow di atas, lalu ubah:

1. **Schedule Trigger** → `15 0 * * 1-6` (07:15 WIB)
2. **HTTP Request** → `?level=escalate`
3. **Telegram → Chat ID** → hardcode chat id grup manajemen.
   `telegram_chat_id` dari API bernilai `null` untuk escalate, karena
   digest ini lintas cabang dan tidak terikat satu cabang pun.
4. **Node Code** → ganti bagian perakitan pesan: tidak dikelompokkan per
   status, diurutkan murni umur terlama, dan cabang ditampilkan per tiket.

```js
const shown = all.sort((a, b) => age(b) - age(a)).slice(0, MAX);
const line = (t) => {
  const head = [esc(t.ticket_no), esc(t.device), esc(t.branch)].join(' · ');
  // ...sisanya sama seperti Workflow 1
};
let message =
  `🚨 Tiket lewat batas — lintas cabang\n` +
  `${all.length} tiket, umur ${range}\n\n` +
  shown.map(line).join('\n');
```

5. Semua `level: 'warn'` di Node 7 & 8 → `'escalate'`.

---

## Catatan operasional

### Node Execute Query (kalau nanti dipakai)

Rancangan ini **sengaja lewat HTTP API, bukan Execute Query langsung ke
Postgres** — logika bisnis (hitung umur, pita warn/escalate, cooldown,
pengelompokan) ditaruh di server supaya bisa diuji, bukan tersebar di node
n8n. Tapi kalau suatu saat butuh node Execute Query:

- Aktifkan **"Always Output Data"** pada node-nya. Tanpa itu, hasil kosong
  menghentikan alur tanpa jejak.
- **Query berparameter `$1` tidak jalan** di versi n8n ini. Pakai
  interpolasi ekspresi, dan escape apostrof sendiri:
  ```
  select * from service_tickets where no_service = '{{ $json.no.replace(/'/g, "''") }}'
  ```

### Idempotensi

`followup_batches.batch_key` punya unique constraint, dan `batch_key`
berbentuk `TANGGAL:cabang:level` (tanggal dihitung dalam WIB). Kalau
workflow kepicu dua kali dalam satu hari, insert kedua ditolak **di level
database** — bukan dicek di aplikasi. Yang kedua dapat `409` dan tidak ada
baris ganda di `ticket_updates`.

### Hubungan dengan History Follow Up

Tiap tiket dalam batch yang berhasil terkirim dicatat sebagai satu baris
`ticket_updates` dengan `channel = 'auto'`, supaya hitungan "sudah dikejar
berapa kali" di halaman History Follow Up tetap benar. Di UI, kanal ini
ditandai abu dengan ikon berbeda — ini pengingat internal, bukan pesan ke
customer.

Kejaran otomatis **tidak** mengubah status tiket dan **tidak** menyentuh
`updated_at`, jadi tanda "macet" di daftar tiket tidak ikut hilang cuma
karena sistem mengirim pengingat.
