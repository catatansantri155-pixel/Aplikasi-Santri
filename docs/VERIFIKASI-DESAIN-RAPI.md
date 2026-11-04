# Verifikasi — Perapian Desain dari Audit Visual User (4 Nov 2026)

Sumber: audit visual yang ditulis user sendiri setelah masuk sebagai
Ust. Uji Hifzh dan memeriksa Beranda, Hifzh, Kehadiran, Laporan, dan
daftar/detail santri pada desktop 1363×936. Arah yang diminta:
aplikasi operasional yang bersih dan padat secukupnya — bidang terang
polos, biru sebagai penekanan, satu aksi utama jelas per bagian;
Hifzh menjadi acuan desain seluruh aplikasi. (Eksplorasi gaya
Pastel C / Gelap-Kaca B tidak dipilih user; audit inilah arah final.)

## Perubahan

### Global (globals.css)
- Latar halaman: gradasi biru-muda → abu sangat muda polos #f2f5f8
  (mode gelap ikut polos).
- Token bentuk: radius kartu 20→14px, radius besar 24→16px; bayangan
  diperkecil drastis (--bayang/--bayang-halus); kartu, kartu-stat,
  baris-daftar, rincian, item menu kini bergaris batas tipis.
- Tombol utama: gradasi + bayangan → biru solid #1565C0; segmen aktif
  & chip aktif: solid tanpa bayangan/aksen emas; tombol-kecil radius
  disamakan (bukan pil penuh).
- Tab (.tab-pil): bilah bidang terang, tab aktif = bidang putih +
  garis bawah biru 3px (tanpa gradasi, tanpa emas); tab TIDAK lagi
  membungkus — selalu satu baris selebar sama (memperbaiki tab detail
  santri 3+1); label mengecil di layar ≤480px.
- Banner motivasi beranda dikecilkan: biru solid, padding 12px,
  teks 13,5px (bagian pendamping, bukan pusat perhatian).
- Kelas baru: .tata-form-hifzh (desktop 2 kolom), .kolom-samping-form,
  .kartu-samping, .stepper, .kisi-kesalahan, .bilah-simpan,
  .filter-ringkas/.filter-isi/.formulir-filter, .baris-kehadiran,
  .tindakan-lain.

### Hifzh (acuan desain)
- Label "DATA DARI SUPABASE · LOGIN ASLI" dihapus dari tampilan
  operasional; penanda hanya tampil pada mode data contoh.
- Judul cukup "Hifzh"; subjudul dipersingkat; judul form "Setoran
  baru"; paragraf penjelasan di bawah judul form dihapus.
- FormSetoran direstruktur: alur santri → tanggal (Hijriah kini teks
  pendamping kecil, bukan kolom terkunci besar) → jenis chip
  BC/BR/TS/LM + arti pilihan aktif → halaman/surat → ayat → kesalahan
  (stepper −/+ RG/KK/KB, angka bisa diketik; rincian) → tugas.
- Panel kanan desktop / bawah di HP: Hasil penilaian (lencana L/U
  live + ringkas aturan), "Lihat aturan penilaian" (details berisi
  definisi RG/KK/KB + konversi + aturan L/U), Penyimak satu baris.
- Tombol Simpan pada bilah melekat dengan ringkasan santri terpilih.
- Admin (mode pantauan): tab Setoran otomatis tampil sebagai Riwayat.

### Kehadiran
- Filter: desktop empat kolom sebaris; HP satu baris konteks
  "Rab, 4 Nov 2026 · Hifzh · Kelas 1" + tombol Ubah (isi filter
  tersembunyi sampai dibuka).
- Slot jadwal kosong: pilihan "Belum ada jadwal tersedia" +
  keterangan pencatatan tetap dapat dilanjutkan.
- Tombol Simpan nonaktif bila 0 entri akan disimpan.
- "Timpa semua jadi Hadir" pindah ke <details> "Tindakan lain".
- Keterangan "peran Anda bukan admin" di bawah halaman dihapus.
- Baris santri desktop: nama kiri, status kanan satu baris.

### Laporan & detail santri
- Grafik deret waktu (Kehadiran per pekan, Progres setoran) dengan
  data baru 1 periode menampilkan angka ringkas + penjelasan tren,
  bukan grafik satu batang/titik.
- Tab detail santri kini selalu satu baris (perbaikan global .tab-pil).

## Uji lokal
- typecheck ✓ · build ✓ · build:cf ✓ · server produksi lokal:
  /hifzh 200, /kehadiran 200 (isi halaman dirender klien setelah
  sesi; verifikasi visual dilakukan live pasca-deploy).
