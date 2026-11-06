import PenjagaModul from "@/components/PenjagaModul";
import DetailInformasi from "@/components/DetailInformasi";
export default async function HalamanDetailInformasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PenjagaModul modul="laporan">
      <DetailInformasi id={id} />
    </PenjagaModul>
  );
}
