# Login PC, dashboard web, dan grafik aktivitas

## Perubahan

Login pada lebar >=1024 px memakai komposisi grid tiga bagian (identitas, isi, footer). Panggung dan ukuran ilustrasi mengikuti tinggi viewport, menggantikan ilustrasi besar yang membuat halaman memanjang. Form dipadatkan menjadi input/tombol 44 px, gap 10 px, dan padding 20–28 px. Pada tinggi >=640 px shell memakai tinggi 100svh; pada tinggi <=700 px langkah dekoratif disembunyikan dan ilustrasi diperkecil. Tinggi sangat pendek atau pembesaran teks tetap boleh memperpanjang dokumen agar kontrol/pesan tidak terpotong; tidak memakai overflow:hidden pada formulir atau body. Logo dibatasi agar tidak keluar dari kotak identitas. Alur login, lupa sandi, pendaftaran, dan sesi tidak diubah.

Beranda PC memakai sidebar yang sudah ada, breadcrumb, judul Dashboard pondok dan tombol sesuai peran, toolbar sapaan/pencarian, menu modul horizontal empat kolom, banner di bawah menu bersama konteks semester, informasi pondok dalam deretan kartu, dan grafik aktivitas di bagian bawah. Hero besar mobile disembunyikan khusus PC. Aturan breakpoint di stylesheet terpisah, diimpor terakhir dari root layout agar urutan override konsisten. Mobile mempertahankan hero, menu lingkaran empat kolom, banner, informasi, dan navigasi bawah yang sudah disetujui.

Komponen RincianAktivitas dipakai PC dan mobile: tiga batang horizontal berwarna untuk setoran, kehadiran, dan catatan; kartu santri terpisah; sesi olahraga terpisah dengan label pekan. Wali mendapat label anak tertaut dan catatan tercatat, tanpa olahraga. Tidak menjumlahkan santri dan sesi menjadi persentase/donat atau mengarang tren historis. Sumbu mulai nol dan memakai maksimum genap terdekat. Nol tetap panjang nol, tanpa batang minimum palsu. Nilai tetap dapat dibaca sebagai teks, batang bisa difokuskan keyboard, dan transisi mengikuti reduced motion. Loading/gagal tidak menggambar angka lama; tersedia tombol muat ulang.

Sumber data dan pembatas peran tetap berasal dari lapisan beranda yang ada. Catatan sumber yang dibatasi jumlah pengambilan sebelumnya tidak diubah menjadi klaim total historis; keterangan grafik menyatakan berdasarkan catatan yang dimuat. Tidak ada perubahan schema, kebijakan akses, atau data pondok.

## Validasi

- `npm run typecheck`
- `npm run build:cf`
- `node scripts/verifikasi-dashboard.cjs`: rasio 8:4:0 = 100%:50%:0%, nol, angka asli, loading, gagal, statistik null, NaN, wali, tanpa accordion.
- `node scripts/verifikasi-ui.cjs`: menu semua peran, data dan pencarian berizin, analytics lama.
- `node scripts/verifikasi-pondok.cjs`: urutan menu/banner dan aktivitas paling bawah, informasi dan poster.
- `node scripts/verifikasi-akses.cjs`: halaman akses, logo, field dan tautan login, logika autentikasi tetap sama.

Browser pratinjau tidak dapat terhubung ke server lokal (ERR_CONNECTION_REFUSED), sehingga pemeriksaan visual langsung dan pengukuran scroll viewport belum dapat dilakukan. Sesudah deploy perlu memeriksa login pada 1366×768, 1440×900, 1920×1080 dan 1024×640, termasuk pesan galat, lalu memeriksa dashboard desktop dan mobile 390×844. Keberhasilan build dan tes bukan bukti pengujian visual perangkat.

Target frontend: branch/PR untuk main, belum menerbitkan perubahan ke Workers. Tidak ada gambar baru atau perubahan backend pada revisi ini.
