# Kasus Uji Manual — src/lib/hifzh.ts

Tabel ini berisi kasus uji manual untuk logika di `src/lib/hifzh.ts`.
Sengaja TANPA framework test (keputusan Tahap 2 Jalur D): penguji cukup
membandingkan hasil fungsi dengan kolom "Diharapkan", misalnya lewat
konsol browser, Node REPL, atau membandingkan dengan fungsi SQL yang
menjadi cerminnya di `supabase/migrations/0002_functions_views.sql`:

```sql
select public.kb_konversi(27, 0, 0);          -- diharapkan 3
select public.nilai_setoran('LM', 27, 0, 0);  -- diharapkan 'L'
select public.hasil_ujian(27, 0, 0);          -- diharapkan 'B'
```

Aturan acuan (Buku Hafalan, ABU_SABIQ_1.pdf & ABU_SABIQ_2.pdf):
konversi bertahap `kkTotal = kk + floor(rg/3)`, lalu
`kbTotal = kb + floor(kkTotal/3)`.

## 1. kbKonversi(rg, kk, kb)

| RG | KK | KB | kkTotal | kbTotal (Diharapkan) | Catatan |
|---:|---:|---:|---:|---:|---|
| 0 | 0 | 0 | 0 | 0 | Tanpa kesalahan |
| 2 | 0 | 0 | 0 | 0 | Sisa RG di bawah 3 tidak terkonversi |
| 3 | 0 | 0 | 1 | 0 | 3 RG = 1 KK, belum jadi KB |
| 8 | 0 | 0 | 2 | 0 | Sisa KK di bawah 3 tidak terkonversi |
| 9 | 0 | 0 | 3 | 1 | Rantai penuh: 9 RG → 3 KK → 1 KB |
| 27 | 0 | 0 | 9 | 3 | **Kasus teruji prototipe: RG 27 → KB 3** |
| 0 | 2 | 0 | 2 | 0 | KK di bawah 3 tidak terkonversi |
| 0 | 3 | 0 | 3 | 1 | 3 KK = 1 KB |
| 0 | 8 | 0 | 8 | 2 | floor(8/3) = 2 |
| 5 | 4 | 1 | 5 | 2 | Campuran: kkTotal = 4 + 1, kbTotal = 1 + 1 |
| 0 | 0 | 5 | 0 | 5 | KB mentah lolos apa adanya |

## 2. nilaiSetoran(jenis, rg, kk, kb) → 'L' / 'U'

BR & TS: L hanya bila RG = KK = KB = 0 (mentah).
LM & BC: L bila kbTotal ≤ 3 (BC sementara disamakan LM, menunggu
konfirmasi user — sama seperti SQL).

| Jenis | RG | KK | KB | kbTotal | Diharapkan | Catatan |
|---|---:|---:|---:|---:|:---:|---|
| BR | 0 | 0 | 0 | 0 | L | Hafalan baru sempurna |
| BR | 1 | 0 | 0 | 0 | U | Satu RG saja menggugurkan BR |
| BR | 0 | 0 | 1 | 1 | U | Satu KB menggugurkan BR |
| TS | 0 | 0 | 0 | 0 | L | Tes sempurna |
| TS | 0 | 1 | 0 | 0 | U | Satu KK menggugurkan TS |
| LM | 0 | 0 | 3 | 3 | L | Tepat di batas KB ≤ 3 |
| LM | 0 | 0 | 4 | 4 | U | Lewat batas |
| LM | 27 | 0 | 0 | 3 | L | RG 27 → KB 3, masih di batas |
| LM | 36 | 0 | 0 | 4 | U | RG 36 → KK 12 → KB 4 |
| LM | 0 | 9 | 0 | 3 | L | KK 9 → KB 3 |
| LM | 0 | 12 | 0 | 4 | U | KK 12 → KB 4 |
| BC | 0 | 0 | 3 | 3 | L | BC mengikuti aturan LM |
| BC | 1 | 0 | 0 | 0 | L | Beda dengan BR untuk masukan yang sama |
| BC | 0 | 0 | 4 | 4 | U | BC lewat batas KB |

## 3. hasilUjian(rg, kk, kb) → M / BS / B / C / K / G

Dari kbTotal: 0 = M, 1–2 = BS, 3–4 = B, 5–7 = C, 8–10 = K, ≥ 11 = G.

| RG | KK | KB | kbTotal | Diharapkan | Catatan |
|---:|---:|---:|---:|:---:|---|
| 0 | 0 | 0 | 0 | M | Mutqin |
| 9 | 0 | 0 | 1 | BS | Lewat rantai konversi RG → KK → KB |
| 0 | 6 | 0 | 2 | BS | Batas atas BS |
| 27 | 0 | 0 | 3 | B | RG 27 → KB 3 (kasus prototipe: Juz dengan KB konversi 1 keluar BS, KB konversi 3 keluar B) |
| 0 | 0 | 4 | 4 | B | Batas atas B |
| 0 | 0 | 5 | 5 | C | Batas bawah C |
| 0 | 0 | 7 | 7 | C | Batas atas C |
| 0 | 0 | 8 | 8 | K | Batas bawah K |
| 0 | 0 | 10 | 10 | K | Batas atas K |
| 0 | 0 | 11 | 11 | G | Goncang, mulai 11 KB |

## Catatan tepi

- Masukan `null`/`undefined`/NaN diperlakukan sebagai 0, pecahan
  dibulatkan ke bawah, negatif dianggap 0 — menyamakan perilaku
  `coalesce` + constraint `CHECK >= 0` di SQL.
- Bila ada baris di atas yang hasilnya tidak cocok, JANGAN mengubah
  tabel ini agar cocok dengan kode: periksa dulu mana yang menyimpang
  dari aturan Buku Hafalan / fungsi SQL, karena keduanya harus sama.
