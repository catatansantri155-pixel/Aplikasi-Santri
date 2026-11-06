import PenjagaModul from "@/components/PenjagaModul";
import DetailKeuangan from "@/components/DetailKeuangan";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PenjagaModul modul="keuangan">
      <DetailKeuangan id={id} />
    </PenjagaModul>
  );
}
