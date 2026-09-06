#!/usr/bin/env node
// 匯入成績工具（tools/grade-tool.html）的「網站發布包」JSON：
//   1. 寫入 src/data/grades/<slug>.json（課程頁「本學期成績統計」區塊的資料來源，僅聚合數字＋遮蔽學號）
//   2. 產生成績明細 HTML，以 staticrypt 加密後放 public/slides/<學期>/<prefix>-grades.html
// 用法：npm run import:grades -- <web-export.json> --password <課程密碼>
// 發布包不含姓名、學號已遮蔽末三碼（由工具在匯出時去識別化）。
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const pwIdx = args.indexOf("--password");
const password = pwIdx >= 0 ? args[pwIdx + 1] : null;
const input = args.filter((a, i) => a !== "--password" && i !== pwIdx + 1)[0];

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
  if (r.name || !/\*{3}$/.test(String(r.id ?? ""))) {
    console.error(`資料未去識別化（${JSON.stringify(r).slice(0, 60)}…），中止。請用工具的「匯出網站發布包」。`);
    process.exit(1);
  }
}

// prefix 對應既有教材檔名（thermo-intro.html 等）
const prefixMap = { thermodynamics: "thermo", dynamics: "dynamics" };
const prefix = prefixMap[course.slug] ?? course.slug;
const detailRel = `slides/${course.semester}/${prefix}-grades.html`;

// 1) 課程頁資料
mkdirSync(resolve(root, "src/data/grades"), { recursive: true });
const pageData = {
  semester: course.semester,
  generated,
  included,
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
const statLine = cols
  .map((k) => `${label[k]}：${stats[k].n} 人，平均 ${stats[k].mean} ± ${stats[k].sd}，不及格 ${stats[k].fail} 人`)
  .join("；");
const rowsHtml = rows
  .slice()
  .sort((a, b) => String(a.id).localeCompare(String(b.id)))
  .map(
    (r) =>
      `<tr><td>${r.id}</td>${cols
        .map((k) => `<td${k === "total" && r[k] !== null && r[k] < 60 ? ' class="f"' : ""}>${r[k] ?? "—"}</td>`)
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
td.f{color:#dc2626;font-weight:600}
</style></head><body>
<h1>${course.name ?? course.slug} <small>${course.semester} ${course.klass ?? ""}</small></h1>
<div class="rule"></div>
<p class="meta">更新日期：${generated}。學號已遮蔽末三碼；本表僅供修課同學參考，正式成績以學校系統為準。</p>
<p class="meta">${statLine}</p>
<table><thead><tr><th>學號</th>${cols.map((k) => `<th>${label[k]}</th>`).join("")}</tr></thead>
<tbody>
${rowsHtml}
</tbody></table>
</body></html>`;

const tmpDir = resolve(root, ".grades-tmp");
mkdirSync(tmpDir, { recursive: true });
const tmpFile = resolve(tmpDir, `${prefix}-grades.html`);
writeFileSync(tmpFile, html);

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
