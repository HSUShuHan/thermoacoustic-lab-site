#!/usr/bin/env node
// 訪客足跡地圖：從 Cloudflare 區域分析（邊緣請求、免客戶端腳本）取各國請求數，
// 上色到公有領域世界地圖（scripts/assets/world-map.svg），輸出
//   public/images/home/visitor-map.png ＋ src/data/visitors.json
// 用法：CF_API_TOKEN=<唯讀 Analytics token> npm run update:visitors
//       npm run update:visitors -- --sample   （樣本資料，僅供預覽）
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ZONE = process.env.CF_ZONE ?? "thermoacoustictw.org";
const DAYS = 30;

const ACCOUNT = "43f1cfdbbca179f64b35f8934b5a6158";

function getToken() {
  let token = process.env.CF_API_TOKEN;
  if (!token) {
    try {
      token = readFileSync(`${process.env.HOME}/.config/thermoacoustic-cf-token`, "utf-8").trim();
    } catch {}
  }
  return token;
}

async function fetchCounts() {
  const token = getToken();
  if (!token) throw new Error("缺 CF_API_TOKEN（~/.config/thermoacoustic-cf-token 或環境變數；--sample 可預覽）");
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const zr = await (await fetch(`https://api.cloudflare.com/client/v4/zones?name=${ZONE}`, { headers: h })).json();
  const zoneTag = zr.result?.[0]?.id;
  if (!zoneTag) throw new Error("找不到 zone：" + JSON.stringify(zr.errors ?? zr));
  const until = new Date();
  const since = new Date(until.getTime() - DAYS * 86400e3);
  const day = (d) => d.toISOString().slice(0, 10);
  const query = `{
    viewer { zones(filter: {zoneTag: "${zoneTag}"}) {
      httpRequests1dGroups(limit: 40, filter: {date_geq: "${day(since)}", date_leq: "${day(until)}"}) {
        sum { countryMap { clientCountryName requests } }
      }
    } }
  }`;
  const gr = await (await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST", headers: h, body: JSON.stringify({ query }),
  })).json();
  if (gr.errors?.length) throw new Error("GraphQL: " + JSON.stringify(gr.errors));
  const groups = gr.data.viewer.zones[0].httpRequests1dGroups;
  const counts = {};
  for (const g of groups)
    for (const c of g.sum.countryMap)
      counts[c.clientCountryName] = (counts[c.clientCountryName] ?? 0) + c.requests;
  return counts;
}

const SAMPLE = { TW: 18500, JP: 2100, US: 1400, DE: 320, FR: 250, GB: 180, CN: 900,
  KR: 260, SG: 90, NL: 60, CA: 45, AU: 30, IN: 25, TH: 12, MY: 8, IT: 7, SE: 5, CH: 3 };

const sample = process.argv.includes("--sample");
const counts = sample ? SAMPLE : await fetchCounts();

// 產出地球儀資料：counts（A2→次數）、names（A2→中文短名）、n3 對照
const n3map = JSON.parse(readFileSync(resolve(root, "scripts/assets/iso-n3-to-a2.json"), "utf-8"));
const zhName = new Intl.DisplayNames(["zh-Hant"], { type: "region" });
const enName = new Intl.DisplayNames(["en"], { type: "region" });
const names = {};
const namesEn = {};
for (const a2 of new Set(Object.values(n3map))) {
  try { names[a2] = zhName.of(a2) ?? a2; } catch { names[a2] = a2; }
  try { namesEn[a2] = enName.of(a2) ?? a2; } catch { namesEn[a2] = a2; }
}
const cleanCounts = {};
for (const [code, n] of Object.entries(counts))
  if (/^[A-Z]{2}$/.test(code)) cleanCounts[code] = n;

const codes = Object.entries(counts).filter(([c, n]) => /^[A-Z]{2}$/.test(c) && n >= 10).map(([c]) => c);
const meta = {
  updated: new Date().toISOString().slice(0, 10),
  days: DAYS,
  countries: codes.length,
  sample,
};
mkdirSync(resolve(root, "src/data"), { recursive: true });
writeFileSync(resolve(root, "src/data/visitors.json"), JSON.stringify(meta, null, 2));
mkdirSync(resolve(root, "public/data"), { recursive: true });
writeFileSync(
  resolve(root, "public/data/visitor-globe.json"),
  JSON.stringify({ ...meta, counts: cleanCounts, names, names_en: namesEn, n3: n3map }),
);
console.log(`✓ public/data/visitor-globe.json（${codes.length} 個國家／地區${sample ? "，樣本資料" : ""}）`);
console.log("✓ src/data/visitors.json");

// 省州／縣市統計：Worker /api/beacon 寫入 Analytics Engine（見 worker/index.mjs），
// 這裡用 SQL API 聚合近 30 天，輸出 public/data/visitor-regions.json。
// token 需含 Account Analytics: Read 權限；沒有就略過（地球儀會自動隱藏該圖層）。
if (!sample) {
  try {
    const token = getToken();
    const sql = `SELECT blob1 AS c, blob2 AS region, blob3 AS city,
        blob4 AS lat, blob5 AS lon, SUM(_sample_interval * double1) AS n
      FROM thermoacoustic_visits
      WHERE timestamp > NOW() - INTERVAL '${DAYS}' DAY
      GROUP BY c, region, city, lat, lon
      FORMAT JSON`;
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/analytics_engine/sql`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: sql,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}：${(await res.text()).slice(0, 160)}`);
    const rows = (await res.json()).data ?? [];
    const acc = (map, key, name, r) => {
      const lat = parseFloat(r.lat), lon = parseFloat(r.lon), n = Number(r.n);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !n) return;
      const e = (map[key] ??= { name, c: r.c, n: 0, la: 0, lo: 0 });
      e.n += n; e.la += lat * n; e.lo += lon * n;
    };
    const regionMap = {}, cityMap = {};
    for (const r of rows) {
      if (r.region) acc(regionMap, `${r.c}|${r.region}`, `${r.region}, ${namesEn[r.c] ?? r.c}`, r);
      if (r.city) acc(cityMap, `${r.c}|${r.region}|${r.city}`, `${r.city}, ${namesEn[r.c] ?? r.c}`, r);
    }
    const pack = (map) => Object.values(map)
      .map((e) => ({ name: e.name, c: e.c, n: Math.round(e.n), lat: +(e.la / e.n).toFixed(2), lon: +(e.lo / e.n).toFixed(2) }))
      .sort((a, b) => b.n - a.n);
    const regions = pack(regionMap), cities = pack(cityMap);
    writeFileSync(
      resolve(root, "public/data/visitor-regions.json"),
      JSON.stringify({ updated: meta.updated, days: DAYS, regions, cities }),
    );
    console.log(`✓ public/data/visitor-regions.json（${regions.length} 省州、${cities.length} 縣市）`);
  } catch (e) {
    console.log(`（略過省州縣市統計：${e.message}）`);
  }
}
