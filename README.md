# ServiceTrack — Monitoring Progres Servis Unit Multi-Cabang

Internal web app untuk lapor & follow-up unit yang bermasalah di tiap cabang,
sampai progresnya selesai.

## Alur

1. Staff cabang lapor unit bermasalah → tiket status **Baru**
2. Tim yang menangani update progres → **Diproses** → (kalau nunggu part) **Tunggu Sparepart** → **Selesai**
3. Setiap perubahan status wajib disertai catatan → tersimpan sebagai riwayat follow-up per tiket
4. Dashboard menandai tiket yang **macet** (belum ada update >3 hari) biar gampang di-follow-up

## Setup dari Nol (Supabase → GitHub → Vercel)

### 1. Supabase

1. Buka [supabase.com](https://supabase.com) → **New project**.
2. Setelah project jadi, buka **SQL Editor** → jalankan 3 file ini **satu per satu, berurutan**:
   - `supabase-auth-setup.sql`
   - `supabase-master-data-setup.sql`
   - `supabase-tickets-setup.sql`
3. Buka **Project Settings → API**, catat:
   - `Project URL` → jadi `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → jadi `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → jadi `SUPABASE_SERVICE_ROLE_KEY` (rahasia, jangan expose ke client)

### 2. Buat akun Super Admin pertama

1. Jalankan app (lokal atau setelah deploy), buka halaman login, klik **Daftar**.
2. Daftar pakai email kamu sendiri.
3. Balik ke Supabase **SQL Editor**, buka lagi `supabase-auth-setup.sql`,
   ganti `GANTI_DENGAN_EMAIL_KAMU@gmail.com` di bagian bawah jadi email yang barusan kamu daftarkan, lalu run ulang **bagian UPDATE-nya saja**.
4. Login lagi — sekarang kamu Super Admin dan bisa lihat menu **Admin → Kelola Akun**.

### 3. Jalankan lokal (opsional, buat coba dulu sebelum deploy)

```bash
npm install
cp .env.example .env.local
# isi .env.local dengan 3 value dari langkah Supabase di atas
npm run dev
```

Buka `http://localhost:3000`.

### 4. GitHub

```bash
git init
git add .
git commit -m "Initial commit: ServiceTrack"
gh repo create servicetrack --private --source=. --push
# atau manual: buat repo baru di github.com, lalu:
# git remote add origin https://github.com/USERNAME/servicetrack.git
# git branch -M main
# git push -u origin main
```

### 5. Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New → Project** → import repo `servicetrack` dari GitHub.
2. Di step **Environment Variables**, isi 3 variable yang sama seperti `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Klik **Deploy**. Setelah selesai, buka URL yang diberikan Vercel — itu link aplikasinya.

## Struktur Folder

```
src/
├── app/
│   ├── api/admin/create-user/route.ts   # Bikin akun teammate (super admin only)
│   ├── layout.tsx
│   ├── page.tsx                          # Root: routing antar panel + role check
│   └── globals.css
├── components/
│   ├── auth/          # LoginScreen, PendingScreen
│   ├── layout/        # Sidebar, nav config, Kelola Akun
│   ├── dashboard/      # Ringkasan/Overview
│   ├── tickets/        # Daftar tiket, lapor tiket baru, detail+follow-up
│   └── master/         # Master data cabang & unit
├── lib/
│   ├── auth.tsx         # Auth context + role/branch_scope
│   ├── supabase.ts
│   ├── branches.ts
│   ├── units.ts
│   └── tickets.ts       # CRUD tiket + follow-up log + logika "macet"
└── types/index.ts
```

## Role & Akses

| Role | Bisa apa |
|---|---|
| `staff` | Lapor unit bermasalah, lihat & update tiket (sesuai `branch_scope`) |
| `admin` | Sama seperti staff, biasanya untuk yang koordinasi antar cabang |
| `super_admin` | Semua akses + **Kelola Akun** (buat/aktifkan/nonaktifkan user, atur role & cabang) |

`branch_scope` kosong = user bisa lihat semua cabang. Diisi = dibatasi ke cabang tertentu saja.

## Roadmap Lanjutan (belum dibuat, bisa ditambah kapan saja)

- [ ] Notifikasi (toast/bell) real-time saat ada tiket baru atau macet
- [ ] Upload foto bukti kerusakan/perbaikan (bucket Supabase Storage sudah disiapkan namanya: `ticket-photos`)
- [ ] Export laporan servis ke Excel per periode
- [ ] SLA per prioritas (mis. urgent harus selesai <1 hari) dengan alert otomatis
- [ ] Riwayat servis per unit (histori semua tiket 1 unit dari waktu ke waktu)
