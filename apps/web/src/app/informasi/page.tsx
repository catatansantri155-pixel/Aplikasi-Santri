import PenjagaModul from "@/components/PenjagaModul";
import InformasiPondok from "@/components/InformasiPondok";
export default function HalamanInformasi() {
  return (
    <PenjagaModul modul="laporan">
      <h1 className="judul-halaman">Informasi Terbaru dari Pondok</h1>
      <InformasiPondok />
    </PenjagaModul>
  );
}
