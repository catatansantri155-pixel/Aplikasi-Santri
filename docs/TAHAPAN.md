# Tahapan Implementasi — Aplikasi Monitoring Santri Minhajus Sunnah

Disetujui user: Senin 2 Nov 2026 ("kerjakan dan implementasikan, paralel dan bertahap").
Patokan desain: prototipe `prototipe-aplikasi-monitoring-santri` (sudah disetujui, versi PDF + warna kop + kerapatan Maktabah).

## Keputusan arsitektur
- Frontend: Next.js, mobile-first (pola Maktabah Al-'Ilmiyyah terbaru), deploy Cloudflare Pages.
- Database & Login: Supabase BARU (terpisah dari Pustaka Ilmu). Satu penyesuaian konsep yang disengaja: login memakai Supabase Auth dan akses data ditegakkan RLS berbasis `auth.uid()` secara native — karena aturan terpenting aplikasi ini adalah "orang tua hanya bisa melihat anaknya sendiri", penegakan di level database adalah cara paling aman. Di Pustaka Ilmu RLS ter-bypass oleh backend; di sini tidak.
- Setiap tabel: `ENABLE ROW LEVEL SECURITY` sejak migrasi pertama (aturan keras turunan Pustaka Ilmu).
- Repo: GitHub baru (dibuat pada tahap akun & deploy).
- Identitas & warna: Ponpes Minhajus Sunnah Magelang, Marhalah Wustha; hijau kop #006B4F–#1E6B00, aksen emas #F0B000, aksen biru buku.

## Tahap 1 — Fondasi (PARALEL, dikerjakan sekarang, semua lokal)
- Jalur A (database): migrasi skema 14 tabel + enum + fungsi hitung resmi Buku Hafalan (KB konversi bertahap, nilai L/U, hasil semester M–G) + view rekap kehadiran pekanan/semesteran & agregat grafik hifzh + kebijakan RLS per peran.
- Jalur B (web): scaffold Next.js (App Router, TypeScript) mobile-first dengan palet kop, navigasi bawah HP/sidebar tablet-PC, halaman login, dan kerangka rute per peran.
- Jalur C (dokumen): dokumen ini + ARSITEKTUR.md (peran, alur data, matriks RLS).

## Tahap 2 — Modul Inti (PARALEL per modul, setelah fondasi)
1. Data santri & kelas 1/2/3 + tautan akun wali.
2. Kehadiran per sesi hifzh/diniyyah (H/S/I/A) + revisi khusus ADMIN + log revisi + rekap.
3. Hifzh: setoran 8 kolom Buku Hafalan + tes semester per juz + grafik.
4. Diniyyah: jadwal slot (mapel MENUNGGU PDF jadwal dari user) + nilai harian/ujian + rata-rata.
5. Catatan musyrif (pelapor otomatis dari login) + olahraga Ahad/Kamis pagi.
6. Dashboard orang tua (hanya anaknya, hanya-lihat).

## Tahap 3 — Akun & Deploy (butuh user standby untuk verifikasi)
Membuat proyek Supabase baru, repo GitHub baru, menyambung Cloudflare, menjalankan migrasi ke Supabase, seed akun ADMIN pertama + data kelas. WAJIB kabari user sebelum langkah apa pun yang memicu kode/verifikasi di perangkat user.

Status per 2 Nov 2026:
- **Repo GitHub: SELESAI** — repo privat `Aplikasi-Santri` dibuat dan seluruh kode Tahap 1–2 ter-push serta terverifikasi.
- **Proyek Supabase: SELESAI** — proyek baru terpisah `aplikasi-santri` (Singapura, Free) Healthy; migrasi 0001–0003 sukses via SQL Editor dan terverifikasi langsung dari database (15 tabel + 4 view, RLS aktif di semua tabel, 3 kelas terisi). Seed contoh SENGAJA tidak dijalankan di produksi.
- **Adapter Cloudflare: SIAP** — aplikasi disiapkan dengan adapter **OpenNext** (`@opennextjs/cloudflare`) dan build lokal + uji asap server pratinjau (Wrangler) LULUS. Satu penyesuaian dari rencana awal: targetnya **Cloudflare Workers**, bukan Pages klasik, karena adapter Pages (`@cloudflare/next-on-pages`) sudah deprecated dan tidak mendukung Next 16; OpenNext adalah jalur yang kini direkomendasikan Cloudflare dan pola yang sama seperti dicatat di dokumen deploy Pustaka Ilmu. Rincian perintah & env ada di `apps/web/README.md`.
- **Deploy Cloudflare: SELESAI** — aplikasi live di Cloudflare Workers (`aplikasi-santri.catatansantri155.workers.dev`, deploy manual oleh user dari dashboard) dengan env Supabase asli terisi; halaman terbukti membaca proyek Supabase asli (akses tanpa login ditolak RLS, sesuai desain).
- **Akun ADMIN pertama: SELESAI** — akun dibuat di Supabase Auth (kata sandi diisi user sendiri) dan terhubung ke baris `profiles` berperan `admin`.
- **Login asli: TERSAMBUNG** — halaman `/login` memakai Supabase Auth (`signInWithPassword`); kerangka menampilkan nama + peran pengguna yang login dari tabel `profiles` beserta tombol Keluar; halaman selain `/login` diarahkan ke `/login` bila tidak ada sesi (penjaga sisi klien di komponen kerangka; data tetap dijaga RLS). Identitas pengisi kehadiran, paraf penyimak hifzh, dan pelapor catatan diambil dari profil login, bukan profil contoh. Penanda contoh & "Tampilan Wali (contoh)" di beranda hanya tampil pada mode contoh (env kosong).
- **Berikutnya: Tahap 4** — uji per peran di deployment live, termasuk uji negatif wali dan uji alur login admin sungguhan.

## Tahap 4 — Uji & Serah Terima Bertahap
Uji per peran termasuk uji negatif (akun orang tua A tidak bisa membuka data anak orang tua B lewat URL langsung), uji rekap & grafik terhadap hitungan manual Buku Hafalan, lalu serah terima per modul ke user untuk dicek sebelum modul berikutnya dinyatakan selesai.

## Yang masih ditunggu dari user (tidak menghalangi Tahap 1–2 kecuali modul diniyyah)
- PDF jadwal lengkap diniyyah (mapel per slot)
- Rumus rata-rata diniyyah; pola pembuatan akun orang tua; tanggal semester gasal/genap; format penilaian olahraga
- Konfirmasi kecil hifzh: kriteria BC & KB mentah vs konversi (sementara: BC = LM, KB = hasil konversi)
