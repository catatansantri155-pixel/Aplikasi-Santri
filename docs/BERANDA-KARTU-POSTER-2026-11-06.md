# Beranda, kartu informasi, dan poster — 6 November 2026

## Perilaku akhir

Beranda menampilkan Menu Utama terlebih dahulu, kemudian carousel gambar, informasi pondok, konteks semester, dan satu kartu rincian aktivitas yang selalu terbuka. Carousel tetap bergeser otomatis setiap tujuh detik, tanpa teks tertanam, caption, panah, ataupun tombol Jeda/Lanjutkan. Indikator kecil berada di atas gambar. Pergantian berhenti saat hover, fokus keyboard, tab tidak terlihat, atau pengguna mengaktifkan reduced motion.

Informasi pondok memakai tiga template teks (Pengumuman, Kegiatan, Jadwal) dan tiga latar (hijau, emas, biru). Pemilihan template tidak mengganti tulisan sampai tombol Gunakan template ditekan; tulisan yang sudah ada meminta konfirmasi sebelum diganti. Bagian contoh bertanda `[ ]` harus dilengkapi sebelum terbit. Pratinjau kartu mengikuti isian.

Admin dapat menambahkan poster JPG/PNG/WebP maksimal 5 MB. Judul tetap wajib; isi boleh kosong bila ada gambar. Gambar ditampilkan utuh dengan judul dua baris di atas gradasi hitam pada bagian bawah. Tautan Lihat gambar utuh membuka poster tanpa lapisan judul. Gagal memuat gambar menampilkan judul dan isi sebagai cadangan.

Kartu semester menampilkan label Semester aktif, nama semester, tanggal, dan Hijriah. Tahun ajaran ditampilkan terpisah hanya jika belum terkandung di nama semester. Ikon navigasi bawah berubah dari 20 menjadi 22 px, stroke aktif 2.6 dan lainnya 2.1. Navigasi berdasarkan peran tetap dipertahankan.

Pada desktop, daftar informasi penuh memakai dua kolom; preview beranda tetap satu kolom. Form editor dibatasi lebar 780 px; layar sangat kecil menumpuk kolom form.

## Database dan gambar

Migration `supabase/migrations/20261106015852_informasi_visual.sql` sudah diterapkan ke proyek aplikasi. Menambah `tema` dan `gambar_path` tanpa mengubah pengumuman yang sudah ada. Bucket `informasi-pondok` bersifat private dengan batas jenis/ukuran di server. Upload dibatasi admin dan folder UUID akun; gambar draf hanya dibaca admin; gambar terbit mengikuti akses informasi. Klien memakai sesi pengguna, bukan service role.

URL gambar ditandatangani selama satu jam; tautan yang sudah dibuat dapat tetap berlaku sampai masa itu berakhir setelah status ditarik ke draf. URL tidak disimpan di database. Jika halaman dibiarkan terbuka lebih lama dan gambar gagal dimuat, muat ulang untuk memperbarui URL. Jalur gambar fiktif ditolak trigger. Berkas hasil upload yang gagal disimpan dibersihkan bila belum direferensikan. Gambar lama yang pernah direferensikan tidak dihapus otomatis.

Dokumentasi primer: [Storage private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

## Aset carousel

Dibuat menggunakan image generation bawaan; file hasil akhir berada di `apps/web/public/images/banner/suasana-1.webp` hingga `suasana-7.webp`, 2172 × 724 px. Versi lama tidak dihapus agar referensi lama tetap aman.

Prompt bersama: `Use case: stylized-concept. Asset type: production web carousel banner, ultra-wide 3:1 landscape. Subject: {subject}. Premium polished 3D illustration matching a pondok santri application, tactile rounded forms, rich deep emerald and teal background, warm ivory and subtle gold materials, cinematic soft daylight, balanced scene across the FULL canvas, detailed but uncluttered, no empty text placeholder. Critical: absolutely NO people, NO characters, NO faces, NO text, NO lettering, NO numbers, NO logos, NO watermark, no writing even on books. Edge-to-edge opaque background.`

| File | Subject |
| --- | --- |
| suasana-1.webp | A beautiful stack of emerald and ivory books beside a small plant and warm reading lamp in an Islamic arched study alcove |
| suasana-2.webp | An open Quran on a wooden rehal with teal floor cushion and warm lantern in a quiet Islamic study corner |
| suasana-3.webp | A blank attendance clipboard with simple check marks and a round analog clock, alongside a pencil and tiny plant |
| suasana-4.webp | An open blank notebook with a beautiful gold pen and teal bookmark on a wooden study desk |
| suasana-5.webp | A soccer ball, basketball, teal water bottle and neatly folded towel on a small wooden sports platform |
| suasana-6.webp | A miniature elegant Indonesian Islamic boarding school with arched windows, books and garden courtyard |
| suasana-7.webp | Cream stepping stones leading through an elegant Islamic arch to a thriving green plant, soft sun rays |

## Validasi

- `npm run typecheck`, `npm run build:cf`.
- `node scripts/verifikasi-pondok.cjs`: urutan beranda, aktivitas tanpa details, tidak ada caption/Jeda/Lanjutkan, tujuh aset, batas dan format upload, informasi poster tanpa isi, template sebelum terbit, render kartu teks/gambar, periode.
- `node scripts/verifikasi-ui.cjs`, `node scripts/verifikasi-akses.cjs`: regresi menu lima peran, pencarian, analytics, halaman autentikasi/logo.
- `supabase/tests/informasi_rls.sql`: admin tulis/ubah/draf; empat peran lain hanya baca terbitan; anon ditolak.
- `supabase/tests/informasi_visual_rls.sql`: metadata Storage admin insert/select; wali hanya SELECT gambar terbitan dan tidak dapat INSERT; anon tidak dapat SELECT; poster tanpa isi dan penolakan jalur fiktif. Semua fixture transaksi di-rollback, tidak menyisakan posting atau perubahan peran.
- Tujuh gambar ditinjau visual: tanpa orang dan tulisan.

Uji SQL bukan uji unggah file melalui browser. Upload browser dan pemeriksaan visual perangkat mobile/desktop pada hasil deploy masih perlu dilakukan sesudah frontend digabung dan dideploy. Build lokal tidak menerbitkan perubahan ke Workers.

Pemeriksaan advisor tidak melaporkan masalah RLS pada fitur ini. Peringatan fungsi lama `set_updated_at`, fungsi SECURITY DEFINER lama, dan pengaturan password Auth sudah ada di luar cakupan perubahan ini; [rujukan linter](https://supabase.com/docs/guides/database/database-linter), [password Auth](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
