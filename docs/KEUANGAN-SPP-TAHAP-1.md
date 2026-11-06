# Keuangan Santri / SPP — tahap 1

## Cakupan

Modul ada di **Lainnya → Keuangan / SPP**, bukan Menu Utama beranda. Ikon baru mengikuti 3D biru/putih/kuning tanpa orang. PC menggunakan tabel lima kolom; layar kecil menggunakan daftar kartu. Ringkasan nominal dan progres pelunasan dihitung dari transaksi, tanpa angka contoh.

Akses hanya Admin Utama dan wali santri yang saat ini tertaut. Musyrif dan kedua pengajar tidak dapat membuka tabel, view, detail, bukti, atau notifikasi keuangan orang lain. Gerbang tampilan dibarengi RLS.

## Alur operasional

1. Admin menerbitkan tagihan untuk satu santri, kelas, atau semua santri aktif. Form memuat pilihan dengan pagination agar tidak terpotong batas default REST. Maksimal 500 santri per penerbitan. Isi jenis, judul, bulan, nominal rupiah bulat, jatuh tempo, dan instruksi pembayaran/catatan.
2. Jenis tersedia: SPP, daftar ulang, seragam, kegiatan, lainnya. SPP aktif dibatasi satu per santri per bulan; yang sudah ada dilewati dengan jumlah hasil yang jelas. Tagihan lain dapat lebih dari satu dalam bulan sama. Penerbitan menggunakan kunci idempoten; retry identik mengembalikan hasil awal.
3. Wali melihat tagihan anak yang tertaut dan instruksi pembayaran yang diisi admin. Tidak ada nomor rekening buatan. Jika kosong, wali diminta menghubungi admin.
4. Wali melakukan pembayaran melalui kanal resmi pondok di luar aplikasi, lalu mengirim nominal, tanggal, nama pembayar, dan bukti transfer. Bukti berstatus Menunggu verifikasi **belum mengurangi saldo**.
5. Admin menerima atau menolak bukti. Pembayaran diterima mengurangi sisa. Cicilan diperbolehkan sampai lunas. Form admin terpisah mencatat tunai/transfer yang sudah benar-benar diterima dan langsung berstatus Diterima.
6. Wali bisa menarik pengajuan pembayarannya sendiri sebelum diverifikasi. Alasan wajib. Penolakan dan koreksi juga wajib alasan.
7. Admin dapat mengoreksi pembayaran diterima dengan menandainya dibatalkan. Nominal tidak diubah dan rekam awal tidak dihapus; saldo ditambah kembali. Ini **bukan refund uang otomatis**.
8. Tagihan dapat dibatalkan hanya setelah tidak memiliki pembayaran diterima atau menunggu. Pembatalan menyimpan riwayat. Tagihan pengganti dapat diterbitkan setelah SPP lama dibatalkan.
9. Daftar memiliki pencarian santri/judul/kelas, status, tanggal/bulan/tahun berdasarkan **jatuh tempo**, pagination 20, serta CSV **halaman yang sedang ditampilkan** untuk admin. Ringkasan dan progres mengikuti tanggal/pencarian, mencakup seluruh status pembayaran; filter status menyaring daftar, bukan mengubah cakupan ringkasan.

## Integritas

- Semua nominal rupiah utuh (bigint), 1–1.000.000.000 per tagihan/pembayaran. Client dan server menolak pecahan. Tanggal pembayaran tidak boleh di masa depan menurut WIB.
- Mutasi memakai RPC dengan otorisasi berdasarkan profil database, bukan user_metadata. Fungsi definer hanya dalam private, search_path kosong, hak PUBLIC/anon dicabut. Fungsi audit internal tidak dapat dipanggil authenticated.
- Seluruh mutasi pembayaran/keputusan mengunci baris tagihan terlebih dahulu. Jumlah pembayaran Diterima + Menunggu tidak boleh melampaui nominal. Reservasi pengajuan menunggu mencegah wali lain mengirim nominal yang sama dua kali.
- Revisi wajib menangkal keputusan usang. Kunci idempoten mencegah pengiriman ulang menggandakan transaksi; payload berbeda dengan kunci sama ditolak. Tagihan/nominal pembayaran tidak diedit atau dihapus diam-diam; salah input diselesaikan lewat pembatalan/koreksi dengan alasan.
- Tabel public memakai RLS dan SELECT-only bagi authenticated. View ringkasan memakai security_invoker. Batch penerbitan berada di private dengan RLS dan tidak dapat diakses klien.
- Bukti dalam bucket privat `keuangan-bukti`, WebP maksimum 400 KiB. Sumber JPG/PNG/WebP maksimum 10 MiB, dikompres utuh maksimum sisi 1600 px. Tidak mendukung PDF pada tahap ini. Tautan bertanda tangan berlaku lima menit dan dapat dibuka ulang. File yang sudah dirujuk tidak bisa dihapus klien.
- Riwayat merekam siapa, kapan, tindakan, alasan dan referensi pembayaran. Nominal transaksi asli tetap ada setelah koreksi.
- Notifikasi tagihan dan pembayaran masuk ke lonceng yang ada, hanya admin/wali tertaut, selain pelaku. Membaca detail hanya menandai sampai revisi yang dilihat. Tandai semua mencakup informasi, perizinan, dan keuangan. Tidak mengirim pesan WhatsApp/email/push.

