/**
 * POST /api/admin/buat-akun — pembuatan akun pengguna oleh ADMIN
 * (keputusan user 4 Nov 2026: staf dibuatkan admin; wali juga dapat
 * dibuatkan dari sini bila perlu).
 *
 * Alur keamanan:
 * 1. Kunci layanan (SUPABASE_SERVICE_ROLE_KEY) hanya dibaca dari env
 *    SERVER — tidak pernah NEXT_PUBLIC_, tidak pernah masuk kode.
 *    Bila belum dipasang → 501 {error:"belum dikonfigurasi"} dan UI
 *    menampilkan langkah aktivasi manual untuk pemilik.
 * 2. Pemanggil diverifikasi dari token Bearer sesi (klien anon +
 *    auth.getUser), lalu baris profiles pemanggil dibaca dengan
 *    klien layanan dan perannya WAJIB 'admin' (selain itu 403).
 * 3. Kata sandi sementara dibuat kuat di server (acak kriptografis),
 *    akun dibuat dengan email_confirm:true, lalu profiles disisipkan.
 *    Bila sisipan profil gagal, akun auth DIHAPUS lagi (rollback)
 *    agar tidak ada akun yatim tanpa profil/peran.
 * 4. Kata sandi sementara hanya dikembalikan SEKALI pada respons
 *    sukses — tidak disimpan, tidak dicatat ke log.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PERAN_BOLEH_DIBUAT = [
  "pengajar_hifzh",
  "pengajar_diniyyah",
  "musyrif",
  "wali",
] as const;

type PeranBolehDibuat = (typeof PERAN_BOLEH_DIBUAT)[number];

/** Kata sandi sementara kuat: 18 karakter acak, semua kelas karakter. */
function buatKataSandiSementara(): string {
  const hurufKecil = "abcdefghjkmnpqrstuvwxyz";
  const hurufBesar = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const angka = "23456789";
  const simbol = "!@#$%^&*-_";
  const semua = hurufKecil + hurufBesar + angka + simbol;
  const acak = new Uint32Array(18);
  crypto.getRandomValues(acak);
  const pilih = (himpunan: string, i: number) =>
    himpunan[acak[i] % himpunan.length];
  const chars = [
    pilih(hurufBesar, 0),
    pilih(hurufKecil, 1),
    pilih(angka, 2),
    pilih(simbol, 3),
    ...Array.from({ length: 14 }, (_, k) => pilih(semua, k + 4)),
  ];
  // Acak urutan agar empat karakter pertama tidak berpola tetap.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = acak[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunciAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const kunciLayanan = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !kunciLayanan) {
    return NextResponse.json(
      {
        error: "belum dikonfigurasi",
        pesan:
          "Kunci layanan Supabase (SUPABASE_SERVICE_ROLE_KEY) belum dipasang di server.",
      },
      { status: 501 },
    );
  }
  if (!kunciAnon) {
    return NextResponse.json(
      { error: "konfigurasi tidak lengkap" },
      { status: 500 },
    );
  }

  // 1) Verifikasi pemanggil dari token sesi.
  const otorisasi = request.headers.get("authorization") ?? "";
  const token = otorisasi.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json(
      { error: "Token sesi tidak ditemukan. Masuk kembali, lalu coba lagi." },
      { status: 401 },
    );
  }
  const klienAnon = createClient(url, kunciAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user: pemanggil },
    error: galatPemanggil,
  } = await klienAnon.auth.getUser(token);
  if (galatPemanggil || !pemanggil) {
    return NextResponse.json(
      { error: "Sesi tidak valid atau sudah berakhir." },
      { status: 401 },
    );
  }

  // 2) Peran pemanggil wajib admin (dibaca dengan klien layanan).
  const klienLayanan = createClient(url, kunciLayanan, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profilPemanggil, error: galatProfil } = await klienLayanan
    .from("profiles")
    .select("peran")
    .eq("id", pemanggil.id)
    .maybeSingle();
  if (galatProfil) {
    return NextResponse.json(
      { error: "Gagal memeriksa peran pemanggil." },
      { status: 500 },
    );
  }
  if (!profilPemanggil || profilPemanggil.peran !== "admin") {
    return NextResponse.json(
      { error: "Hanya Admin Utama yang dapat membuat akun." },
      { status: 403 },
    );
  }

  // 3) Validasi isi permintaan.
  let isi: { nama?: unknown; email?: unknown; peran?: unknown };
  try {
    isi = (await request.json()) as typeof isi;
  } catch {
    return NextResponse.json(
      { error: "Isi permintaan tidak valid." },
      { status: 400 },
    );
  }
  const nama = typeof isi.nama === "string" ? isi.nama.trim() : "";
  const email = typeof isi.email === "string" ? isi.email.trim() : "";
  const peran = isi.peran as PeranBolehDibuat;
  if (nama.length === 0) {
    return NextResponse.json(
      { error: "Nama pemilik akun wajib diisi." },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Alamat surel tidak valid." },
      { status: 400 },
    );
  }
  if (!PERAN_BOLEH_DIBUAT.includes(peran)) {
    return NextResponse.json(
      {
        error:
          "Peran tidak dikenal. Peran yang dapat dibuat: pengajar hifzh, pengajar diniyyah, musyrif, atau wali.",
      },
      { status: 400 },
    );
  }

  // 4) Buat akun auth + profil; rollback akun bila profil gagal.
  const kataSandiSementara = buatKataSandiSementara();
  const { data: dibuat, error: galatBuat } =
    await klienLayanan.auth.admin.createUser({
      email,
      password: kataSandiSementara,
      email_confirm: true,
      user_metadata: { nama },
    });
  if (galatBuat || !dibuat?.user) {
    return NextResponse.json(
      {
        error:
          galatBuat?.message?.includes("already")
            ? "Surel ini sudah terdaftar sebagai akun."
            : "Gagal membuat akun di layanan autentikasi.",
      },
      { status: 400 },
    );
  }
  const { error: galatSisip } = await klienLayanan
    .from("profiles")
    .insert({ id: dibuat.user.id, nama, peran });
  if (galatSisip) {
    await klienLayanan.auth.admin.deleteUser(dibuat.user.id);
    return NextResponse.json(
      {
        error:
          "Akun dibuat tetapi profil gagal disimpan, jadi akun dibatalkan. Coba lagi; bila berulang, hubungi pengelola teknis.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { email, kataSandiSementara },
    { status: 201 },
  );
}
