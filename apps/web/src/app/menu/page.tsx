/**
 * Pengalihan (arahan user 4 Nov 2026): tombol Menu di navigasi
 * bawah DIHAPUS dan diganti Akun; halaman Menu gugur karena kisi
 * modul yang sama persis sudah ada di beranda. Tautan lama /menu
 * tidak mati — dialihkan ke /akun (profil + seluruh pengaturan).
 */
import { redirect } from "next/navigation";

export default function HalamanMenu() {
  redirect("/akun");
}
