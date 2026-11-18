#!/usr/bin/env node
// 把 PDF 上架為課程密碼保護的教材頁（線上預覽＋下載），放進 public/slides/<學期>/：
//   <out>.html     staticrypt 加密的小型檢視頁（內含該 PDF 的隨機金鑰）
//   <out>.pdf.enc  AES-256-GCM 加密的 PDF 本體（12 bytes IV ‖ 密文 ‖ tag）
// 桌機沿用瀏覽器內建 PDF 檢視器，手機平板改以 pdf.js（public/vendor/pdfjs/）逐頁繪製。
// 本體不內嵌於密碼頁的原因見 scripts/lib/protect.mjs。
// 用法：node scripts/protect-pdf.mjs <pdf路徑> --title "動力學 單元一 質點位移（學生版）" \
//         --out dynamics-ch1-student --semester 115-1 --password <課程密碼>
import { readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { esc, encryptPayload, payloadUrl, publish, FETCH_DECRYPT_JS } from "./lib/protect.mjs";

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
// 壓縮策略：PDF ≤ 13 MB 直接原檔不壓（畫質優先，PI 2026-09 裁定；加密檔與 PDF 等大，
// 遠低於 Cloudflare 單檔上限 25 MB，門檻留著是顧及手機下載與記憶體）；超過才用 Ghostscript 降採樣，先試 300 dpi（/printer），
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
        if (comp > 24e6) console.log("（警告：仍超過 24 MB，加密檔會超出 Cloudflare 25 MB 上限）");
        break;
      }
    }
  } catch { console.log("（找不到 gs，略過壓縮）"); }
}
const pdf = readFileSync(usePath);
if (usePath !== pdfPath) rmSync(usePath, { force: true });
const fname = `${out}.pdf`;
const { enc, keyHex, hash } = encryptPayload(pdf);
const src = payloadUrl({ semester, out, ext: ".pdf.enc", hash });
const html = `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<style>
body{font-family:Inter,"Noto Sans TC",system-ui,sans-serif;color:#374151;margin:0;background:#f3f4f6}
header{padding:10px 16px;border-bottom:1px solid #e5e7eb;display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:#fff;position:sticky;top:0;z-index:2}
h1{font-size:15px;color:#1e3a5f;margin:0}
a.btn{font-size:13px;background:#1e3a5f;color:#fff;text-decoration:none;padding:6px 14px;border-radius:2px}
a.btn:hover{background:#172b47}
a.btn:not([href]){opacity:.5}
small{color:#6b7280}
#status{padding:24px 16px;margin:0;font-size:14px;color:#6b7280}
#pages{padding:8px}
.pg{max-width:1100px;margin:0 auto 8px}
.pg>div{position:relative;background:#fff;box-shadow:0 0 0 1px #e5e7eb}
.pg canvas{position:absolute;top:0;left:0;width:100%;height:100%}
#pageno{position:fixed;right:12px;bottom:12px;font-size:12px;background:rgba(30,58,95,.85);color:#fff;padding:4px 10px;border-radius:2px;z-index:2}
body.native{display:flex;flex-direction:column;height:100vh;background:#fff}
body.native iframe{border:0;flex:1;width:100%}
</style></head><body>
<header><h1>${esc(title)}</h1><a class="btn" id="dl">下載 PDF</a>
<small>檔案僅供修課同學使用，請勿轉傳。</small></header>
<p id="status">下載教材中…</p>
<div id="pages"></div>
<div id="pageno" hidden></div>
<script type="module">
const KEY = "${keyHex}", SRC = "${src}", SIZE = ${enc.length}, FNAME = "${fname}";
const $ = (id) => document.getElementById(id);
const status = $("status");
const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
// 桌機用瀏覽器內建 PDF 檢視器；手機平板的 iframe 顯示不了 PDF，改用 pdf.js 逐頁繪製
const useNative = !!navigator.pdfViewerEnabled && !isIOS && !/Android/.test(ua);

${FETCH_DECRYPT_JS}
try {
  const pdf = await fetchDecrypt(SRC, KEY, SIZE, status);

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const dl = $("dl");
  dl.href = url;
  dl.download = FNAME;
  // iOS：走分享選單（儲存到檔案／GoodNotes 等），比 blob 下載可靠
  if (isIOS && navigator.canShare) {
    const file = new File([blob], FNAME, { type: "application/pdf" });
    if (navigator.canShare({ files: [file] })) {
      dl.addEventListener("click", (e) => {
        e.preventDefault();
        navigator.share({ files: [file] }).catch((err) => { if (err.name !== "AbortError") location.href = url; });
      });
    }
  }

  if (useNative) {
    document.body.classList.add("native");
    const frame = document.createElement("iframe");
    frame.title = document.title;
    frame.src = url;
    $("pages").replaceWith(frame);
    status.hidden = true;
  } else {
    status.textContent = "載入頁面中…";
    const pdfjs = await import("/vendor/pdfjs/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
    const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf) }).promise;
    const first = (await doc.getPage(1)).getViewport({ scale: 1 });
    const wrap = $("pages"), badge = $("pageno"), total = doc.numPages;
    const state = new Map();

    // 只繪製畫面附近的頁面，離開就釋放 canvas（數百頁的投影片全畫會撐爆記憶體）
    const draw = async (el, s) => {
      try {
        const page = await doc.getPage(+el.dataset.n);
        if (!s.on || s.canvas) return;
        const base = page.getViewport({ scale: 1 });
        el.firstChild.style.paddingTop = (base.height / base.width) * 100 + "%";
        const px = Math.min(el.clientWidth * Math.min(window.devicePixelRatio || 1, 3), 2600);
        const vp = page.getViewport({ scale: px / base.width });
        const c = document.createElement("canvas");
        c.width = Math.floor(vp.width);
        c.height = Math.floor(vp.height);
        s.canvas = c;
        s.w = el.clientWidth;
        el.firstChild.appendChild(c);
        s.task = page.render({ canvasContext: c.getContext("2d"), viewport: vp });
        await s.task.promise;
        s.task = null;
      } catch (err) {
        if (!err || err.name !== "RenderingCancelledException") console.error(err);
      }
    };
    const show = (el) => {
      const s = state.get(el);
      s.on = true;
      if (s.canvas || s.timer) return;
      s.timer = setTimeout(() => { s.timer = 0; draw(el, s); }, 60);
    };
    const hide = (el) => {
      const s = state.get(el);
      s.on = false;
      clearTimeout(s.timer);
      s.timer = 0;
      if (s.task) { s.task.cancel(); s.task = null; }
      if (s.canvas) { s.canvas.width = s.canvas.height = 0; s.canvas.remove(); s.canvas = null; }
    };
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) (e.isIntersecting ? show : hide)(e.target); },
      { rootMargin: "100% 0px" },
    );
    for (let n = 1; n <= total; n++) {
      const el = document.createElement("div");
      el.className = "pg";
      el.dataset.n = n;
      const sheet = document.createElement("div");
      sheet.style.paddingTop = (first.height / first.width) * 100 + "%";
      el.appendChild(sheet);
      wrap.appendChild(el);
      state.set(el, {});
      io.observe(el);
    }
    status.hidden = true;

    // 頁碼：取畫面中線所在的那一頁（中線落在頁間空隙時往下探一點）
    let ticking = false;
    const updateBadge = () => {
      ticking = false;
      const x = window.innerWidth / 2, mid = window.innerHeight / 2;
      for (const y of [mid, mid + 12]) {
        const hit = document.elementFromPoint(x, y);
        const el = hit && hit.closest(".pg");
        if (el) { badge.textContent = el.dataset.n + " / " + total; break; }
      }
    };
    badge.textContent = "1 / " + total;
    badge.hidden = false;
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(updateBadge); } }, { passive: true });

    // 轉向或改變視窗寬度後，依新寬度重畫
    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        for (const [el, s] of state) {
          if (s.canvas && Math.abs(el.clientWidth - s.w) > 8) { hide(el); show(el); }
        }
      }, 200);
    });
  }
} catch (err) {
  console.error(err);
  status.hidden = false;
  status.textContent = "教材載入失敗，請重新整理頁面再試一次。（" + (err && err.message ? err.message : err) + "）";
}
</script>
</body></html>`;
publish({ root, semester, out, ext: ".pdf.enc", html, enc, password });
console.log(`✓ public/slides/${semester}/${out}.html ＋ ${out}.pdf.enc（${basename(pdfPath)}，${(pdf.length / 1e6).toFixed(1)} MB，已加密）`);
