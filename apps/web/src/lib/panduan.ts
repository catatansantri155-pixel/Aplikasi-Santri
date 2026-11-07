import { menuUtamaBeranda } from "@/lib/beranda";
import type { Peran } from "@/lib/peran";
export interface LangkahPanduan {
  judul: string;
  isi: string;
  target?: string;
}
export function langkahPanduan(peran: Peran): LangkahPanduan[] {
  return [
    {
      judul: "Selamat datang di ruang Anda",
      isi: "Mari kenali tombol yang akan Anda gunakan. Panduan otomatis ini muncul sekali untuk akun Anda. Buka lagi melalui Akun → Panduan penggunaan.",
    },
    ...menuUtamaBeranda(peran).map((m) => ({
      judul: m.label,
      isi:
        m.href === "/santri" && peran === "wali"
          ? "Lihat anak yang ditautkan ke akun Anda. Pilih nama anak untuk membuka perkembangan dan catatannya."
          : m.keterangan,
      target: `menu:${m.href}`,
    })),
    {
      judul: "Layanan lainnya",
      isi: "Kumpulan layanan tambahan: perizinan, keuangan/SPP, informasi, dan pengaturan sesuai akses akun. Admin juga mengelola banner di sini.",
      target: "lainnya",
    },
    {
      judul: "Kabar dari pondok",
      isi: "Pilih Baca selengkapnya untuk membaca informasi. Lihat gambar utuh membuka poster tanpa pemotongan. Konfirmasikan pembacaan pada halaman detail jika diminta. Admin membuka Kelola untuk membuat, menyunting, dan menghapus informasi.",
      target: "informasi",
    },
    {
      judul: "Rincian aktivitas",
      isi:
        peran === "wali"
          ? "Anak tertaut menunjukkan jumlah anak yang terhubung ke akun Anda. Grafik merangkum catatan setoran, kehadiran, dan pendampingan yang tersedia."
          : "Pantau jumlah santri, setoran, kehadiran, catatan harian, dan sesi olahraga. Grafik memakai data yang tersedia untuk akun Anda.",
      target: "aktivitas",
    },
    {
      judul: "Notifikasi untuk Anda",
      isi: "Lonceng menampilkan pembaruan yang ditujukan kepada akun Anda. Pilih notifikasi untuk membaca rincian dan tandai yang sudah dibaca.",
      target: "notifikasi",
    },
    {
      judul: "Berpindah halaman",
      isi: "Gunakan navigasi bawah pada HP atau di samping pada komputer. Buka Akun untuk foto profil, tampilan, kata sandi, panduan, dan keluar dari aplikasi.",
      target: "navigasi",
    },
  ];
}
