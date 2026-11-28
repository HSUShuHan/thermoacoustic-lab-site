// 課堂互動系統名冊匯入：學校點名單 CSV（Big5）＋期中成績表 → D1。
// 名冊與成績只進 D1，不進 repo；產生的 SQL 寫到 repo 外的暫存檔再交給 wrangler 執行。
//
//   node scripts/class-roster.mjs --course dynamics --roster <點名單.csv> --scores <成績總表.csv> \
//        [--score-col 總分] [--remote] [--dry-run]
//
// 點名單：第 5 行起為「班級,學號,姓名,英文姓名,成績或記錄」，英文姓名含逗號，
//         因此撤選以「整行含 撤選」判定，學號／姓名取前三欄。
// 成績表：UTF-8（可含 BOM），需有「學號」與分數欄（預設「總分」）；空白＝缺考，視同不及格。
// 課程列（courses）不存在時以 COURSES 的預設時程建立；已存在則不動時程（教師後台可改）。
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tw = (s) => Date.parse(`${s}+08:00`);
const COURSES = {
  dynamics: { name: "動力學", klass: "機械二甲", lab: "/slides/115-1/dynamics-lab.html" },
  thermodynamics: { name: "熱力學", klass: "機械二乙", lab: "/slides/115-1/thermo-lab.html" },
};
const SCHEDULE = {
  semester: "115-1",
  phase1_at: tw("2026-11-30T00:00:00"),
  phase2_at: tw("2026-12-07T00:00:00"),
  select_end: tw("2027-01-11T23:59:59"),
  deadline_at: tw("2027-01-11T23:59:59"),
};

const args = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (k) => args.includes(`--${k}`);

const course = opt("course");
if (!COURSES[course]) throw new Error(`--course 必須是 ${Object.keys(COURSES).join(" / ")}`);
const rosterPath = opt("roster");
const scoresPath = opt("scores");
const scoreCol = opt("score-col", "總分");
if (!rosterPath || !scoresPath) throw new Error("需要 --roster 與 --scores");

function parseCsvLine(line) {
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const rosterText = new TextDecoder("big5").decode(readFileSync(rosterPath));
const students = [];
for (const line of rosterText.split(/\r?\n/)) {
  const [klass, sid, name] = parseCsvLine(line);
  if (!/^\d{9}$/.test(sid ?? "")) continue;
  students.push({ sid, name: name.trim(), klass: klass.trim(), withdrawn: line.includes("撤選") });
}

const scoreLines = readFileSync(scoresPath, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(scoreLines[0]);
const iSid = header.indexOf("學號"), iScore = header.indexOf(scoreCol);
if (iSid < 0 || iScore < 0) throw new Error(`成績表缺少「學號」或「${scoreCol}」欄`);
const scores = new Map();
for (const line of scoreLines.slice(1)) {
  const cells = parseCsvLine(line);
  const v = cells[iScore]?.trim();
  scores.set(cells[iSid]?.trim(), v === "" || v === undefined ? null : Number(v));
}

const sq = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const c = COURSES[course];
const sql = [
  `INSERT INTO courses (slug, name, semester, klass, lab_url, phase1_at, phase2_at, select_end, deadline_at) VALUES (` +
    [course, c.name, SCHEDULE.semester, c.klass, c.lab, SCHEDULE.phase1_at, SCHEDULE.phase2_at, SCHEDULE.select_end, SCHEDULE.deadline_at].map(sq).join(", ") +
    `) ON CONFLICT (slug) DO UPDATE SET name = excluded.name, klass = excluded.klass, lab_url = excluded.lab_url;`,
];
for (const s of students) {
  const m = scores.has(s.sid) ? scores.get(s.sid) : null;
  sql.push(
    `INSERT INTO roster (course, sid, name, klass, midterm, status) VALUES (${[course, s.sid, s.name, s.klass, m, s.withdrawn ? "withdrawn" : "active"].map(sq).join(", ")}) ` +
      `ON CONFLICT (course, sid) DO UPDATE SET name = excluded.name, klass = excluded.klass, midterm = excluded.midterm, status = excluded.status;`,
  );
}

const active = students.filter((s) => !s.withdrawn);
const fails = active.filter((s) => { const m = scores.get(s.sid); return m === null || m === undefined || m < 60; });
const missing = active.filter((s) => !scores.has(s.sid));
console.log(`${c.name}：名單 ${students.length} 人，撤選 ${students.length - active.length}，在學 ${active.length}`);
console.log(`  第一階段可選（期中 < 60 或缺考）：${fails.length} 人；可直接等第二階段：${active.length - fails.length} 人`);
if (missing.length) console.log(`  成績表找不到（視同缺考）：${missing.map((s) => `${s.sid} ${s.name}`).join("、")}`);
const extra = [...scores.keys()].filter((k) => /^\d{9}$/.test(k ?? "") && !students.some((s) => s.sid === k));
if (extra.length) console.log(`  成績表有、點名單沒有（不匯入）：${extra.join("、")}`);

const dir = mkdtempSync(join(tmpdir(), "class-roster-"));
const file = join(dir, `${course}.sql`);
writeFileSync(file, sql.join("\n") + "\n");
if (flag("dry-run")) {
  console.log(`  dry-run：SQL 在 ${file}`);
} else {
  try {
    execFileSync("npx", ["wrangler", "d1", "execute", "thermoacoustic-class", flag("remote") ? "--remote" : "--local", "--file", file], { stdio: "inherit" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
