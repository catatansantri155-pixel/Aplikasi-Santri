import assert from "node:assert/strict";
import { semuaBaris } from "../src/lib/data/halaman";
import {
  ambilUjianSemester,
  simpanBarisUjian,
  ambilSetoranTerakhir,
} from "../src/lib/data/hifzh";
import { cobaLengkapiProfilWaliTertunda } from "../src/lib/sesi";
import { ambilStatistikBeranda } from "../src/lib/data/beranda";
async function main() {
  const rows = Array.from({ length: 1207 }, (_, id) => ({ id }));
  let calls = 0;
  const all = await semuaBaris(() => ({
    range: async (a, b) => {
      calls++;
      return {
        data: rows.slice(a, Math.min(a + 73, b + 1)),
        count: rows.length,
        error: null,
      };
    },
  }));
  assert.deepEqual(all, rows);
  assert.equal(calls, 17);
  await assert.rejects(
    () =>
      semuaBaris(() => ({
        range: async () => ({ data: [], count: 1, error: null }),
      })),
    /berubah/,
  );
  let filters: any[] = [];
  let inserted: any;
  let updated: any;
  let failure = false;
  const saved = {
    id: "server-id",
    santri_id: "anak",
    semester_id: "semester-a",
    juz: 1,
    halaman: 2,
    rg: 0,
    kk: 0,
    kb: 0,
    hasil: "M",
  };
  const query: any = {
    select() {
      return this;
    },
    eq(k: string, v: any) {
      filters.push([k, v]);
      return this;
    },
    order() {
      return this;
    },
    limit() {
      return this;
    },
    insert(v: any) {
      inserted = v;
      return this;
    },
    update(v: any) {
      updated = v;
      return this;
    },
    single: async () => ({ data: saved, error: null }),
    then(ok: any) {
      return Promise.resolve({
        data: failure ? null : [saved],
        error: failure ? { message: "network" } : null,
      }).then(ok);
    },
  };
  (globalThis as any).__auditClient = {
    from: () => query,
    auth: { getUser: async () => ({ data: { user: { id: "penguji" } } }) },
    rpc: async (name: string) => {
      assert.equal(name, "pastikan_profil_wali");
      return { data: true, error: null };
    },
  };
  const exam = await ambilUjianSemester("anak", "semester-a");
  assert.equal(exam.data[0].id, "server-id");
  assert.ok(
    filters.some(([k, v]) => k === "semester_id" && v === "semester-a"),
  );
  const input = { santriId: "anak", juz: 1, halaman: 2, rg: 0, kk: 0, kb: 0 };
  await assert.rejects(() => simpanBarisUjian(input), /semester/);
  const r = await simpanBarisUjian(input, "semester-a");
  assert.equal(r.data?.id, "server-id");
  assert.equal(inserted.semester_id, "semester-a");
  assert.equal(inserted.penguji_id, "penguji");
  filters = [];
  await simpanBarisUjian(input, "semester-a", "server-id");
  assert.equal(updated.penguji_id, undefined);
  assert.ok(filters.some(([k, v]) => k === "id" && v === "server-id"));
  failure = true;
  await assert.rejects(() => ambilSetoranTerakhir(), /belum dapat dimuat/);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw Error("blocked");
    },
  });
  assert.equal(await cobaLengkapiProfilWaliTertunda(), true);
  (globalThis as any).__auditClient.rpc = async () => ({
    data: {
      santri: 2,
      setoran: 150,
      kehadiran: 91,
      catatan: 75,
      olahraga: 0,
      anak: {},
    },
    error: null,
  });
  assert.equal((await ambilStatistikBeranda()).setoran, 150);
  (globalThis as any).__auditClient.rpc = async () => ({
    data: { santri: -1 },
    error: null,
  });
  await assert.rejects(() => ambilStatistikBeranda(), /valid/);
  console.log(
    "PASS: pagination 1207 rows/server cap 73, explicit semester and real ID, production read failure, profile without localStorage, authoritative statistics.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
