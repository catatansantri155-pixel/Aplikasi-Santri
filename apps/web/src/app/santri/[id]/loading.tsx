import { RangkaKartu, RangkaDaftar } from "@/components/Muat";

/** Keadaan memuat rute detail santri: kerangka kartu + daftar. */
export default function Memuat() {
  return (
    <div role="status" aria-label="Memuat halaman">
      <RangkaKartu />
      <RangkaDaftar jumlah={4} />
    </div>
  );
}
