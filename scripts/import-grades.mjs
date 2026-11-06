#!/usr/bin/env node
// 匯入成績工具（tools/grade-tool.html）的「網站發布包」JSON：
//   1. 寫入 src/data/grades/<slug>.json（課程頁「成績查詢」區塊的資料來源；公開直條圖只放學期總成績）
//   2. 產生成績明細 HTML，以 staticrypt 加密後放 public/slides/<學期>/<prefix>-grades.html
// 用法：npm run import:grades -- <web-export.json> --password <課程密碼>
// 學號只保留末三碼（***127；由工具在匯出時遮蔽）；姓名欄為選用（PI 2026-11-06 決定放姓名，頁面在課程密碼之後）。
// 可加 --draft-out <path> 另存未加密的明細頁草稿到 repo 外供預覽。
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const pwIdx = args.indexOf("--password");
const password = pwIdx >= 0 ? args[pwIdx + 1] : null;
const doIdx = args.indexOf("--draft-out");
const draftOut = doIdx >= 0 ? args[doIdx + 1] : null;
const skip = new Set([pwIdx, pwIdx + 1, doIdx, doIdx + 1]);
const input = args.filter((a, i) => !skip.has(i))[0];

if (!input) {
  console.error("用法：npm run import:grades -- <web-export.json> --password <課程密碼>");
  process.exit(1);
}
const data = JSON.parse(readFileSync(input, "utf-8"));
if (data.kind !== "grade-web-export") {
  console.error("這不是成績工具匯出的網站發布包（kind 欄位不符）。");
  process.exit(1);
}
const { course, stats, rows, included, generated } = data;
if (!course?.slug || !course?.semester) {
  console.error("發布包缺 course.slug 或 course.semester。");
  process.exit(1);
}
for (const r of rows) {
  if (!/^(\*{3}\d{1,3}|旁聽\d*)$/.test(String(r.id ?? ""))) {
    console.error(`學號未遮蔽（${JSON.stringify(r).slice(0, 60)}…），中止。請用工具的「匯出網站發布包」。`);
    process.exit(1);
  }
}

// prefix 對應既有教材檔名（thermo-intro.html 等）
const prefixMap = { thermodynamics: "thermo", dynamics: "dynamics" };
const prefix = prefixMap[course.slug] ?? course.slug;
const detailRel = `slides/${course.semester}/${prefix}-grades.html`;

// 1) 課程頁資料：公開區塊只畫學期總成績的直條圖；期中、期末統計只放在加密明細頁
mkdirSync(resolve(root, "src/data/grades"), { recursive: true });
const pageData = {
  semester: course.semester,
  generated,
  included,
  public: included.filter((k) => k === "total"),
  stats,
  detail: `/${detailRel}`,
};
writeFileSync(
  resolve(root, `src/data/grades/${course.slug}.json`),
  JSON.stringify(pageData, null, 2),
);
console.log(`✓ src/data/grades/${course.slug}.json（${included.join("、") || "無項目"}）`);

// 2) 明細頁
const label = { mid: "期中考", final: "期末考", total: "學期總成績" };
const cols = included;
const hasName = rows.some((r) => r.name);
const binLabels = ["0", "10", "20", "30", "40", "50", "60", "70", "80", "90"];
const histHtml = cols
  .map((k) => {
    const a = stats[k];
    const max = Math.max(...a.bins, 1);
    const bars = a.bins
      .map(
        (b, i) =>
          `<div class="col"><span class="cnt">${b > 0 ? b : ""}</span><div class="bar${i < 6 ? " lo" : ""}" style="height:${((b / max) * 85).toFixed(0)}%"></div></div>`,
      )
      .join("");
    return `<div class="hist"><div class="ht">${label[k]}</div>
<div class="hs">${a.n} 人 · 平均 ${a.mean} ± ${a.sd} · 不及格 ${a.fail} 人</div>
<div class="bars">${bars}</div>
<div class="axis">${binLabels.map((l) => `<span>${l}</span>`).join("")}</div></div>`;
  })
  .join("\n");
