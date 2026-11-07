# Panduan, pemasangan PWA, dan aksi beranda

## Tampilan dan penempatan

Tautan Lainnya, Kelola/Semua info, Baca selengkapnya, dan Lihat gambar utuh memakai tombol ringkas satu sistem: ikon, jarak, radius, fokus keyboard, dan target sentuh mobile minimal 44 px. Judul informasi panjang bisa membungkus tanpa menggeser tombol keluar layar. Edit/hapus/pulihkan informasi hanya diteruskan sebagai aksi pada halaman kelola, bukan kartu ringkas beranda. Ikon edit di atas banner beranda dihapus; pengelolaan banner tetap melalui Lainnya → Kelola Banner. Saat banner kosong, admin boleh membuka tautan Kelola banner untuk mengisinya.

Kartu Anak tertaut pada rincian aktivitas wali diratakan tengah, dengan angka, label, dan keterangan berjarak terpisah. Keterangan menjadi elemen dd dalam dl, mendapat ukuran huruf/line-height sendiri agar tidak mewarisi angka besar atau berhimpitan.

## Panduan penggunaan

Sesudah profil dan data beranda selesai dimuat, panduan menyorot setiap tombol menu yang benar-benar tersedia bagi peran pengguna, lalu Lainnya, Informasi, Aktivitas, Notifikasi, dan navigasi HP/PC. Ada Lanjut, Kembali, Lewati, serta penunjuk kemajuan. Dialog memakai modal native dengan fokus keyboard dan mengembalikan fokus setelah ditutup; gulir dan ukuran layar memperbarui posisi sorotan.

Penanda pertama ditulis sebelum membuka panduan, bukan setiap login dan bukan hanya localStorage. Tabel `public.panduan_pengguna` memiliki primary key profile_id sehingga hanya satu tab/perangkat menang ketika dua login bersamaan. Penanda bermakna kesempatan panduan otomatis sudah diberikan, bukan bahwa pengguna menyelesaikan semua langkah. Refresh data tidak memunculkannya lagi. Akun → Panduan penggunaan membuka ulang secara manual. Gangguan penyimpanan panduan tidak memblokir data utama; pembukaan manual tetap tersedia.

Migrasi yang sudah diterapkan: `20261107030604_panduan_pengguna.sql`. RLS mengizinkan pengguna membaca/menambahkan penanda sendiri; authenticated tidak memiliki UPDATE/DELETE, maupun INSERT pada kolom waktu. Anon tidak mendapat hak tabel. Tidak ada fungsi definer baru.

## PWA dan keterbatasan browser

Di produksi, akses layanan harus dari jendela aplikasi mandiri (`display-mode: standalone`, window-controls-overlay, atau navigator.standalone pada iOS). Tab browser menampilkan halaman pemasangan tanpa X atau tombol lewati; flag localStorage atau query tidak digunakan untuk melewati gerbang. Mode development tetap dapat dipakai untuk pengembangan lokal. Ini adalah kebijakan tampilan, bukan batas keamanan; autentikasi dan RLS tetap pengaman data.

Pemasangan tetap memerlukan persetujuan sistem/browser. Situs tidak dapat menghapus X/Batal pada dialog bawaan OS, memasang otomatis, atau membuktikan status instalasi lintas semua browser. Tombol Pasang muncul hanya jika beforeinstallprompt tersedia; event dipakai sekali per tawaran. appinstalled hanya memperbarui petunjuk: tab biasa tetap meminta pengguna membuka ikon aplikasi, bukan menganggapnya sudah menjadi jendela PWA. Panduan manual tersedia bagi iPhone/iPad, Android, Mac, dan komputer. Browser tanpa dukungan diarahkan memakai browser yang mendukung. Jika aplikasi sudah dipasang tetapi link tetap dibuka di tab, pengguna juga diminta membuka ikon aplikasi.

Tautan pemulihan sandi `/atur-sandi` dikecualikan supaya sesi pemulihan dari email tetap dapat diselesaikan pada browser pembuka tautan. Route callback Auth tetap bekerja di server. Setelah pemulihan, penggunaan normal tetap melalui aplikasi terpasang. Membuka link dalam aplikasi terpasang secara otomatis bergantung pengaturan OS/browser; tidak ada klaim deep-link universal.

Manifest memakai id/scope `/`, dua ikon PNG 192/512, identitas logo yang sama, display standalone, dan meta Apple. Service worker `/sw.js` dengan cache header no-store memuat fallback luring dan dua logo publik. Halaman/data akun, RSC, API, Supabase, dan gambar privat tidak dimasukkan Cache Storage. Navigasi normal mengambil jaringan; saat koneksi gagal, hanya halaman bantuan luring generik ditampilkan. PWA tetap membutuhkan internet untuk layanan/data. Update service worker menghapus cache publik versi lama milik aplikasi saja, tidak memaksa reload formulir yang sedang diisi.

Rujukan implementasi: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable dan https://web.dev/learn/pwa/installation-prompt .

## Verifikasi

- Typecheck dan build OpenNext Cloudflare lulus.
- Sepuluh suite verifikasi termasuk suite baru `scripts/verifikasi-panduan-pwa.cjs`: langkah setiap peran, penanda per akun, refresh tidak mengulang, buka manual, alur tawaran instalasi, tab biasa tetap terkunci setelah appinstalled, pemulihan sandi, menu beranda tanpa edit/hapus, serta worker tidak menyimpan respons privat.
- Suite komponen memakai jsdom 31.0.0 sebagai devDependency. Jalankan dari apps/web: `node scripts/verifikasi-panduan-pwa.cjs`.
- PostgreSQL lokal PGlite memuat seluruh migrasi dan `supabase/tests/panduan_rls.sql`; server menjalankan SQL yang sama dalam rollback. Akses sendiri lulus; akun lain/anonim, ubah/hapus, dan duplikasi ditolak. Penanda uji dibatalkan agar pengguna tetap memperoleh panduan sesungguhnya.
- Advisor keamanan tidak menambah peringatan baru. Peringatan lama dicatat pada dokumentasi fitur sebelumnya.
- Pengujian prompt/standalone pada suite komponen memakai event simulasi, bukan klaim pemasangan nyata di semua jenis perangkat. Pengujian UI private dengan akun produksi tidak dilakukan karena tidak ada akun uji aktif.
