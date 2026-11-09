/**
 * Callback autentikasi Supabase — menukar `code` (dari tautan surel:
 * konfirmasi pendaftaran wali & atur ulang sandi) menjadi sesi,
 * lalu mengalihkan ke tujuan `next`.
 *
 * Keamanan tujuan: `next` hanya diterima bila berupa path lokal
 * (diawali "/" dan BUKAN "//"), selain itu bawaan "/". Mencegah
 * open-redirect ke situs luar lewat tautan yang dimanipulasi.
 */
import { NextResponse, type NextRequest } from "next/server";
import { buatKlienServer } from "@/lib/supabase/server";

function tujuanAman(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tujuan = tujuanAman(searchParams.get("next"));

  if (!code)
    return NextResponse.redirect(`${origin}/login?auth=tautan-tidak-valid`);
  if (code) {
    const supabase = await buatKlienServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Kode tidak valid/kedaluwarsa: arahkan ke login dengan
      // penjelasan umum (tanpa membocorkan rincian galat Supabase).
      return NextResponse.redirect(`${origin}/login?auth=tautan-tidak-valid`);
    }
  }
  return NextResponse.redirect(`${origin}${tujuan}`);
}
