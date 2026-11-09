import { NextRequest, NextResponse } from "next/server";
import { buatKlienServer } from "@/lib/supabase/server";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Permintaan tidak diizinkan." },
      { status: 403 },
    );
  const text = await request.text();
  if (text.length > 4096)
    return NextResponse.json({ error: "Tautan tidak valid." }, { status: 400 });
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Tautan tidak valid." }, { status: 400 });
  }
  const { token_hash, type } = body ?? {};
  if (
    typeof token_hash !== "string" ||
    !token_hash ||
    token_hash.length > 1024 ||
    !["email", "signup", "recovery"].includes(type)
  )
    return NextResponse.json({ error: "Tautan tidak valid." }, { status: 400 });
  try {
    const db = await buatKlienServer();
    const { error } = await db.auth.verifyOtp({ token_hash, type });
    if (error)
      return NextResponse.json(
        {
          error:
            "Tautan sudah kedaluwarsa atau pernah digunakan. Minta tautan baru.",
        },
        { status: 400 },
      );
    return NextResponse.json(
      {
        tujuan:
          type === "recovery" ? "/atur-sandi" : "/login?email=terkonfirmasi",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Konfirmasi belum berhasil. Periksa koneksi dan coba lagi." },
      { status: 503 },
    );
  }
}
