#!/usr/bin/env node
// 把 PDF 包成 staticrypt 加密頁（線上預覽＋下載），放進 public/slides/<學期>/。
// 用法：node scripts/protect-pdf.mjs <pdf路徑> --title "動力學 單元一 質點位移（學生版）" \
//         --out dynamics-ch1-student --semester 115-1 --password <課程密碼>
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, d = null) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : d;
};
const pdfPath = args.find((a) => !a.startsWith("--") && a.endsWith(".pdf"));
const title = opt("title");
const out = opt("out");
const semester = opt("semester");
const password = opt("password");
if (!pdfPath || !title || !out || !semester || !password) {
  console.error('用法：node scripts/protect-pdf.mjs <pdf> --title "…" --out <檔名不含副檔名> --semester 115-1 --password <密碼>');
  process.exit(1);
}
// 壓縮策略：Cloudflare 單檔上限 25 MB、base64 會脹 1.33 倍 → PDF ≤ 13 MB 直接原檔不壓
// （畫質優先，PI 2026-09 裁定）；超過才用 Ghostscript 降採樣，先試 300 dpi（/printer），
// 還是太大再退 150 dpi（/ebook）。--no-compress 可強制略過。
const LIMIT = 13e6;
let usePath = pdfPath;
const origSize = readFileSync(pdfPath).length;
if (!args.includes("--no-compress") && origSize > LIMIT) {
  try {
    const tmpPdf = resolve(root, ".pdf-tmp-compress.pdf");
    for (const preset of ["/printer", "/ebook"]) {
      execFileSync("gs", ["-q", "-dNOPAUSE", "-dBATCH", "-sDEVICE=pdfwrite",
        `-dPDFSETTINGS=${preset}`, "-dCompatibilityLevel=1.5",
        `-sOutputFile=${tmpPdf}`, pdfPath]);
      const comp = readFileSync(tmpPdf).length;
      if (comp <= LIMIT || preset === "/ebook") {
        usePath = tmpPdf;
        console.log(`（已壓縮 ${(origSize / 1e6).toFixed(1)} MB → ${(comp / 1e6).toFixed(1)} MB，${preset}）`);
        if (comp > LIMIT) console.log("（警告：仍超過 13 MB，加密頁可能超出 Cloudflare 25 MB 上限）");
        break;
      }
    }
  } catch { console.log("（找不到 gs，略過壓縮）"); }
}
const pdf = readFileSync(usePath);
if (usePath !== pdfPath) rmSync(usePath, { force: true });
const b64 = pdf.toString("base64");
const fname = `${out}.pdf`;
const html = `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<style>
body{font-family:Inter,"Noto Sans TC",system-ui,sans-serif;color:#374151;margin:0;display:flex;flex-direction:column;height:100vh}
header{padding:10px 16px;border-bottom:1px solid #e5e7eb;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
h1{font-size:15px;color:#1e3a5f;margin:0}
a.btn{font-size:13px;background:#1e3a5f;color:#fff;text-decoration:none;padding:6px 14px;border-radius:2px}
a.btn:hover{background:#172b47}
small{color:#6b7280}
iframe{border:0;flex:1;width:100%}
</style></head><body>
<header><h1>${title}</h1><a class="btn" id="dl" download="${fname}">下載 PDF</a>
<small>檔案僅供修課同學使用，請勿轉傳。</small></header>
<iframe id="view"></iframe>
<script>
const b64 = "${b64}";
const bin = atob(b64); const u8 = new Uint8Array(bin.length);
for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
const url = URL.createObjectURL(new Blob([u8], { type: "application/pdf" }));
document.getElementById("dl").href = url;
document.getElementById("view").src = url;
</script>
</body></html>`;
const tmpDir = resolve(root, ".pdf-tmp");
mkdirSync(tmpDir, { recursive: true });
const tmp = resolve(tmpDir, `${out}.html`);
writeFileSync(tmp, html);
const outDir = resolve(root, `public/slides/${semester}`);
mkdirSync(outDir, { recursive: true });
execFileSync("npx", ["-y", "staticrypt", tmp, "-p", password, "-d", outDir, "--short",
  "--remember", "180", "--template-title", "熱聲實驗室 課程教材", "--template-instructions", "請輸入課程密碼"],
  { stdio: "inherit", cwd: root });
rmSync(tmpDir, { recursive: true, force: true });
console.log(`✓ public/slides/${semester}/${out}.html（${basename(pdfPath)}，${(pdf.length / 1e6).toFixed(1)} MB，已加密）`);
