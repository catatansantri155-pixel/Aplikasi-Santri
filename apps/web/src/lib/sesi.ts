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
