#!/usr/bin/env node
// Quick-and-dirty WXR (WordPress eXtended RSS) parser.
// Usage: node scripts/parse-wxr.mjs _legacy/wp-export.xml _legacy/parsed/
// Writes one .json per item plus an index.json summary.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const [, , inputPath, outputDir = "_legacy/parsed"] = process.argv;
if (!inputPath) {
  console.error("Usage: parse-wxr.mjs <input.xml> [outputDir]");
  process.exit(1);
}

const xml = readFileSync(inputPath, "utf-8");

// Extract <item>...</item> blocks
const items = [];
const itemRe = /<item>([\s\S]*?)<\/item>/g;
let m;
while ((m = itemRe.exec(xml))) items.push(m[1]);

const cdata = (s) =>
  s ? s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "") : s;

const tag = (block, name) => {
  const r = new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`);
  const found = block.match(r);
  return found ? cdata(found[1].trim()) : "";
};

const all = (block, name) => {
  const r = new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, "g");
  const out = [];
  let mm;
  while ((mm = r.exec(block))) out.push(cdata(mm[1].trim()));
  return out;
};

const slugify = (s) =>
  s
    .replace(/[\/<>:"|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 80) || "untitled";

if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const index = [];
for (let i = 0; i < items.length; i++) {
  const it = items[i];
  const post_type = tag(it, "wp:post_type");
  const status = tag(it, "wp:status");
  const title = tag(it, "title");
  const post_id = tag(it, "wp:post_id");
  const post_name = tag(it, "wp:post_name");
  const post_date = tag(it, "wp:post_date");
  const link = tag(it, "link");
  const content = tag(it, "content:encoded");
  const excerpt = tag(it, "excerpt:encoded");
  const categories = all(it, "category");
  const attachment_url = tag(it, "wp:attachment_url");
  const post_parent = tag(it, "wp:post_parent");
  const menu_order = tag(it, "wp:menu_order");

  const record = {
    post_id,
    post_type,
    status,
    title,
    post_name,
    post_date,
    link,
    post_parent,
    menu_order,
    categories,
    attachment_url,
    excerpt,
    content,
  };

  const fname = `${String(i).padStart(3, "0")}_${post_type || "unknown"}_${slugify(title || post_name || post_id)}.json`;
  writeFileSync(join(outputDir, fname), JSON.stringify(record, null, 2));
  index.push({
    file: fname,
    post_id,
    post_type,
    status,
    title,
    post_date,
    has_content: content.length > 0,
    content_chars: content.length,
  });
}

writeFileSync(join(outputDir, "_index.json"), JSON.stringify(index, null, 2));

// Pretty summary
console.log(`Parsed ${items.length} items → ${outputDir}/`);
const byType = {};
for (const r of index) {
  byType[r.post_type] = (byType[r.post_type] || 0) + 1;
}
console.log("By type:", byType);
console.log("\nPages with content:");
for (const r of index.filter((x) => x.post_type === "page" || x.post_type === "post")) {
  console.log(
    `  [${r.status.padEnd(7)}] ${r.post_type.padEnd(6)} ${String(r.content_chars).padStart(6)}c  ${r.title}`,
  );
}
