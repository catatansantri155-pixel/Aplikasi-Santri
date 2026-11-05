import { useId } from "react";

export interface TitikAnalitik {
  label: string;
  nilai: number;
}
export interface BagianAnalitik {
  label: string;
  nilai: number;
  warna: string;
}
const angka = (n: number) =>
  n.toLocaleString("id-ID", { maximumFractionDigits: 1 });

export function TabelGrafik({
  data,
  satuan,
}: {
  data: TitikAnalitik[];
  satuan: string;
}) {
  return (
    <details className="analitik-data">
      <summary>Lihat data</summary>
      <table>
        <caption>Data {satuan}</caption>
        <thead>
          <tr>
            <th scope="col">Periode / kategori</th>
            <th scope="col">{satuan}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{angka(d.nilai)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Tinggi batang berskala nol; angka nol tidak diberi tinggi buatan. */
export function BatangAnalitik({
  data,
  satuan,
  emas = false,
}: {
  data: TitikAnalitik[];
  satuan: string;
  emas?: boolean;
}) {
  const maks = Math.max(1, ...data.map((d) => d.nilai));
  return (
    <>
      <div
        className={`analitik-batang${emas ? " analitik-batang--emas" : ""}`}
        role="img"
        aria-label={data
          .map((d) => `${d.label}: ${angka(d.nilai)} ${satuan}`)
          .join(", ")}
      >
        {data.map((d, i) => (
          <div className="analitik-kolom" key={d.label}>
            <div className="analitik-batang-bidang">
              <span className="analitik-batang-nilai">{angka(d.nilai)}</span>
              <div
                className="analitik-batang-isi"
                style={{
                  height: `${(d.nilai / maks) * 100}%`,
                  opacity: i === data.length - 1 ? 1 : 0.62,
                }}
              />
            </div>
            <span className="analitik-sumbu">{d.label}</span>
          </div>
        ))}
      </div>
      <TabelGrafik data={data} satuan={satuan} />
    </>
  );
}

export function GarisAnalitik({ data }: { data: TitikAnalitik[] }) {
  const id = useId().replace(/:/g, "");
  const maks = Math.max(1, ...data.map((d) => d.nilai));
  const titik = data.map((d, i) => ({
    ...d,
    x: 28 + (i * 444) / Math.max(1, data.length - 1),
    y: 170 - (d.nilai / maks) * 130,
  }));
  const garis = titik.map((t) => `${t.x},${t.y}`).join(" ");
  const area = `M 28 170 L ${titik.map((t) => `${t.x} ${t.y}`).join(" L ")} L ${titik.at(-1)?.x ?? 28} 170 Z`;
  return (
    <>
      <svg
        className="analitik-garis"
        viewBox="0 0 500 210"
        role="img"
        aria-label={data
          .map((d) => `${d.label}: ${d.nilai} setoran`)
          .join(", ")}
      >
        <defs>
          <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c8e80" stopOpacity=".28" />
            <stop offset="100%" stopColor="#1c8e80" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {[40, 83, 126, 170].map((y) => (
          <line
            key={y}
            x1="28"
            x2="472"
            y1={y}
            y2={y}
            className="analitik-gridline"
          />
        ))}
        <path d={area} fill={`url(#area-${id})`} />
        <polyline
          points={garis}
          fill="none"
          stroke="#218a7b"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {titik.map((t) => (
          <g key={t.label}>
            <circle
              cx={t.x}
              cy={t.y}
              r="4"
              fill="#218a7b"
              stroke="var(--permukaan)"
              strokeWidth="2"
            />
            <text
              x={t.x}
              y={t.y - 12}
              textAnchor="middle"
              className="analitik-svg-nilai"
            >
              {angka(t.nilai)}
            </text>
          </g>
        ))}
      </svg>
      <div className="analitik-garis-sumbu" aria-hidden="true">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
      <TabelGrafik data={data} satuan="Setoran" />
    </>
  );
}

export function DonatAnalitik({
  bagian,
  label,
}: {
  bagian: BagianAnalitik[];
  label: string;
}) {
  const total = bagian.reduce((s, b) => s + b.nilai, 0);
  let awal = 0;
  return (
    <div className="analitik-donat-layout">
      <svg
        viewBox="0 0 180 180"
        className="analitik-donat"
        role="img"
        aria-label={bagian
          .map(
            (b) =>
              `${b.label}: ${angka(b.nilai)} (${angka(total ? (b.nilai / total) * 100 : 0)}%)`,
          )
          .join(", ")}
      >
        <circle
          cx="90"
          cy="90"
          r="68"
          fill="none"
          stroke="var(--redup)"
          strokeWidth="16"
        />
        {bagian
          .filter((b) => b.nilai > 0)
          .map((b) => {
            const geser = awal;
            const panjang = total ? (b.nilai / total) * 100 : 0;
            awal += panjang;
            return (
              <circle
                key={b.label}
                cx="90"
                cy="90"
                r="68"
                fill="none"
                stroke={b.warna}
                strokeWidth="16"
                pathLength="100"
                strokeDasharray={`${panjang} ${100 - panjang}`}
                strokeDashoffset={-geser}
                transform="rotate(-90 90 90)"
              />
            );
          })}
        <text
          x="90"
          y="88"
          textAnchor="middle"
          className="analitik-donat-total"
        >
          {angka(total)}
        </text>
        <text
          x="90"
          y="109"
          textAnchor="middle"
          className="analitik-donat-label"
        >
          {label}
        </text>
      </svg>
      <ul className="analitik-legenda">
        {bagian.map((b) => (
          <li key={b.label}>
            <span className="analitik-titik" style={{ background: b.warna }} />
            <span>{b.label}</span>
            <strong>{angka(b.nilai)}</strong>
            <small>{angka(total ? (b.nilai / total) * 100 : 0)}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NilaiAnalitik({
  data,
}: {
  data: { mapel: string; rata: number }[];
}) {
  return (
    <>
      <div className="analitik-nilai">
        {data.map((d) => (
          <div key={d.mapel}>
            <div className="analitik-nilai-kepala">
              <span>{d.mapel}</span>
              <strong>
                {angka(d.rata)}
                <small> / 100</small>
              </strong>
            </div>
            <div
              className="analitik-nilai-track"
              role="img"
              aria-label={`${d.mapel}: ${angka(d.rata)} dari 100`}
            >
              <span
                style={{ width: `${Math.min(100, Math.max(0, d.rata))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <TabelGrafik
        data={data.map((d) => ({ label: d.mapel, nilai: d.rata }))}
        satuan="Nilai rata-rata"
      />
    </>
  );
}
