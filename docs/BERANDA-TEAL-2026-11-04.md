# Beranda teal sesuai mockup

Beranda mengikuti desain yang disetujui: kepala teal menyatu dengan profil, pencarian, judul Monitoring Santri, ilustrasi isometrik, dan tombol utama. Menu utama menggunakan dua kolom kartu horizontal, ringkasan dua kartu, dan navigasi bawah dengan pil aktif. Header kerangka yang berulang disembunyikan hanya pada beranda. Desktop tetap memakai sidebar aplikasi.

Ilustrasi tersimpan di `apps/web/public/images/santri-study-hero.webp` (131 KB, transparan). Tidak ada status bar perangkat atau notifikasi palsu.

Menu mengikuti peta akses terpusat. Pencarian memfilter modul berizin dan daftar santri dari lapisan data yang sudah menggunakan RLS; hasil nama modul diprioritaskan. Tombol utama mengikuti tugas masing-masing peran. Akun wali tetap menampilkan anak tertaut. Keadaan memuat, kosong, gagal, dan coba lagi disediakan. Jika pembaca setoran mengembalikan fallback contoh pada lingkungan produksi, beranda menampilkan galat, bukan statistik contoh.

Validasi: TypeScript, build produksi Next.js dan paket OpenNext Cloudflare; pemeriksaan render server untuk lima peran, nilai ringkasan, aset gambar, pencarian, serta keadaan memuat/gagal. Pemeriksaan visual interaktif di perangkat belum dilakukan pada perubahan ini.

Batas bawaan sumber data masih berlaku: ringkasan membaca 100 setoran dan 50 catatan terbaru, bukan endpoint agregat seluruh riwayat. Perubahan ini tidak mengubah kebijakan akses atau skema database. Setelah PR digabung, jalankan proses deploy aplikasi yang biasa digunakan.
