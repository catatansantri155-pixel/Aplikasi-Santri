import { buatKlienBrowser } from "@/lib/supabase/client";
export const BUCKET_INFORMASI = "informasi-pondok";
export const BATAS_GAMBAR = 5 * 1024 * 1024;
export const POLA_GAMBAR =
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp)$/;
export function validasiBerkasGambar(file: Pick<File, "size" | "type">) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Pilih gambar JPG, PNG, atau WebP.");
  if (!file.size || file.size > BATAS_GAMBAR)
    throw Error("Ukuran gambar maksimal 5 MB.");
}
export async function unggahGambarInformasi(file: File) {
  validasiBerkasGambar(file);
  const db = buatKlienBrowser();
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();
  if (authError || !user)
    throw Error("Masuk kembali sebelum mengunggah gambar.");
  const ekstensi = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[file.type];
  const path = `${user.id}/${crypto.randomUUID()}.${ekstensi}`;
  const { error } = await db.storage.from(BUCKET_INFORMASI).upload(path, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: "300",
  });
  if (error)
    throw Error(
      "Gambar belum terunggah. Pastikan ukuran maksimal 5 MB dan akun Anda Admin Utama.",
    );
  return path;
}
export async function hapusUnggahanBelumTerpakai(path: string) {
  // Kebijakan Storage menolak penghapusan gambar yang masih dipakai informasi.
  await buatKlienBrowser().storage.from(BUCKET_INFORMASI).remove([path]);
}
