# Redesign akses akun dan identitas aplikasi

Sambutan, sign in, sign up wali, lupa sandi, dan atur sandi memakai satu gaya hijau/mint/putih hangat, kartu dan tombol dengan kedalaman, serta ilustrasi 3D tanpa orang. Di mobile ilustrasi ringkas berada di atas formulir; di PC ilustrasi dan formulir berdampingan. Tidak ada kunci tinggi layar yang memotong formulir, pesan galat, atau keyboard. Tema gelap dan preferensi pengurangan gerak disediakan.

Logo lampiran pengguna direstorasi pada 1254 × 1254, mempertahankan acuan lengkung, buku/pena hijau-biru, dan panel tulisan Arab. Identitas logo tetap datar agar mudah dibaca; efek 3D digunakan pada wadah dan antarmuka. Komponen Logo bersama dipakai di header akses, sidebar, header mobile, dan beranda, dengan object-fit contain. Favicon, Apple touch icon, serta ikon manifest diturunkan dari aset yang sama.

## Aset dan prompt

Aset dibuat dengan generator gambar bawaan dan disimpan dalam proyek:

- `apps/web/public/brand/minhajus-sunnah.webp`: logo 1254 × 1254.
- `apps/web/public/brand/logo-{32,180,192,512}.png`: varian ukuran ikon.
- `apps/web/public/images/akses-3d.webp`: ilustrasi transparan Al-Qur’an/rehal, buku, papan kehadiran, perisai, dan tanaman.

Prompt ilustrasi: polished isometric 3D miniature study scene without people or body parts; Quran on wooden rehal, emerald/cream books, mint attendance clipboard, gold/emerald shield lock, small plant; ivory floating platform; transparent background; no words, logos, characters.

Prompt logo: faithful high resolution restoration of the supplied original logo; preserve arch, cyan pen/book, green book, lower Arabic inscription panel, colors and composition; sharpen clean edges on white; no new ornaments or 3D deformation.

## Alur dan verifikasi

Lima bagian perkenalan tetap ada, dengan Lewati, pilihan bagian, Kembali, dan Lanjut/Masuk. Petunjuk login diringkas menjadi email dan kata sandi. Pendaftaran tetap khusus wali; konfirmasi email mengikuti konfigurasi layanan dan data anak baru tampil setelah penautan admin.

Verifikasi: `node scripts/verifikasi-akses.cjs` (lima halaman, logo tunggal, ilustrasi, kolom login/daftar, lima slide, ikon aplikasi, dan perbandingan token logika autentikasi sebelum return JSX), `node scripts/verifikasi-ui.cjs`, `npm run typecheck`, `npm run build:cf`, dimensi/transparansi aset, dan `git diff --check`.

Tidak ada perubahan database, RLS, callback, atau pengiriman email uji. Pemeriksaan visual interaktif di perangkat dan pengujian login produksi belum dilakukan. Deploy produksi belum dijalankan.
