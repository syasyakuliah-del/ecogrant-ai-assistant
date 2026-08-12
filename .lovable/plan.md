# Melengkapi EcoGrant AI sesuai PRD

Saat ini aplikasi punya: landing page, autentikasi, dashboard user, daftar proposal, dan wizard 10 langkah lengkap. Yang belum ada: seluruh area admin, Community, Notification Center, Profil, Pengaturan Akun, Help Center, Tentang Aplikasi — semuanya sudah tertaut di sidebar tetapi halamannya belum dibuat (klik = halaman kosong). Aturan admin pertama juga belum ada.

## 1. Admin otomatis untuk pendaftar pertama

Trigger pendaftaran saat ini selalu memberi peran `user`. Diubah agar: jika belum ada satu pun baris peran admin di database, akun yang baru mendaftar langsung mendapat peran `admin`; pendaftar berikutnya tetap `user`. Pengecekan dilakukan di sisi database (aman dari manipulasi klien), dengan penguncian agar dua pendaftaran bersamaan tidak sama-sama jadi admin.

## 2. Data baru yang diperlukan

- `activities` (Kelola Kegiatan): kategori, sub kegiatan, nama, deskripsi, output & indikator default, satuan target, mapping LFA, mapping kategori RAB, status aktif.
- `proposal_versions`: riwayat versi proposal untuk audit dan pembanding.
- `help_articles`: artikel Help Center yang bisa dicari, diisi konten awal (panduan memulai, wizard, AI, LFA, SBM, SBU, RAB, FAQ, kontak).
- `login_histories`: riwayat login untuk Pengaturan Akun dan keamanan.
- `ai_generations`: catatan pemakaian AI untuk Analytics admin.

Semua tabel memakai RLS: user hanya melihat datanya sendiri, admin melihat seluruhnya; data master (kegiatan, artikel) dapat dibaca semua pengguna login dan hanya diubah admin.

## 3. Halaman pengguna yang dilengkapi

- **Notifikasi**: daftar notifikasi, tandai dibaca / tandai semua, filter jenis, tautan langsung ke proposal terkait.
- **Community**: daftar artikel, detail artikel, komentar, dan tulis artikel (moderasi status oleh admin).
- **Profil**: ubah nama, organisasi, jabatan, telepon, bio, unggah foto profil.
- **Pengaturan Akun**: ubah kata sandi, preferensi tema & notifikasi, riwayat login, hapus akun.
- **Help Center**: pencarian artikel panduan + FAQ + kontak dukungan.
- **Tentang Aplikasi**: versi, ruang lingkup, kebijakan singkat.

## 4. Area admin (delapan halaman)

- **Dashboard Admin**: ringkasan jumlah user, proposal per status, aktivitas terbaru, penggunaan AI.
- **Kelola Proposal**: seluruh proposal, filter/pencarian, ubah status, lihat detail, hapus.
- **Kelola User**: daftar user, ubah status aktif/nonaktif, atur peran (admin/user), lihat aktivitas.
- **Kelola Donor**: CRUD donor beserta prioritas, syarat, rentang dana, tenggat.
- **Kelola SBM** dan **Kelola SBU**: CRUD standar biaya per wilayah/tahun, pencarian, impor & ekspor CSV.
- **Kelola Kegiatan**: CRUD master kegiatan dengan mapping LFA dan RAB.
- **Analytics**: grafik proposal per bulan, status, kategori, wilayah, pemakaian AI, ekspor.
- **Audit Log**: daftar aksi tersaring per user/aksi/tanggal dengan detail perubahan.

Semua rute admin dijaga ganda: pengecekan peran di klien (redirect non-admin) dan RLS di database.

## 5. Penyempurnaan lain sesuai PRD

- Menu Kelola Kegiatan ditambahkan ke sidebar admin.
- Catatan audit ditulis pada aksi penting (login, buat/ubah/hapus proposal, aksi admin).
- Notifikasi otomatis saat status proposal diubah admin.
- Metadata head unik untuk setiap halaman baru.

## Catatan teknis

Rute baru mengikuti pola berkas yang ada (`_authenticated.<nama>.tsx`, admin di `_authenticated.admin.*.tsx`) dan memakai TanStack Query. Migrasi database dijalankan satu kali mencakup tabel baru, GRANT, RLS, trigger admin pertama, dan konten awal Help Center. Ekspor/impor CSV memakai pustaka `xlsx` yang sudah terpasang.
