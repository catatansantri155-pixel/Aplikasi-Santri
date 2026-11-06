# Tahap 1 — Notifikasi dan informasi pondok

## Hasil

- Lonceng kanan atas di mobile/PC, dengan badge jumlah belum dibaca (9+ di atas sembilan).
- Mobile membuka /notifikasi; desktop membuka panel ringkas empat informasi dan tautan daftar lengkap.
- Pusat notifikasi memiliki filter Semua/Belum dibaca, pagination 20, muat ulang, dan tandai semua dibaca. Informasi yang ditarik atau berakhir tidak lagi tersedia untuk penerima.
- /informasi/[id] menampilkan informasi penuh, menandai versi yang dibuka sebagai dibaca, dan menyediakan konfirmasi eksplisit bila diminta. Tandai semua dibaca tidak pernah mengonfirmasi memahami.
- Admin mengatur sasaran, pin, batas masa tayang, dan kewajiban konfirmasi melalui editor informasi yang sudah ada. Template teks dan poster tetap tersedia. Pencarian nama sasaran menampilkan maksimal 30 hasil dan mempertahankan pilihan saat edit.
- Admin dapat membuka Rincian & pembacaan untuk melihat jumlah akun yang telah membaca/mengonfirmasi versi saat ini.

## Sasaran

| Pilihan | Penerima |
| --- | --- |
| Seluruh pengguna | Akun yang memiliki profil aplikasi |
| Peran tertentu | Salah satu dari lima peran aplikasi |
| Wali satu kelas | Akun wali yang tertaut ke santri di kelas terpilih |
| Wali seorang santri | Akun wali yang tertaut ke santri terpilih |
| Satu akun | Profil pengguna terpilih |

Hubungan wali/santri dan kelas dievaluasi berdasarkan tautan saat ini. Admin tetap dapat mengelola semua informasi, tetapi inbox admin hanya berisi informasi yang memang ditujukan kepadanya. Informasi dengan sasaran tanpa akun/tautan tidak menghasilkan penerima. Tanggal informasi bukan jadwal mulai tayang: status Terbit langsung membuat informasi tersedia. Batas akhir bersifat opsional; tanpa batas, tarik ke draf untuk mengakhiri tayang.

Notifikasi pada tahap ini bersumber dari pengumuman pondok. Belum ada sumber perizinan/SPP, WhatsApp, email, atau push browser. Badge dan daftar diperbarui setiap 30 detik saat halaman terlihat, saat kembali fokus, dan setelah aksi baca/publikasi. Panel ini tidak mengirim pesan keluar aplikasi. Pengumuman lama yang masih terbit/berlaku ikut tampil sebagai belum dibaca saat fitur pertama dipakai.

## Data dan keamanan

Migration berikut telah diterapkan ke proyek aplikasi:

1. `20261106043815_informasi_notifikasi_tahap_satu.sql`: kolom sasaran/pin/masa tayang/konfirmasi/revisi, tabel informasi_bacaan, RLS, lookup audiens dan RPC inbox/detail/baca.
2. `20261106052107_notifikasi_validasi_revisi.sql`: penandaan baca/konfirmasi membawa versi yang benar-benar ditampilkan. Endpoint versi awal dicabut hak aksesnya dari klien, tanpa menghapus fungsi lama.

RLS melindungi akses daftar, detail, dan gambar (policy Storage lama membaca tabel informasi yang kini dibatasi audiens). Draf/expired/target lain tidak dapat diakses lewat URL langsung oleh nonadmin. Bukti baca memiliki satu baris per informasi/pengguna, bukan salinan isi per penerima. Mengubah konten, sasaran, status, tanggal, gambar, masa tayang, atau kewajiban konfirmasi menaikkan revisi; bukti lama tidak berlaku untuk revisi baru. Pin saja tidak menaikkan revisi. Penandaan massal tidak menurunkan revisi jika ada penandaan versi lebih baru yang mendahuluinya.

Klien hanya SELECT informasi_bacaan. Penulisan dilakukan melalui RPC terjaga yang mengambil pengguna dari auth.uid(), tidak menerima pengguna_id dari klien. Fungsi SECURITY DEFINER berada di schema private, memakai search_path kosong, dan memeriksa audiens/profil sesi. Wrapper API public memakai SECURITY INVOKER; anon tidak mendapat EXECUTE. Tidak ada service role pada klien. Peran dibaca dari profiles yang dilindungi, bukan user_metadata.

Gambar private memakai signed URL satu jam seperti fitur poster sebelumnya. URL yang sudah diterima dapat tetap dipakai sampai kedaluwarsa walaupun sasaran/status berubah; perubahan RLS tidak menarik kembali bytes yang sudah diterima pengguna. Tidak ada file atau posting nyata dibuat selama pengujian.

Dokumentasi primer: [Grants dan RLS](https://supabase.com/docs/guides/api/securing-your-api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Verifikasi

- Typecheck dan build:cf lulus, termasuk rute /notifikasi dan /informasi/[id].
- verifikasi-notifikasi: validasi sasaran/tanggal, badge, tautan detail, escaping judul, status baca/konfirmasi, opsi admin dan gerbang lima peran.
- Regresi verifikasi-ui, akses, pondok, dashboard, foto lulus.
- `supabase/tests/notifikasi_rls.sql` lulus: semua jenis sasaran, wali dengan anak tertaut, penolakan anak lain, draf/expired, endpoint detail, larangan pemalsuan bukti pengguna lain, unread turun satu, konfirmasi eksplisit, revisi baru dan penolakan konfirmasi versi lama, pin tanpa reset, baca semua tanpa konfirmasi, nonadmin tidak membaca bukti wali lain, anon ditolak. Semua fixture dan perubahan peran dalam transaksi di-rollback; pemeriksaan akhir memastikan tidak ada santri/informasi uji tertinggal dan peran asli kembali.
- Advisor tidak melaporkan temuan untuk fitur baru. Peringatan fungsi/auth lama di luar cakupan tetap ada: [database linter](https://supabase.com/docs/guides/database/database-linter), [password Auth](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Pengujian browser/perangkat dan alur RPC melalui Data API setelah deploy belum dilakukan karena browser pratinjau tidak dapat mengakses server lokal. Build dan tes SQL bukan bukti pengujian visual. Frontend memerlukan merge dan deploy Workers. Tahap berikutnya: Perizinan Santri, lalu Keuangan Santri/SPP.
