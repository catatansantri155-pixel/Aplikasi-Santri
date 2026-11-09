/** Paginasi ber-RLS dengan hitungan server: jangan menganggap batas REST adalah seluruh data. */
export async function semuaBaris<T>(
  buat: () => {
    range: (
      awal: number,
      akhir: number,
    ) => PromiseLike<{
      data: unknown[] | null;
      error: { message: string } | null;
      count: number | null;
    }>;
  },
): Promise<T[]> {
  const hasil: T[] = [];
  for (;;) {
    const { data, error, count } = await buat().range(
      hasil.length,
      hasil.length + 499,
    );
    if (error) throw new Error(error.message);
    const baris = (data ?? []) as T[];
    hasil.push(...baris);
    if (count !== null && hasil.length >= count) return hasil;
    if (count === null && baris.length < 500) return hasil;
    if (!baris.length)
      throw new Error("Data berubah saat dimuat. Coba muat ulang.");
    if (hasil.length >= 100000)
      throw new Error("Data terlalu banyak. Persempit periode laporan.");
  }
}
