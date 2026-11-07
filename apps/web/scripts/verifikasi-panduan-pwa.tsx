import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup as render } from "react-dom/server";
import AksesPwa from "../src/components/AksesPwa";
import Panduan from "../src/components/PanduanAplikasi";
import Beranda from "../src/components/BerandaMonitoring";
import { jendelaAplikasi, petunjukPemasangan } from "../src/lib/pwa";
import { langkahPanduan } from "../src/lib/panduan";
import { menuUtamaBeranda } from "../src/lib/beranda";
import { SEMUA_PERAN } from "../src/lib/peran";
import manifest from "../src/app/manifest";
async function main() {
  assert.equal(jendelaAplikasi(false, false, false), false);
  assert.equal(jendelaAplikasi(true, false), true);
  assert.equal(jendelaAplikasi(false, false, true), true);
  assert.equal(petunjukPemasangan("Macintosh", 5).platform, "iPhone / iPad");
  assert.equal(petunjukPemasangan("Android", 1).platform, "Android");
  for (const r of SEMUA_PERAN) {
    const l = langkahPanduan(r);
    for (const m of menuUtamaBeranda(r))
      assert.ok(l.some((x) => x.target === `menu:${m.href}`));
    assert.equal(l.filter((x) => x.target === "aktivitas").length, 1);
  }
  const m = manifest();
  assert.equal(m.display, "standalone");
  assert.equal(m.scope, "/");
  assert.equal(m.id, "/");
  for (const i of m.icons!)
    assert.ok(readFileSync("public" + i.src).length > 0);
  const home = render(
    <Beranda
      profil={{ id: "admin", nama: "Admin", peran: "admin" }}
      memuatProfil={false}
      memuatData={false}
      modeContoh={false}
      statistik={{
        santri: 1,
        setoran: 0,
        kehadiran: 0,
        catatan: 0,
        olahraga: 0,
      }}
      santri={[]}
      galat={false}
      onMuatUlang={() => {}}
    />,
  );
  assert.ok(!home.includes("info-hapus"));
  assert.ok(!home.includes("banner-kelola"));
  assert.ok(!home.includes("Ubah informasi"));
  assert.ok(home.includes("aksi-ringkas"));
  assert.ok(home.includes('data-panduan="lainnya"'));
  const { JSDOM } = await import(process.env.JSDOM_MODULE || "jsdom");
  const dom = new JSDOM(
    '<!doctype html><div id="root"></div><button data-panduan="menu:/santri">Santri</button>',
    { url: "https://pondok.test/", pretendToBeVisual: true },
  );
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    innerWidth: 1024,
    innerHeight: 768,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(
    dom.window,
  );
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(
    dom.window,
  );
  dom.window.HTMLElement.prototype.scrollIntoView = function () {};
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  const media = new Map<string, any>();
  dom.window.matchMedia = (q: string) => {
    if (!media.has(q))
      media.set(q, {
        matches: false,
        addEventListener(_s: string, f: () => void) {
          this.f = f;
        },
        removeEventListener() {},
      });
    return media.get(q);
  };
  let enregistre = 0;
  Object.defineProperty(dom.window, "isSecureContext", { value: true });
  Object.defineProperty(navigator, "serviceWorker", {
    value: {
      register: async () => {
        enregistre++;
      },
    },
  });
  const mount = () => createRoot(document.getElementById("root")!);
  let root = mount();
  await act(async () => {
    root.render(
      <AksesPwa>
        <p id="contenu">Données privées</p>
      </AksesPwa>,
    );
  });
  assert.ok(document.querySelector(".pwa-gerbang"));
  assert.equal(document.querySelector("#contenu"), null);
  assert.equal(enregistre, 1);
  assert.equal(
    document.querySelector('.pwa-gerbang button[aria-label="Tutup"]'),
    null,
  );
  let prompts = 0;
  const event = new dom.window.Event("beforeinstallprompt", {
    cancelable: true,
  });
  Object.assign(event, {
    prompt: async () => {
      prompts++;
    },
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  await act(async () => {
    dom.window.dispatchEvent(event);
  });
  assert.equal(event.defaultPrevented, true);
  await act(async () => {
    (document.querySelector(".pwa-pasang") as HTMLButtonElement).click();
  });
  assert.equal(prompts, 1);
  await act(async () => {
    dom.window.dispatchEvent(new dom.window.Event("appinstalled"));
  });
  assert.equal(document.querySelector("#contenu"), null);
  assert.ok(document.body.textContent!.includes("ikon aplikasi"));
  const mode = media.get("(display-mode: standalone)");
  await act(async () => {
    mode.matches = true;
    mode.f();
  });
  assert.ok(document.querySelector("#contenu"));
  await act(async () => root.unmount());
  mode.matches = false;
  (globalThis as any).__pathname = "/atur-sandi";
  root = mount();
  await act(async () =>
    root.render(
      <AksesPwa>
        <p id="reset">Reset</p>
      </AksesPwa>,
    ),
  );
  assert.ok(document.querySelector("#reset"));
  await act(async () => root.unmount());
  const claims = new Set<string>();
  let attempts = 0;
  (globalThis as any).__panduanClient = {
    from: (t: string) => {
      assert.equal(t, "panduan_pengguna");
      return {
        insert: async ({ profile_id }: any) => {
          attempts++;
          if (claims.has(profile_id)) return { error: { code: "23505" } };
          claims.add(profile_id);
          return { error: null };
        },
      };
    },
  };
  const show = async (id: string) => {
    root = mount();
    await act(async () => {
      root.render(<Panduan profil={{ id, peran: "wali" }} siap />);
    });
  };
  await show("wali-a");
  assert.ok(document.querySelector("dialog[open]"));
  assert.ok(document.body.textContent!.includes("Selamat datang"));
  await act(async () => {
    (document.querySelector(".panduan-lewati") as HTMLButtonElement).click();
  });
  assert.equal(document.querySelector("dialog"), null);
  await act(async () =>
    root.render(
      <Panduan profil={{ id: "wali-a", peran: "wali" }} siap={false} />,
    ),
  );
  await act(async () =>
    root.render(<Panduan profil={{ id: "wali-a", peran: "wali" }} siap />),
  );
  assert.equal(
    document.querySelector("dialog"),
    null,
    "Refresh data tidak mengulang panduan",
  );
  await act(async () => root.unmount());
  await show("wali-a");
  assert.equal(document.querySelector("dialog"), null);
  await act(async () => root.unmount());
  await show("wali-b");
  assert.ok(document.querySelector("dialog[open]"));
  await act(async () => root.unmount());
  assert.equal(attempts, 3);
  dom.window.history.replaceState({}, "", "/?panduan=ulang");
  await show("wali-a");
  assert.ok(document.querySelector("dialog[open]"));
  assert.equal(attempts, 4);
  await act(async () => root.unmount());
  dom.window.close();
  const handlers: any = {},
    writes: string[] = [],
    keys = ["santri-public-v0", "unrelated-cache"];
  let online = true;
  const offline = new Response("offline"),
    ctx: any = {
      self: {
        location: { origin: "https://pondok.test" },
        addEventListener: (n: string, f: any) => (handlers[n] = f),
        skipWaiting: async () => {},
        clients: { claim: async () => {} },
      },
      URL,
      Request: class {
        constructor(
          public url: string,
          public options: any,
        ) {}
      },
      Response,
      caches: {
        open: async () => ({
          add: async (r: any) => {
            assert.equal(r.options.credentials, "omit");
            writes.push(r.url);
          },
          match: async () => offline,
        }),
        keys: async () => keys,
        delete: async (k: string) => {
          assert.ok(k.startsWith("santri-public-"));
        },
      },
      fetch: async () => {
        if (!online) throw Error("offline");
        return new Response("private");
      },
    };
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), ctx);
  await new Promise<void>((resolve) =>
    handlers.install({ waitUntil: (p: any) => p.then(resolve) }),
  );
  assert.deepEqual(writes, [
    "/offline.html",
    "/brand/logo-192.png",
    "/brand/logo-512.png",
  ]);
  let called = false;
  handlers.fetch({
    request: {
      method: "GET",
      mode: "cors",
      url: "https://pondok.test/api/private",
    },
    respondWith: () => (called = true),
  });
  assert.equal(called, false);
  let response: any;
  handlers.fetch({
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://pondok.test/kesehatan",
    },
    respondWith: (p: any) => (response = p),
  });
  assert.equal(await (await response).text(), "private");
  assert.equal(writes.length, 3);
  online = false;
  handlers.fetch({
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://pondok.test/akun",
    },
    respondWith: (p: any) => (response = p),
  });
  assert.equal(await (await response).text(), "offline");
  assert.equal(writes.length, 3);
  console.log(
    "Lulus: panduan per akun/ulang manual, gerbang PWA tanpa lewati, pemasangan sekali per event, reset sandi, cache publik saja, dan aksi beranda bersih.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
