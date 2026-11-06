import PenjagaModul from "@/components/PenjagaModul";
import DetailPerizinan from "@/components/DetailPerizinan";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PenjagaModul modul="perizinan">
      <DetailPerizinan id={id} />
    </PenjagaModul>
  );
}
