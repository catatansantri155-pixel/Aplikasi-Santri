import { RangkaGrafik } from "@/components/Muat";

/** Keadaan memuat rute grafik: kerangka grafik. */
export default function Memuat() {
  return (
    <div role="status" aria-label="Memuat halaman">
      <RangkaGrafik />
      <RangkaGrafik />
    </div>
  );
}
