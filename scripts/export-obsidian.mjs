#!/usr/bin/env node
// 單向匯出：網站內容集合 → Obsidian vault（唯讀鏡像，含雙向連結）。
// 用法：node scripts/export-obsidian.mjs
// vault 路徑可用環境變數覆蓋：OBSIDIAN_VAULT="/path" node scripts/export-obsidian.mjs
//
// 安全：只在「熱聲實驗室網站」子資料夾內動作，且該資料夾必須是本腳本產生
// （靠 .obsidian-export-generated marker 判斷），否則中止，絕不覆蓋你其他筆記。

import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

const REPO = process.cwd();
const CONTENT = join(REPO, "src/content");
const VAULT =
  process.env.OBSIDIAN_VAULT || "/Users/hsushuhanmacbookpro/Documents/Obsidian Vault";
const OUT = join(VAULT, "熱聲實驗室網站");
const MARKER = join(OUT, ".obsidian-export-generated");
const FOOTER = "\n\n---\n*本頁由網站自動產生（scripts/export-obsidian.mjs），請勿在此編輯——重跑會覆蓋。你的筆記請放在其他資料夾，用 `[[ ]]` 連過來即可。*\n";

// ---------- 極簡 frontmatter 解析（針對本 repo 的簡單 YAML）----------
function scalar(v) {
  v = String(v).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  )
    return v.slice(1, -1);
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}
function parseInlineArray(v) {
  const inner = v.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!inner) return [];
  return inner.split(",").map((s) => scalar(s));
}
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw.trim() };
  const data = {};
  let curKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const arr = line.match(/^\s+-\s*(.*)$/);
    if (arr && curKey) {
      (data[curKey] ||= []).push(scalar(arr[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (kv) {
      const key = kv[1];
      const val = kv[2];
      curKey = null;
      if (val === "") {
        curKey = key;
        data[key] = [];
      } else if (val.startsWith("[")) {
        data[key] = parseInlineArray(val);
      } else {
        data[key] = scalar(val);
      }
    }
  }
  return { data, body: m[2].trim() };
}

// ---------- 工具 ----------
function listMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      for (const sub of listMdx(p))
        out.push({ ...sub, slug: `${name}/${sub.slug}` });
    } else if (/\.mdx?$/.test(name)) {
      const slug = name.replace(/\.mdx?$/, "");
      out.push({ slug, path: p, ...parseFrontmatter(readFileSync(p, "utf8")) });
    }
  }
  return out;
}
const sanitize = (s) =>
  String(s)
    .replace(/[\\/:*?"<>|#^[\]]/g, "·")
    .replace(/\s+/g, " ")
    .trim();
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();
const yamlList = (arr) => `[${arr.map((s) => JSON.stringify(String(s))).join(", ")}]`;
const stripHtml = (s) => s.replace(/<img[^>]*>/gi, "").replace(/[ \t]+\n/g, "\n");

// ---------- 讀取集合 ----------
const pubs = listMdx(join(CONTENT, "publications"));
const members = listMdx(join(CONTENT, "members"));
const projects = listMdx(join(CONTENT, "projects"));
const news = listMdx(join(CONTENT, "news")).filter((n) => !/-en$/.test(n.slug));
const research = listMdx(join(CONTENT, "research")).filter((r) => !/-en$/.test(r.slug));

const pubBySlug = new Map(pubs.map((p) => [p.slug, p]));
// 姓名 → 成員（用於作者連結）
const memberByName = new Map();
for (const m of members) {
  if (m.data.name_en) memberByName.set(norm(m.data.name_en), m);
  if (m.data.name_zh) memberByName.set(norm(m.data.name_zh), m);
}
// 論文 slug → 資助計畫（反查 project.related_pubs）
const projectsOfPub = new Map();
for (const pr of projects)
  for (const slug of pr.data.related_pubs || [])
    (projectsOfPub.get(slug) || projectsOfPub.set(slug, []).get(slug)).push(pr);
// DOI → dataset 論文（供 data_doi 連結）
const datasetByDoi = new Map(
  pubs.filter((p) => p.data.type === "dataset" && p.data.doi).map((p) => [p.data.doi, p]),
);

// ---------- 連結器 ----------
const pubTitle = (p) => p.data.title_zh || p.data.title || p.slug;
const linkPub = (slug) => {
  const p = pubBySlug.get(slug);
  return p ? `[[${slug}|${pubTitle(p)} (${p.data.year})]]` : `[[${slug}]]`;
};
const memberFile = (m) => sanitize(m.data.name_zh || m.data.name_en);
const linkAuthor = (name) => {
  const m = memberByName.get(norm(name));
  if (!m) return name;
  const file = memberFile(m);
  return file === name ? `[[${file}]]` : `[[${file}|${name}]]`;
};
const projTitle = (pr) => pr.data.title_zh || pr.slug;
const linkProject = (pr) => `[[${pr.slug}|${projTitle(pr)}]]`;

// ---------- 安全建立輸出資料夾 ----------
if (existsSync(OUT)) {
  if (!existsSync(MARKER)) {
    console.error(
      `拒絕執行：「${OUT}」已存在但沒有本腳本的 marker 檔，為避免覆蓋你的筆記而中止。\n若確定要覆蓋，請先手動刪除該資料夾再重跑。`,
    );
    process.exit(1);
  }
  rmSync(OUT, { recursive: true, force: true });
}
mkdirSync(OUT, { recursive: true });
writeFileSync(MARKER, "generated by scripts/export-obsidian.mjs — do not edit\n");

const write = (sub, name, content) => {
  const dir = join(OUT, sub);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${sanitize(name)}.md`), content);
};

// ---------- 產生：論文 / 資料集 ----------
const typeZh = {
  journal: "期刊論文",
  conference: "研討會論文",
  thesis: "學位論文",
  preprint: "Preprint",
  dataset: "研究資料集",
};
let nPub = 0,
  nData = 0;
for (const p of pubs) {
  const d = p.data;
  const isData = d.type === "dataset";
  const fm = [
    "---",
    `type: ${isData ? "dataset" : "publication"}`,
    `pub_type: ${d.type || ""}`,
    d.year ? `year: ${d.year}` : "",
    d.venue ? `venue: ${JSON.stringify(d.venue)}` : "",
    d.doi ? `doi: ${JSON.stringify(d.doi)}` : "",
    d.ranking ? `ranking: ${JSON.stringify(d.ranking)}` : "",
    `aliases: ${yamlList([d.title].filter(Boolean))}`,
    `tags: [publication, ${d.type || "other"}]`,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const authors = (d.authors || []).map(linkAuthor).join("、");
  const lines = [fm, "", `# ${d.title || p.slug}`, ""];
  if (authors) lines.push(`**作者 Authors:** ${authors}`, "");
  const meta = [];
  if (d.venue) meta.push(`${d.venue}${d.year ? ` (${d.year})` : ""}`);
  if (d.venue_short) meta.push(d.venue_short);
  if (d.ranking) meta.push(d.ranking);
  if (d.impact_factor !== undefined) meta.push(`IF ${d.impact_factor}`);
  if (d.not_indexed) meta.push("not indexed");
  if (meta.length) lines.push(`**出處 Venue:** ${meta.join("  ·  ")}`, "");
  if (d.doi)
    lines.push(`**DOI:** [${d.doi}](https://doi.org/${d.doi})`, "");
  const funders = projectsOfPub.get(p.slug) || [];
  if (funders.length)
    lines.push(`**資助計畫 Funded by:** ${funders.map(linkProject).join("、")}`, "");
  if (d.data_doi && datasetByDoi.has(d.data_doi))
    lines.push(`**資料集 Dataset:** ${linkPub(datasetByDoi.get(d.data_doi).slug)}`, "");
  if (p.body) lines.push("", stripHtml(p.body));
  lines.push(FOOTER);
  write(isData ? "資料集" : "論文", p.slug, lines.join("\n"));
  isData ? nData++ : nPub++;
}

// ---------- 產生：成員 ----------
const roleZh = {
  pi: "指導老師",
  postdoc: "博士後",
  phd: "博士生",
  ms: "碩士生",
  undergrad: "大學部專題生",
  "research-assistant": "研究助理",
  exchange: "交換學生",
  alumni: "校友",
};
let nMember = 0;
for (const m of members) {
  const d = m.data;
  const fm = [
    "---",
    "type: member",
    `role: ${d.role || ""}`,
    d.name_en ? `aliases: ${yamlList([d.name_en])}` : "",
    `tags: [member, ${d.role || "member"}]`,
    "---",
  ]
    .filter(Boolean)
    .join("\n");
  const lines = [fm, "", `# ${d.name_zh || d.name_en}`, ""];
  if (d.name_en) lines.push(`*${d.name_en}*`, "");
  const info = [];
  if (d.role) info.push(`**身分:** ${roleZh[d.role] || d.role}`);
  if (d.graduated) info.push(`**畢業:** ${d.graduated}`);
  if (d.degree) info.push(`**學位:** ${d.degree}`);
  if (d.academic_year) info.push(`**學年度:** ${d.academic_year}`);
  if (info.length) lines.push(info.join("　|　"), "");
  const interests = d.interests || [];
  if (interests.length)
    lines.push(`**研究題目:** ${interests.join("；")}`, "");
  if (d.thesis) {
    lines.push(
      `**學位論文:** ${d.thesis_url ? `[${d.thesis}](${d.thesis_url})` : d.thesis}`,
      "",
    );
  }
  if (m.body) lines.push(stripHtml(m.body), "");
  const rp = d.related_pubs || [];
  if (rp.length) {
    lines.push("**相關論文 Publications:**");
    for (const slug of rp) lines.push(`- ${linkPub(slug)}`);
  }
  lines.push(FOOTER);
  const folder = d.role === "alumni" || m.slug.startsWith("alumni/") ? "成員/校友" : "成員/現任";
  write(folder, memberFile(m), lines.join("\n"));
  nMember++;
}

// ---------- 產生：計畫 ----------
let nProj = 0;
for (const pr of projects) {
  const d = pr.data;
  const fm = [
    "---",
    "type: project",
    d.funder ? `funder: ${JSON.stringify(d.funder)}` : "",
    d.category ? `category: ${d.category}` : "",
    d.budget_twd !== undefined ? `budget_twd: ${d.budget_twd}` : "",
    d.title_en ? `aliases: ${yamlList([d.title_en])}` : "",
    `tags: [project, ${d.category || "research"}]`,
    "---",
  ]
    .filter(Boolean)
    .join("\n");
  const lines = [fm, "", `# ${d.title_zh || pr.slug}`, ""];
  if (d.title_en) lines.push(`*${d.title_en}*`, "");
  const info = [];
  if (d.funder) info.push(`**補助單位:** ${d.funder}`);
  if (d.period_start) info.push(`**期間:** ${d.period_start} ~ ${d.period_end || ""}`);
  if (d.budget_twd !== undefined) info.push(`**經費:** NT$ ${d.budget_twd.toLocaleString()}K`);
  if (d.pi) info.push(`**主持人:** ${linkAuthor(d.pi)}`);
  if (info.length) lines.push(info.join("　|　"), "");
  if (d.summary) lines.push(d.summary, "");
  if (pr.body) lines.push(stripHtml(pr.body), "");
  const rp = d.related_pubs || [];
  if (rp.length) {
    lines.push("**研究產出 Output:**");
    for (const slug of rp) lines.push(`- ${linkPub(slug)}`);
  }
  // vault_notes：源頭 frontmatter 宣告的 vault 筆記，匯出時生成反向連結
  // （網站 schema 不含此欄位，Astro 會忽略；僅供 Obsidian 雙向整合用）
  const vn = d.vault_notes || [];
  if (vn.length) {
    lines.push("", "## 研究筆記");
    for (const n of vn) lines.push(`- [[${n}]]`);
  }
  lines.push(FOOTER);
  write("計畫", pr.slug, lines.join("\n"));
  nProj++;
}

// ---------- 產生：新聞 / 研究主題 ----------
let nNews = 0;
for (const n of news) {
  const d = n.data;
  const fm = [
    "---",
    "type: news",
    d.date ? `date: ${d.date}` : "",
    "tags: [news]",
    "---",
  ]
    .filter(Boolean)
    .join("\n");
  write(
    "新聞",
    n.slug,
    [fm, "", `# ${d.title || n.slug}`, d.date ? `*${d.date}*` : "", "", stripHtml(n.body), FOOTER].join("\n"),
  );
  nNews++;
}
let nResearch = 0;
for (const r of research) {
  const d = r.data;
  const fm = ["---", "type: research", "tags: [research]", d.title_en ? `aliases: ${yamlList([d.title_en])}` : "", "---"]
    .filter(Boolean)
    .join("\n");
  write(
    "研究主題",
    r.slug,
    [fm, "", `# ${d.title_zh || r.slug}`, d.title_en ? `*${d.title_en}*` : "", "", d.summary || "", "", stripHtml(r.body), FOOTER].join("\n"),
  );
  nResearch++;
}

// ---------- MOC 總目錄 ----------
const section = (title, items) =>
  [`## ${title}`, ...items, ""].join("\n");
const bySlug = (a, b) => b.slug.localeCompare(a.slug);
const moc = [
  "---",
  "type: moc",
  "tags: [moc]",
  "---",
  "",
  "# 熱聲實驗室網站 — 總目錄 (MOC)",
  "",
  "> 由網站自動產生的唯讀鏡像。你自己的筆記放別的資料夾，用 `[[ ]]` 連過來。重跑 `node scripts/export-obsidian.mjs` 即可更新。",
  "",
  section(
    `論文 Publications (${nPub})`,
    pubs.filter((p) => p.data.type !== "dataset").sort(bySlug).map((p) => `- ${linkPub(p.slug)}`),
  ),
  section(`研究資料集 Datasets (${nData})`, pubs.filter((p) => p.data.type === "dataset").map((p) => `- ${linkPub(p.slug)}`)),
  section(`計畫 Projects (${nProj})`, projects.sort(bySlug).map((pr) => `- ${linkProject(pr)}`)),
  section(
    `成員 Members (${nMember})`,
    members.map((m) => `- [[${memberFile(m)}]]${m.data.name_en ? ` — ${m.data.name_en}` : ""}`),
  ),
  section(`新聞 News (${nNews})`, news.sort(bySlug).map((n) => `- [[${sanitize(n.slug)}|${n.data.title || n.slug}]]`)),
  section(`研究主題 Research (${nResearch})`, research.map((r) => `- [[${sanitize(r.slug)}|${r.data.title_zh || r.slug}]]`)),
].join("\n");
writeFileSync(join(OUT, "MOC.md"), moc);

console.log(
  `匯出完成 → ${OUT}\n  論文 ${nPub}、資料集 ${nData}、計畫 ${nProj}、成員 ${nMember}、新聞 ${nNews}、研究主題 ${nResearch}`,
);
