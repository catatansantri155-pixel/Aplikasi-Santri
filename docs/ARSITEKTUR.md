# Arsitektur — Aplikasi Monitoring Santri Minhajus Sunnah

## Ringkasan
Next.js (Cloudflare Pages) → Supabase Auth + Postgres dengan RLS native. Tidak ada backend terpisah: aturan akses ditegakkan database, klien hanya memegang anon key + sesi login pengguna.

## Peran & akses (ditegakkan RLS)
| Peran | Baca | Tulis |
|---|---|---|
| admin | semua | semua + revisi kehadiran (dengan log) + kelola santri/kelas/akun |
| pengajar_hifzh | semua santri | kehadiran sesi hifzh, setoran & ujian hifzh, catatan |
| pengajar_diniyyah | semua santri | kehadiran sesi diniyyah, nilai harian & ujian, catatan |
| musyrif | semua santri | catatan (+ kehadiran olahraga) |
| wali | HANYA santri tertaut di `wali_santri` | tidak ada (hanya-lihat) |

Uji negatif wajib di Tahap 4: wali A meminta data santri B (URL/API langsung) harus ditolak database.

## Aturan bisnis yang hidup di database
- Konversi kesalahan: KK total = KK + RG div 3; KB konversi = KB + KK total div 3.
- Nilai setoran: BR/TS → L hanya bila RG=KK=KB=0, selain itu U. LM/BC → L bila KB konversi ≤ 3.
- Hasil tes semester per juz dari KB konversi: 0 M, 1–2 BS, 3–4 B, 5–7 C, 8–10 K, ≥11 G.
- Revisi kehadiran hanya lewat prosedur admin dan selalu menulis `kehadiran_log_revisi`.
- Catatan musyrif: `pelapor_id` dan `pelapor_nama` NOT NULL, pelapor = pengguna login.

## Alur data
Pengajar login → isi kehadiran/setoran/nilai/catatan → tersimpan dengan pengisi = uid login → rekap & grafik terbaca dari view agregat → wali login → hanya baris santri tertaut yang lolos RLS.

## Lingkungan
- Lokal: repo ini (`apps/web`, `supabase/migrations`).
- Produksi (Tahap 3): proyek Supabase baru + repo GitHub baru + Cloudflare Pages; migrasi dijalankan berurutan 0001→0004 (seed contoh hanya untuk lingkungan uji, bukan produksi).
