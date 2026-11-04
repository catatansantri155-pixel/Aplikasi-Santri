# Redesign ruang kerja Aplikasi Santri

Redesign ini mengganti hierarki visual dan susunan komponen aplikasi yang sudah berjalan. Dasar perubahan: commit `a4a8fff9aac2ebd4dbe3a97adcda8d205143a6c5`.

## Perubahan

- Sistem visual di `apps/web/src/app/ui.css`, dimuat setelah stylesheet lama: warna navy, permukaan netral, kartu bergaris tipis, tombol 44 px, tab satu baris, dan dukungan tema gelap serta ukuran teks.
- Kerangka: sidebar dengan identitas akun, jejak halaman desktop, bilah merek ringkas mobile, dan indikator aktif navigasi bawah.
- Beranda: aktivitas utama ringkas, empat ringkasan data yang sudah tersedia, serta akses modul berdeskripsi. Ikon modul yang sudah ada dipertahankan. Tautan "Semua" setoran menuju tab riwayat.
- Hifzh: konteks, materi, dan penilaian dipisah menjadi kelompok. Jenis hafalan memakai radio native yang bisa dioperasikan dengan keyboard. Catatan/tugas opsional dan panduan memakai disclosure. Panel ringkasan desktop mengikuti gulir; di mobile turun setelah isian.
- Bilah Simpan Hifzh menyebut santri dan pratinjau nilai, serta memperhitungkan navigasi bawah dan safe area. Pemilihan santri eksplisit, validasi formulir, fungsi penilaian, dan jalur penyimpanan dipertahankan.
- Riwayat Hifzh: pencarian pada entri terbaru yang sudah dimuat, jumlah hasil, serta keadaan hasil kosong. Ini bukan pencarian seluruh arsip server.
- Tabel rekap, nilai Diniyyah, detail santri, dan ujian Hifzh: setiap sel memiliki label; layar di bawah 640 px menggunakan susunan kartu dua kolom, desktop tetap berupa tabel.
- Kehadiran menampilkan nama status di bawah singkatannya. Filter riwayat catatan menjadi tiga kolom di layar lebar.

## Validasi

- TypeScript: `npm run typecheck`.
- Produksi Next.js: `npm run build`.
- Bundle Cloudflare: `npm run build:cf`.
- Render server formulir Hifzh dengan data contoh untuk memeriksa markup radio, pemilihan santri, dan tombol simpan awal.
- Pemeriksaan diff: perubahan terbatas pada tampilan frontend; tidak ada migrasi, perubahan aturan akses, atau perubahan rumus penilaian.

Browser pemeriksaan menolak URL file lokal, sehingga hasil render lokal tidak diklaim sebagai uji visual browser atau uji perangkat mobile. Validasi interaksi dengan akun produksi dan tampilan layar nyata memerlukan versi ini terpasang di situs. Build yang berhasil tidak membuktikan deployment selesai.
