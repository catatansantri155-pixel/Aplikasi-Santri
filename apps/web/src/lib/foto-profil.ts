import { buatKlienBrowser } from "@/lib/supabase/client";
import { supabaseTerhubung } from "@/lib/data/santri";
export const BUCKET_FOTO = "foto-profil";
export const BATAS_FOTO = 100 * 1024;
export const FOTO_BERUBAH = "santri:foto-profil-berubah";
export function validasiFoto(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Pilih foto JPG, PNG, atau WebP.");
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw Error("Foto awal maksimal 10 MB.");
}
export function ukuranFoto(width: number, height: number) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    width * height > 40_000_000
  )
    throw Error("Resolusi foto tidak didukung. Pilih foto lebih kecil.");
  const sisi = Math.min(width, height);
  return {
    x: (width - sisi) / 2,
    y: (height - sisi) / 2,
    sisi,
    hasil: Math.min(384, sisi),
  };
}
export async function kompresFoto(file: File) {
  validasiFoto(file);
  let gambar: ImageBitmap;
  try {
    gambar = await createImageBitmap(file);
  } catch {
    throw Error(
      "Foto tidak dapat dibaca. Pilih foto JPG, PNG, atau WebP lain.",
    );
  }
  try {
    const crop = ukuranFoto(gambar.width, gambar.height);
    const canvas = document.createElement("canvas");
    canvas.width = crop.hasil;
    canvas.height = crop.hasil;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Peramban belum mendukung pengolahan foto.");
    ctx.drawImage(
      gambar,
      crop.x,
      crop.y,
      crop.sisi,
      crop.sisi,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    for (const quality of [0.82, 0.72, 0.62, 0.5, 0.4]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (
        blob?.type === "image/webp" &&
        blob.size > 0 &&
        blob.size <= BATAS_FOTO
      )
        return blob;
    }
    throw Error("Foto belum bisa diperkecil hingga 100 KB. Pilih foto lain.");
  } finally {
    gambar.close();
  }
}
export function jalurFoto(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
  )
    throw Error("Akun tidak valid.");
  return `${id}/avatar.webp`;
}
export async function ambilFotoProfil(id: string) {
  if (!supabaseTerhubung()) return null;
  const { data, error } = await buatKlienBrowser()
    .storage.from(BUCKET_FOTO)
    .createSignedUrl(jalurFoto(id), 3600);
  return error || !data ? null : `${data.signedUrl}&cacheNonce=${Date.now()}`;
}
export async function simpanFotoProfil(id: string, blob: Blob) {
  if (blob.type !== "image/webp" || !blob.size || blob.size > BATAS_FOTO)
    throw Error("Foto hasil kompresi maksimal 100 KB dalam format WebP.");
  const db = buatKlienBrowser();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (user?.id !== id)
    throw Error("Sesi akun berubah. Masuk kembali untuk menyimpan foto.");
  const { error } = await db.storage
    .from(BUCKET_FOTO)
    .upload(jalurFoto(id), blob, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "0",
    });
  if (error)
    throw Error("Foto belum tersimpan. Periksa koneksi lalu coba lagi.");
  window.dispatchEvent(new CustomEvent(FOTO_BERUBAH, { detail: id }));
}
export async function hapusFotoProfil(id: string) {
  const db = buatKlienBrowser();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (user?.id !== id) throw Error("Sesi akun berubah. Masuk kembali.");
  const { error } = await db.storage.from(BUCKET_FOTO).remove([jalurFoto(id)]);
  if (error) throw Error("Foto belum dapat dihapus. Coba lagi.");
  window.dispatchEvent(new CustomEvent(FOTO_BERUBAH, { detail: id }));
}
