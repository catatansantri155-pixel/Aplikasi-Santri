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

/* ------------------------------------------------------------------ */
/* Sambutan & pendaftaran wali (keputusan user 4 Nov 2026)             */
/* ------------------------------------------------------------------ */

/**
 * Kunci localStorage penanda halaman sambutan (/sambutan) sudah
 * selesai/dilewati di perangkat ini. Gerbangnya ada di halaman login:
 * pengunjung tanpa sesi yang belum punya penanda ini dialihkan ke
 * /sambutan dulu. Nilainya persis "santri.sambutan.selesai" (nama
 * kunci disepakati pada rancangan fitur).
 */
export const KUNCI_SAMBUTAN_SELESAI = "santri.sambutan.selesai";

/**
 * Kunci localStorage pendaftaran wali yang menunggu konfirmasi surel.
 * Jalur /daftar: bila signUp tidak langsung menghasilkan sesi
 * (konfirmasi surel aktif), nama wali disimpan di sini; setelah masuk
 * pertama kali, halaman login melengkapi baris profiles dari penanda
 * ini (lihat cobaLengkapiProfilWaliTertunda). Isi: JSON {nama, email}.
 */
export const KUNCI_DAFTAR_WALI_TERTUNDA = "santri.daftarWali";

/** Penanda sambutan di perangkat ini; false bila storage tak tersedia. */
export function sambutanSudahSelesai(): boolean {
  try {
    return localStorage.getItem(KUNCI_SAMBUTAN_SELESAI) === "1";
  } catch {
    return false;
  }
}

/**
 * Lengkapi profil wali dari penanda pendaftaran tertunda.
 *
 * Dipanggil halaman login SETELAH sesi berhasil dan baris profiles
 * belum ditemukan: bila penanda `santri.daftarWali` ada, sisipkan
 * profiles (id = pengguna sesi, peran 'wali', nama dari penanda) —
 * diizinkan RLS oleh kebijakan profiles_tambah_wali_sendiri pada
 * migrasi 0006 (pengguna hanya bisa menyisipkan profil MILIK SENDIRI
 * berperan wali; peran lain tidak bisa dibuat dari jalur ini).
 *
 * Mengembalikan true bila profil berhasil dibuat (penanda dihapus).
 * Penanda SENGAJA dipertahankan bila sisipan gagal karena sebab lain
 * (mis. migrasi 0006 belum dijalankan) agar bisa dicoba lagi pada
 * masuk berikutnya; penanda dihapus bila profil ternyata sudah ada.
 */
export async function cobaLengkapiProfilWaliTertunda(): Promise<boolean> {
  if (!supabaseTerhubung()) return false;
  let namaTertunda: string | null = null;
  try {
    const mentah = localStorage.getItem(KUNCI_DAFTAR_WALI_TERTUNDA);
    if (!mentah) return false;
    const data = JSON.parse(mentah) as { nama?: unknown };
    if (typeof data.nama === "string" && data.nama.trim().length > 0) {
      namaTertunda = data.nama.trim();
    }
  } catch {
    return false;
  }
  if (!namaTertunda) return false;

  const supabase = buatKlienBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    peran: "wali",
    nama: namaTertunda,
  });
  if (!error) {
    try {
      localStorage.removeItem(KUNCI_DAFTAR_WALI_TERTUNDA);
    } catch {
      // Penanda gagal dihapus tidak menghalangi alur masuk.
    }
    return true;
  }
  // 23505 = langgar unik: profil sudah ada (mis. dibuat admin lebih
  // dulu) — penanda tidak lagi diperlukan.
  if ((error as { code?: string }).code === "23505") {
    try {
      localStorage.removeItem(KUNCI_DAFTAR_WALI_TERTUNDA);
    } catch {
      // Abaikan — lihat catatan di atas.
    }
  } else {
    console.warn(
      "[sesi] Gagal melengkapi profil wali tertunda:",
      error.message,
    );
  }
  return false;
}
