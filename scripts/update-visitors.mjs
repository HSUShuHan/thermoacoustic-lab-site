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

async function fetchCounts() {
  let token = process.env.CF_API_TOKEN;
  if (!token) {
    try {
      token = readFileSync(`${process.env.HOME}/.config/thermoacoustic-cf-token`, "utf-8").trim();
    } catch {}
  }
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

// 色階（藏青系，依請求數級距）
const bucket = (n) => (n >= 10000 ? "#1e3a5f" : n >= 1000 ? "#41608c" : n >= 100 ? "#7d97b8" : "#b9c8db");
let css = `
.oceanxx, .limitxx { fill: #ffffff; stroke: none; }
.landxx, .coastxx, .antxx { fill: #eceff3; stroke: #ffffff; stroke-width: 0.6; }
g[id]:hover, path[id]:hover { filter: brightness(0.82); }
`;
for (const [code, n] of Object.entries(counts)) {
  const id = code.toLowerCase();
  css += `#${id}, #${id} * { fill: ${bucket(n)}; }\n`;
}
let svg = readFileSync(resolve(root, "scripts/assets/world-map.svg"), "utf-8");
svg = svg.replace("</style>", css + "</style>");
if (!svg.includes("viewBox"))
  svg = svg.replace(/<svg([^>]*)width="2754" height="1398"/, '<svg$1viewBox="0 0 2754 1398"');

// 各國 <title> 提示（中英名＋請求數；hover 原生顯示）
const zhName = new Intl.DisplayNames(["zh-Hant"], { type: "region" });
const enName = new Intl.DisplayNames(["en"], { type: "region" });
for (const [code, n] of Object.entries(counts)) {
  if (!/^[A-Z]{2}$/.test(code)) continue;
  const id = code.toLowerCase();
  let zh = code, en = code;
  try { zh = zhName.of(code) ?? code; en = enName.of(code) ?? code; } catch {}
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const tip = `<title>${esc(zh)}${en !== zh ? " " + esc(en) : ""}：${n.toLocaleString("en-US")}</title>`;
  const re = new RegExp(`<(g|path|circle)([^>]*id="${id}"[^>]*?)(\\s*/)?>`);
  const m = svg.match(re);
  if (!m) continue;
  svg = m[3]
    ? svg.replace(m[0], `<${m[1]}${m[2]}>${tip}</${m[1]}>`)
    : svg.replace(m[0], `${m[0]}${tip}`);
}

// 太平洋置中：主圖左移、第二份補右側（切線約 30°W，只切格陵蘭）
const DX = -1048;
const inner = svg.slice(svg.indexOf(">", svg.indexOf("<svg")) + 1, svg.lastIndexOf("</svg>"));
const head = svg.slice(0, svg.indexOf(">", svg.indexOf("<svg")) + 1);
svg = `${head}<g id="wsrc" transform="translate(${DX},0)">${inner}</g><use href="#wsrc" x="2754"/></svg>`;

mkdirSync(resolve(root, "public/images/home"), { recursive: true });
writeFileSync(resolve(root, "public/images/home/visitor-map.svg"), svg);

const codes = Object.entries(counts).filter(([c, n]) => /^[A-Z]{2}$/.test(c) && n >= 10).map(([c]) => c);
const meta = {
  updated: new Date().toISOString().slice(0, 10),
  days: DAYS,
  countries: codes.length,
  sample,
};
mkdirSync(resolve(root, "src/data"), { recursive: true });
writeFileSync(resolve(root, "src/data/visitors.json"), JSON.stringify(meta, null, 2));
console.log(`✓ visitor-map.svg（${codes.length} 個國家／地區${sample ? "，樣本資料" : ""}）`);
console.log("✓ src/data/visitors.json");
