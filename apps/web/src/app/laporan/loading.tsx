import { RangkaKartu, RangkaGrafik } from "@/components/Muat";

/** Keadaan memuat rute: kerangka kartu + grafik. */
export default function Memuat() {
  return (
    <div role="status" aria-label="Memuat halaman">
      <RangkaKartu />
      <RangkaGrafik />
    </div>
  );
}
