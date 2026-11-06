/** Dokumen diperkecil utuh, tanpa potongan; tidak disimpan sebagai base64 di database. */
export async function kompresLampiran(file: File): Promise<Blob> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw Error("Pilih JPG, PNG, atau WebP maksimal 10 MB.");
  const img = await createImageBitmap(file);
  try {
    if (img.width * img.height > 40000000)
      throw Error("Resolusi gambar terlalu besar.");
    const canvas = document.createElement("canvas"),
      ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Browser tidak mendukung pemrosesan gambar.");
    let sisi = 1600;
    for (let putaran = 0; putaran < 4; putaran++) {
      const skala = Math.min(1, sisi / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * skala);
      canvas.height = Math.round(img.height * skala);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const q of [0.86, 0.72, 0.58]) {
        const blob = await new Promise<Blob | null>((r) =>
          canvas.toBlob(r, "image/webp", q),
        );
        if (blob && blob.type === "image/webp" && blob.size <= 409600)
          return blob;
      }
      sisi = Math.round(sisi * 0.8);
    }
    throw Error("Gambar masih terlalu besar. Pilih gambar yang lebih kecil.");
  } finally {
    img.close();
  }
}
