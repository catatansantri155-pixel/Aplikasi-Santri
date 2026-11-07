import { buatKlienBrowser } from "@/lib/supabase/client";
/** INSERT unik: hanya satu tab/perangkat memperoleh panduan otomatis. */
export async function klaimPanduan(id: string): Promise<boolean> {
  const { error } = await buatKlienBrowser()
    .from("panduan_pengguna")
    .insert({ profile_id: id });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error("Status panduan belum dapat disimpan.");
}
