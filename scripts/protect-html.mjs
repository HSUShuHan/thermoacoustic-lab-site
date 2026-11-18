#!/usr/bin/env node
// 把單檔 HTML 投影片（reveal.js deck 等）上架為課程密碼保護的教材頁，放進 public/slides/<學期>/：
//   <out>.html      staticrypt 加密的小型載入頁（內含該 deck 的隨機金鑰）
//   <out>.html.enc  AES-256-GCM 加密的 deck 本體（12 bytes IV ‖ 密文 ‖ tag）
// 不要直接用 `npx staticrypt deck.html`：內嵌字型／影片的 deck 會變成 16–24 MB 的密碼頁，
// 原因見 scripts/lib/protect.mjs。
// 用法：node scripts/protect-html.mjs <html路徑> --out dynamics-intro --semester 115-1 --password <課程密碼>
import { readFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { esc, encryptPayload, payloadUrl, publish, FETCH_DECRYPT_JS } from "./lib/protect.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, d = null) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : d;
};
const htmlPath = args.find((a) => !a.startsWith("--") && /\.html?$/.test(a));
const out = opt("out");
const semester = opt("semester");
const password = opt("password");
if (!htmlPath || !out || !semester || !password) {
  console.error("用法：node scripts/protect-html.mjs <html> --out <檔名不含副檔名> --semester 115-1 --password <密碼>");
  process.exit(1);
}
const deck = readFileSync(htmlPath);
if (deck.length > 24e6) console.log("（警告：超過 24 MB，加密檔會超出 Cloudflare 25 MB 上限）");
const title = opt("title") ?? deck.toString("utf8").match(/<title>([^<]*)<\/title>/)?.[1] ?? out;
const { enc, keyHex, hash } = encryptPayload(deck);
const src = payloadUrl({ semester, out, ext: ".html.enc", hash });
const html = `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<style>
body{font-family:Inter,"Noto Sans TC",system-ui,sans-serif;margin:0}
#status{padding:24px 16px;margin:0;font-size:14px;color:#6b7280}
</style></head><body>
<p id="status">下載教材中…</p>
<script type="module">
const KEY = "${keyHex}", SRC = "${src}", SIZE = ${enc.length};
const status = document.getElementById("status");
${FETCH_DECRYPT_JS}
try {
  const deck = new TextDecoder().decode(await fetchDecrypt(SRC, KEY, SIZE, status));
  // 與 staticrypt 相同：以 deck 取代整份文件
  document.open();
  document.write(deck);
  document.close();
} catch (err) {
  console.error(err);
  status.textContent = "教材載入失敗，請重新整理頁面再試一次。（" + (err && err.message ? err.message : err) + "）";
}
</script>
</body></html>`;
publish({ root, semester, out, ext: ".html.enc", html, enc, password });
console.log(`✓ public/slides/${semester}/${out}.html ＋ ${out}.html.enc（${basename(htmlPath)}，${(deck.length / 1e6).toFixed(1)} MB，已加密）`);
