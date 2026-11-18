// protect-pdf.mjs／protect-html.mjs 共用：教材本體加密成獨立檔（AES-256-GCM），
// 密碼頁只是一張 staticrypt 小頁，內含該檔的隨機金鑰，解開後再抓本體來解密。
// 本體不內嵌於密碼頁的原因：staticrypt 以 hex 存放密文，內嵌時單頁達 16–24 MB，
// iPad 上的 Chrome 解不開（2026-11）。
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";

export const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// 回傳加密檔內容（12 bytes IV ‖ 密文 ‖ tag）、金鑰與內容指紋
export function encryptPayload(buf) {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([iv, cipher.update(buf), cipher.final(), cipher.getAuthTag()]);
  return { enc, keyHex: key.toString("hex"), hash: createHash("sha256").update(enc).digest("hex").slice(0, 8) };
}

// 嵌進小頁的瀏覽器端程式：下載加密檔（邊下載邊更新進度文字）並解密，回傳 ArrayBuffer
export const FETCH_DECRYPT_JS = `
async function fetchDecrypt(src, keyHex, size, status) {
  const res = await fetch(src);
  if (!res.ok) throw new Error("HTTP " + res.status);
  let enc;
  if (res.body && res.body.getReader) {
    const reader = res.body.getReader(), chunks = [];
    let got = 0;
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      chunks.push(r.value);
      got += r.value.length;
      status.textContent = "下載教材中… " + Math.min(99, Math.round((got / size) * 100)) + "%";
    }
    enc = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { enc.set(c, o); o += c.length; }
  } else {
    enc = new Uint8Array(await res.arrayBuffer());
  }
  status.textContent = "解密中…";
  const raw = new Uint8Array(keyHex.match(/../g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: enc.subarray(0, 12) }, key, enc.subarray(12));
}
`;

// 寫出 public/slides/<學期>/<out>.html（staticrypt 小頁）與 <out><ext>（加密本體）。
// 回傳本體的網址；?v= 讓重新上架（換金鑰）後不會配到快取裡的舊加密檔。
export function payloadUrl({ semester, out, ext, hash }) {
  return `/slides/${semester}/${out}${ext}?v=${hash}`;
}
export function publish({ root, semester, out, ext, html, enc, password }) {
  const tmpDir = resolve(root, ".protect-tmp");
  mkdirSync(tmpDir, { recursive: true });
  const tmp = resolve(tmpDir, `${out}.html`);
  writeFileSync(tmp, html);
  const outDir = resolve(root, `public/slides/${semester}`);
  mkdirSync(outDir, { recursive: true });
  try {
    execFileSync("npx", ["-y", "staticrypt", tmp, "-p", password, "-d", outDir, "--short",
      "--remember", "180", "--template-title", "熱聲實驗室 課程教材", "--template-instructions", "請輸入課程密碼"],
      { stdio: "inherit", cwd: root });
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
  writeFileSync(resolve(outDir, `${out}${ext}`), enc);
}
