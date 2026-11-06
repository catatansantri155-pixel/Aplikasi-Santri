export const TEMA_INFORMASI = ["hijau", "emas", "biru"] as const;
export type TemaInformasi = (typeof TEMA_INFORMASI)[number];
export const TEMPLATE_INFORMASI = [
  {
    id: "pengumuman",
    nama: "Pengumuman",
    tema: "hijau",
    kategori: "Pengumuman",
    judul: "Pengumuman untuk wali santri",
    isi: "Assalamu’alaikum warahmatullahi wabarakatuh.\n\nKami sampaikan informasi mengenai [keperluan].\n\nHari / tanggal: [tanggal]\nWaktu: [waktu]\nTempat: [tempat]\n\nMohon perhatian dan kerja sama Bapak/Ibu. Jazakumullahu khairan.",
  },
  {
    id: "kegiatan",
    nama: "Kegiatan",
    tema: "emas",
    kategori: "Kegiatan",
    judul: "Agenda kegiatan pondok",
    isi: "Insyaallah akan dilaksanakan [nama kegiatan].\n\nHari / tanggal: [tanggal]\nWaktu: [waktu]\nTempat: [tempat]\nPeserta: [peserta]\n\nPersiapan: [perlengkapan atau ketentuan].",
  },
  {
    id: "jadwal",
    nama: "Jadwal",
    tema: "biru",
    kategori: "Jadwal",
    judul: "Informasi jadwal pondok",
    isi: "Berikut jadwal [kegiatan / layanan] yang perlu diperhatikan.\n\nMulai: [tanggal dan waktu]\nSelesai: [tanggal dan waktu]\n\nKetentuan: [rincian].\nNarahubung: [nama dan kontak].",
  },
] as const;
