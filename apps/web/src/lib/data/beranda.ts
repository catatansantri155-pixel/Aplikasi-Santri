import { buatKlienBrowser } from "@/lib/supabase/client";
import type { StatistikBeranda } from "@/components/BerandaMonitoring";
export async function ambilStatistikBeranda(): Promise<
  StatistikBeranda & {
    anak: Record<string, { kehadiran: number; setoran: number }>;
  }
> {
  const { data, error } = await buatKlienBrowser().rpc("statistik_beranda");
  if (error || !data)
    throw new Error("Ringkasan aktivitas belum dapat dimuat.");
  for (const k of ["santri", "setoran", "kehadiran", "catatan", "olahraga"]) {
    if (!Number.isSafeInteger(data[k]) || data[k] < 0)
      throw new Error("Ringkasan belum valid. Muat ulang.");
  }
  return data;
}
