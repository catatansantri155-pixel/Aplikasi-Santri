/**
 * Lapisan sesi — profil pengguna yang sedang login (Supabase Auth).
 *
 * Dipakai komponen tampilan (kerangka, beranda, paraf hifzh) untuk
 * mengetahui SIAPA yang sedang masuk beserta perannya, dibaca dari
 * tabel `profiles` berdasarkan id sesi (auth.uid()).
 *
 * MODE CONTOH (env Supabase kosong): selalu mengembalikan null —
 * perilaku berbasis data contoh di halaman/komponen tidak berubah.
 * Mode Supabase: mengembalikan null juga bila belum ada sesi, atau
 * sesi ada tetapi baris profilnya belum terdaftar di tabel profiles.
 */
import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";
import type { Peran } from "@/lib/peran";

export interface ProfilLogin {
  id: string;
  nama: string;
  peran: Peran;
  email: string | null;
}

/** Profil pengguna yang sedang login; null bila tidak bisa dipastikan. */
export async function ambilProfilLogin(): Promise<ProfilLogin | null> {
  if (!supabaseTerhubung()) {
    // MODE CONTOH: tidak ada sesi asli; pemanggil memakai data contoh.
    return null;
  }
  const supabase = buatKlienBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nama, peran")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) {
    if (error) {
      console.warn("[sesi] Gagal membaca profil pengguna:", error.message);
    }
    return null;
  }
  const baris = data as { id: string; nama: string; peran: Peran };
  return {
    id: baris.id,
    nama: baris.nama,
    peran: baris.peran,
    email: user.email ?? null,
  };
}

/**
 * Kunci sessionStorage penanda "sesi ada tetapi profil belum
 * disiapkan" (audit Fase 1): penjaga kerangka menyetelnya sebelum
 * mengarahkan pengguna ke /login, dan halaman login membacanya sekali
 * untuk menampilkan pesan khusus, lalu menghapusnya.
 */
export const KUNCI_PENANDA_PROFIL_BELUM_DISIAPKAN =
  "aplikasi-santri:profil-belum-disiapkan";

/**
 * Apakah ada sesi Auth yang aktif (tanpa peduli baris profilnya)?
 * Membedakan dua keadaan yang selama ini tercampur di ambilProfilLogin
 * (sama-sama null): "belum masuk sama sekali" dan "sudah masuk tetapi
 * akses/profilnya belum disiapkan admin".
 */
export async function adaSesiAktif(): Promise<boolean> {
  if (!supabaseTerhubung()) return false;
  try {
    const {
      data: { user },
    } = await buatKlienBrowser().auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

/**
 * Akhiri sesi login (Supabase signOut). Dipakai halaman Akun; komponen
 * InfoPengguna di kerangka memakai mekanisme yang sama. Kegagalan
 * jaringan diabaikan: pemanggil tetap mengarahkan ke /login dan
 * penjaga kerangka memeriksa ulang sesi di sana.
 */
export async function keluarDariSesi(): Promise<void> {
  if (!supabaseTerhubung()) return;
  try {
    await buatKlienBrowser().auth.signOut();
  } catch {
    // Lihat catatan di atas — sesi tampilan tetap dianggap selesai.
  }
}