const rowsHtml = rows
  .slice()
  .sort((a, b) => (/^旁聽/.test(a.id) ? 1 : 0) - (/^旁聽/.test(b.id) ? 1 : 0) || String(a.id).localeCompare(String(b.id)))
  .map(
    (r) =>
      `<tr><td>${r.id}</td>${hasName ? `<td>${r.name ?? ""}</td>` : ""}${cols
        .map((k) => `<td${r[k] !== null && r[k] !== undefined && r[k] < 60 ? ' class="f"' : ""}>${r[k] ?? "—"}</td>`)
        .join("")}</tr>`,
  )
  .join("\n");
const html = `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${course.name ?? course.slug} 成績（${course.semester}）</title>
<style>
body{font-family:Inter,"Noto Sans TC",system-ui,sans-serif;color:#374151;max-width:640px;margin:0 auto;padding:24px 16px}
h1{color:#1e3a5f;font-size:22px}h1 small{color:#6b7280;font-weight:400;font-size:14px}
.rule{height:2px;width:48px;background:#dc2626;margin:8px 0 16px}
p.meta{font-size:13px;color:#6b7280}
table{border-collapse:collapse;width:100%;font-size:14px;margin-top:12px}
th,td{border:1px solid #e5e7eb;padding:5px 10px;text-align:center}
th{background:#f1f5f9;color:#1e3a5f}
td.f{color:#b91c1c;font-weight:600;background:#fef2f2}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin:12px 0 4px}
.hist{border:1px solid #e5e7eb;border-radius:4px;padding:12px;background:#fff}
.ht{font-size:14px;font-weight:600;color:#1e3a5f}.hs{font-size:12px;color:#6b7280;margin-top:2px}
.bars{display:flex;align-items:flex-end;gap:4px;height:112px;margin-top:12px}
.col{flex:1;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}
.cnt{font-size:10px;line-height:1;color:#6b7280}.bar{width:100%;margin-top:2px;border-radius:2px;background:#1e3a5f}.bar.lo{background:#a9b8cf}
.axis{display:flex;gap:4px;margin-top:4px}.axis span{flex:1;text-align:center;font-size:10px;color:#9ca3af}
p.note{font-size:12px;color:#6b7280;margin:4px 0 0}
</style></head><body>
<h1>${course.name ?? course.slug} <small>${course.semester} ${course.klass ?? ""}</small></h1>
<div class="rule"></div>
<p class="meta">更新日期：${generated}。學號只顯示末三碼；本表僅供修課同學參考，正式成績以學校系統為準。</p>
<div class="grid">
${histHtml}
</div>
<p class="note">橫軸為分數級距（每 10 分一組，90 含以上）；淺色為不及格級距，柱上數字為人數。對照自己的分數，可知在全班的位置。表中不及格分數以紅底標示。${rows.some((r) => /^旁聽/.test(r.id)) ? "旁聽生列於表末，不計入統計。" : ""}</p>
<table><thead><tr><th>學號</th>${hasName ? "<th>姓名</th>" : ""}${cols.map((k) => `<th>${label[k]}</th>`).join("")}</tr></thead>
<tbody>
${rowsHtml}
</tbody></table>
</body></html>`;

const tmpDir = resolve(root, ".grades-tmp");
mkdirSync(tmpDir, { recursive: true });
const tmpFile = resolve(tmpDir, `${prefix}-grades.html`);
writeFileSync(tmpFile, html);
if (draftOut) {
  writeFileSync(resolve(draftOut), html);
  console.log(`✓ 未加密草稿另存 ${resolve(draftOut)}（勿放進 repo）`);
}

if (!password) {
  console.error(`✗ 未提供 --password，不會發布明細頁（草稿在 ${tmpFile}，勿直接放入 public/）。`);
  process.exit(1);
}
const outDir = resolve(root, `public/slides/${course.semester}`);
mkdirSync(outDir, { recursive: true });
execFileSync(
  "npx",
  ["-y", "staticrypt", tmpFile, "-p", password, "-d", outDir, "--short", "--remember", "180",
   "--template-title", "熱聲實驗室 課程成績", "--template-instructions", "請輸入課程密碼"],
  { stdio: "inherit", cwd: root },
);
rmSync(tmpDir, { recursive: true, force: true });
console.log(`✓ public/${detailRel}（已加密）`);
console.log("完成。請 npm run build 確認後 commit。");
