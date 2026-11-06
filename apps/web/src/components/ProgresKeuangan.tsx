import { progresPelunasan, rupiah } from "@/lib/keuangan";
export default function ProgresKeuangan({
  total,
  terbayar,
}: {
  total: number;
  terbayar: number;
}) {
  const p = progresPelunasan(total, terbayar);
  return (
    <div className="spp-progres">
      <div>
        <strong>Pelunasan tagihan</strong>
        <span>{p.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</span>
      </div>
      <div
        className="spp-progres-jalur"
        role="progressbar"
        aria-label="Persentase nominal tagihan terbayar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(p * 10) / 10}
      >
        <span style={{ width: `${p}%` }} />
      </div>
      <small>
        {total
          ? `${rupiah(terbayar)} sudah diterima dari ${rupiah(total)}`
          : "Belum ada nominal tagihan pada periode ini."}
      </small>
    </div>
  );
}