## Aktivasi

Database berhasil diaktifkan pada **6 November 2026** sesuai instruksi eksplisit pengguna untuk mengaktifkan server. Migrasi hosted tercatat berurutan:

- `20261106075006_perizinan_santri.sql`
- `20261106075024_keuangan_santri_spp.sql`
- `20261106075907_spp_batch_tolak_akses_langsung.sql`

Nama berkas lokal dicocokkan dengan riwayat server agar deploy berikutnya tidak menerapkan migration yang sama dua kali. Migration terakhir membuat kebijakan penolakan eksplisit pada tabel batch private, mempertahankan akses hanya melalui fungsi pemilik tervalidasi.

Uji hosted dengan transaksi rollback lulus untuk penerbitan/idempotensi, cicilan, bukti menunggu, verifikasi, koreksi saldo, pembatalan, riwayat, notifikasi, batas akses wali dan penolakan musyrif/anon. Tidak ada tagihan, pembayaran, fixture santri, atau simulasi peran yang tersisa. Frontend diperbaiki melalui `layanan.css` dan `KopLayanan.tsx`; publikasi mengikuti build Cloudflare main.

## Validasi

- `npm run typecheck`, `npm run build:cf`.
- Delapan suite `scripts/verifikasi-{ui,akses,pondok,dashboard,foto,notifikasi,perizinan,keuangan}.cjs`.
- Uji keuangan memeriksa rupiah/tanggal/nominal maksimal, cicilan, peran, letak fitur, rute notifikasi, skala progres 0/25/100%, dan escaping CSV untuk mencegah formula spreadsheet.
- Harness PostgreSQL terisolasi memakai PGlite 0.5.15; Auth/Storage dan metadata pengumuman merupakan stub minimal. Tidak memanggil database live.

```sh
npm install --prefix /tmp/santri-pg --no-save @electric-sql/pglite@0.5.15
PGLITE_MODULE=/tmp/santri-pg/node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/keuangan-local.mjs
```

`supabase/tests/keuangan_rls.sql` menguji batch/idempotensi, SPP duplikat, rupiah pecahan, anak asing, bukti wajib, revisi null/usang, larangan wali memverifikasi, mutasi langsung, pembayaran parsial/tunai, cadangan bukti, verifikasi ganda, penarikan, notifikasi per revisi, saldo lunas/koreksi, pembatalan/penerbitan pengganti, view invoker dan hak anon/musyrif. Semua fixture rollback. Harness juga menjalankan ulang SQL perizinan untuk memeriksa regresi notifikasi gabungan. Pengujian aplikasi memastikan peta akses mencakup kedua pengajar. Belum ada uji browser/perangkat nyata, konkurensi sesi nyata, gateway pembayaran, atau layanan Supabase Auth/Storage hosted untuk fitur ini.

## Batas tahap

Belum ada penarikan dana, pembayaran otomatis/gateway/VA/QRIS, kuitansi PDF bernomor, konfigurasi tarif otomatis per kelas, beasiswa/potongan, denda, pengingat terjadwal, buku besar akuntansi, atau pencatatan refund uang aktual. Seluruh penerbitan/verifikasi dilakukan eksplisit. CSV terbatas halaman aktif dan diberi label sesuai cakupan.

Bukti yang terunggah tetapi tidak pernah dikirim bisa tersisa. Pembersihan berjadwal belum tersedia; file yang dipakai riwayat tidak dihapus otomatis. Tautan bukti yang sudah dibuat dapat tetap terbuka hingga lima menit walau tautan wali dicabut.

## Aset 3D

Aset final `apps/web/public/images/fitur/keuangan.webp`, 384×384 transparan, kualitas 88 (sekitar puluhan KiB), PNG sumber dipertahankan dalam hasil generasi. Prompt: satu ikon menu tagihan sekolah dengan dompet biru, lembar tagihan putih bergaris dan centang hijau, dua tumpukan koin emas; clay/plastic glossy rounded biru/putih/kuning seperti ikon perizinan; cakram biru muda 78% kanvas, luar transparan; tanpa teks, simbol mata uang, orang/wajah/tangan, watermark atau kolase. Referensi gaya: `/images/fitur/perizinan.webp`.
