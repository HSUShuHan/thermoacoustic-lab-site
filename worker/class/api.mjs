// 課堂互動系統 API（/api/class/*）。目前功能：學校 Google 登入、實驗作業選題、教師後台。
// 身分：學生以 學號@ntut.edu.tw 登入，學號比對 D1 名冊；教師 email 列在 TEACHER_EMAILS。
// Session：cookie 只放亂數 token，D1 存其 sha256；寫入請求另檢查 Origin（CSRF）。
import { CAPACITY, findTopic, paramFor, topicList } from "./topics.mjs";

const COOKIE = "cls";
const STATE_COOKIE = "cls_state";
const STUDENT_DAYS = 180;
const TEACHER_DAYS = 30;
const PASS = 60;
const DAY = 86400e3;

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
const fail = (status, code, message) => json({ error: code, message }, status);

function redirect(location, headers = {}) {
  return new Response(null, { status: 302, headers: { location, "cache-control": "no-store", ...headers } });
}

function cookies(request) {
  const out = {};
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setCookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function randomToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(text) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function decodeJwtPayload(jwt) {
  const p = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(p + "=".repeat((4 - (p.length % 4)) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

const teachers = (env) =>
  (env.TEACHER_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// 學校 Google 帳號可能是 學號@ntut.edu.tw 或 學號@mail.ntut.edu.tw，兩者都對應同一個學號。
const studentId = (email) => {
  const m = /^(\d{9})@(?:mail\.)?ntut\.edu\.tw$/.exec(email);
  return m ? m[1] : null;
};

async function log(env, actor, action, { course = null, sid = null, detail = null } = {}) {
  await env.CLASS_DB.prepare(
    "INSERT INTO events (at, course, sid, actor, action, detail) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(Date.now(), course, sid, actor, action, detail).run();
}

async function currentUser(request, env) {
  const token = cookies(request)[COOKIE];
  if (!token) return null;
  const row = await env.CLASS_DB.prepare(
    "SELECT email, role, expires_at FROM sessions WHERE token_hash = ?",
  ).bind(await sha256(token)).first();
  if (!row || row.expires_at < Date.now()) return null;
  return { email: row.email, role: row.role, sid: studentId(row.email) };
}

async function startSession(env, email, role, request) {
  const token = randomToken();
  const days = role === "teacher" ? TEACHER_DAYS : STUDENT_DAYS;
  const now = Date.now();
  await env.CLASS_DB.prepare(
    "INSERT INTO sessions (token_hash, email, role, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(await sha256(token), email, role, now, now + days * DAY, (request.headers.get("user-agent") ?? "").slice(0, 300)).run();
  return setCookie(COOKIE, token, days * 86400);
}

function safeNext(next) {
  return typeof next === "string" && /^\/class(\/[\w\-./]*)?(\?[\w=&%-]*)?$/.test(next) ? next : "/class/";
}

// ---------- 登入 ----------

async function login(request, env, url) {
  const next = safeNext(url.searchParams.get("next"));
  if (env.DEV_LOGIN === "1" && url.searchParams.get("dev")) {
    return finishLogin(request, env, url.searchParams.get("dev").toLowerCase(), next);
  }
  if (!env.GOOGLE_CLIENT_ID) return redirect("/class/?err=not-configured");
  const state = randomToken();
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/api/class/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`, {
    "set-cookie": setCookie(STATE_COOKIE, `${state}|${next}`, 600),
  });
}

async function callback(request, env, url) {
  const [state, next] = (cookies(request)[STATE_COOKIE] ?? "").split("|");
  if (!state || state !== url.searchParams.get("state")) return redirect("/class/?err=state");
  if (url.searchParams.get("error")) return redirect("/class/?err=cancelled");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: url.searchParams.get("code") ?? "",
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/class/auth/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return redirect("/class/?err=google");
  // id_token 直接由 Google token 端點經 TLS 取得，依 Google 文件可不另驗簽，只檢查欄位。
  const claims = decodeJwtPayload((await res.json()).id_token);
  const okIss = claims.iss === "accounts.google.com" || claims.iss === "https://accounts.google.com";
  if (!okIss || claims.aud !== env.GOOGLE_CLIENT_ID || claims.exp * 1000 < Date.now() || !claims.email_verified) {
    return redirect("/class/?err=google");
  }
  return finishLogin(request, env, String(claims.email).toLowerCase(), safeNext(next));
}

async function finishLogin(request, env, email, next) {
  const clear = setCookie(STATE_COOKIE, "", 0);
  const go = (location, ...setCookies) => {
    const headers = new Headers({ location, "cache-control": "no-store" });
    for (const c of setCookies) headers.append("set-cookie", c);
    return new Response(null, { status: 302, headers });
  };
  if (teachers(env).includes(email)) {
    const c = await startSession(env, email, "teacher", request);
    await log(env, email, "login", { detail: "teacher" });
    return go(next === "/class/" ? "/class/admin.html" : next, c, clear);
  }
  const sid = studentId(email);
  const enrolled = sid
    ? await env.CLASS_DB.prepare("SELECT 1 FROM roster WHERE sid = ? AND status = 'active' LIMIT 1").bind(sid).first()
    : null;
  if (!enrolled) {
    await log(env, email, "login-denied", { sid });
    return redirect(`/class/?err=${sid ? "not-enrolled" : "not-school"}&email=${encodeURIComponent(email)}`, { "set-cookie": clear });
  }
  const c = await startSession(env, email, "student", request);
  await log(env, email, "login", { sid, detail: (request.headers.get("user-agent") ?? "").slice(0, 120) });
  return go(next, c, clear);
}

async function logout(request, env) {
  const token = cookies(request)[COOKIE];
  if (token) await env.CLASS_DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "set-cookie": setCookie(COOKIE, "", 0) });
}

// ---------- 選題 ----------

function phaseOf(course, now = Date.now()) {
  if (!course.phase1_at || now < course.phase1_at) return "notyet";
  if (course.phase2_at && now < course.phase2_at) return "phase1";
  if (course.select_end && now >= course.select_end) return "closed";
  return "phase2";
}

const failing = (r) => r.midterm === null || r.midterm < PASS;

function canSelect(course, rosterRow) {
  const phase = phaseOf(course);
  if (phase === "phase2") return true;
  if (phase === "phase1") return failing(rosterRow);
  return false;
}

async function counts(env, course) {
  const { results } = await env.CLASS_DB.prepare(
    "SELECT topic, COUNT(*) AS n FROM registrations WHERE course = ? GROUP BY topic",
  ).bind(course).all();
  return Object.fromEntries(results.map((r) => [r.topic, r.n]));
}

async function me(env, user) {
  if (user.role === "teacher") return json({ email: user.email, role: "teacher" });
  const { results: rows } = await env.CLASS_DB.prepare(
    `SELECT r.*, c.name AS course_name, c.semester, c.lab_url, c.phase1_at, c.phase2_at, c.select_end, c.deadline_at,
            g.topic AS my_topic
       FROM roster r JOIN courses c ON c.slug = r.course
       LEFT JOIN registrations g ON g.course = r.course AND g.sid = r.sid
      WHERE r.sid = ? AND r.status = 'active' ORDER BY r.course`,
  ).bind(user.sid).all();
  const courses = [];
  for (const r of rows) {
    const course = { slug: r.course, phase1_at: r.phase1_at, phase2_at: r.phase2_at, select_end: r.select_end };
    const taken = await counts(env, r.course);
    const mine = r.my_topic ? findTopic(r.course, r.my_topic) : null;
    courses.push({
      slug: r.course,
      name: r.course_name,
      semester: r.semester,
      labUrl: r.lab_url,
      schedule: { phase1: r.phase1_at, phase2: r.phase2_at, selectEnd: r.select_end, deadline: r.deadline_at },
      phase: phaseOf(course),
      priority: failing(r),
      canSelect: canSelect(course, r),
      mine: mine ? { id: mine.id, title: mine.title, gear: mine.gear, param: paramFor(mine, r.sid) } : null,
      topics: topicList(r.course).map((t) => ({
        id: t.id, title: t.title, gear: t.gear, group: t.group,
        taken: taken[t.id] ?? 0, capacity: CAPACITY,
        preview: paramFor(t, r.sid).text,
      })),
    });
  }
  return json({ email: user.email, role: "student", sid: user.sid, name: rows[0]?.name ?? null, courses });
}

async function rosterRow(env, course, sid) {
  return env.CLASS_DB.prepare(
    `SELECT r.*, c.phase1_at, c.phase2_at, c.select_end FROM roster r JOIN courses c ON c.slug = r.course
      WHERE r.course = ? AND r.sid = ? AND r.status = 'active'`,
  ).bind(course, sid).first();
}

async function select(env, user, body) {
  const { course, topic } = body ?? {};
  const r = await rosterRow(env, course, user.sid);
  if (!r) return fail(403, "not-enrolled", "你不在這門課的名單中。");
  if (!findTopic(course, topic)) return fail(400, "bad-topic", "沒有這個題目。");
  if (!canSelect(r, r)) {
    const phase = phaseOf(r);
    const msg = phase === "phase1" ? "第一階段只開放期中考不及格的同學選題，請等第二階段。"
      : phase === "notyet" ? "選題尚未開放。" : "選題已截止，要換題請聯絡老師。";
    return fail(403, "closed", msg);
  }
  const now = Date.now();
  const existing = await env.CLASS_DB.prepare("SELECT topic FROM registrations WHERE course = ? AND sid = ?").bind(course, user.sid).first();
  if (existing?.topic === topic) return json({ ok: true });
  // 名額檢查與寫入在同一個 SQL 陳述式內完成，D1 依序執行，不會超收。
  const full = `(SELECT COUNT(*) FROM registrations WHERE course = ? AND topic = ?) < ${CAPACITY}`;
  const res = existing
    ? await env.CLASS_DB.prepare(`UPDATE registrations SET topic = ?, updated_at = ? WHERE course = ? AND sid = ? AND ${full}`)
        .bind(topic, now, course, user.sid, course, topic).run()
    : await env.CLASS_DB.prepare(`INSERT INTO registrations (course, sid, topic, created_at, updated_at) SELECT ?, ?, ?, ?, ? WHERE ${full}`)
        .bind(course, user.sid, topic, now, now, course, topic).run();
  if (!res.meta.changes) return fail(409, "full", "這題剛好額滿了，請換一題。");
  await log(env, user.email, existing ? "switch" : "select", { course, sid: user.sid, detail: existing ? `${existing.topic} → ${topic}` : topic });
  return json({ ok: true });
}

async function cancel(env, user, body) {
  const { course } = body ?? {};
  const r = await rosterRow(env, course, user.sid);
  if (!r) return fail(403, "not-enrolled", "你不在這門課的名單中。");
  const phase = phaseOf(r);
  if (phase === "notyet" || phase === "closed") return fail(403, "closed", "目前不能取消，請聯絡老師。");
  const old = await env.CLASS_DB.prepare("SELECT topic FROM registrations WHERE course = ? AND sid = ?").bind(course, user.sid).first();
  if (!old) return json({ ok: true });
  await env.CLASS_DB.prepare("DELETE FROM registrations WHERE course = ? AND sid = ?").bind(course, user.sid).run();
  await log(env, user.email, "cancel", { course, sid: user.sid, detail: old.topic });
  return json({ ok: true });
}

// ---------- 教師後台 ----------

async function overview(env, url) {
  const course = url.searchParams.get("course");
  const c = await env.CLASS_DB.prepare("SELECT * FROM courses WHERE slug = ?").bind(course).first();
  if (!c) return fail(404, "no-course", "沒有這門課。");
  const { results: roster } = await env.CLASS_DB.prepare(
    `SELECT r.sid, r.name, r.klass, r.midterm, r.status, g.topic, g.updated_at,
            (SELECT MAX(at) FROM events e WHERE e.sid = r.sid AND e.action = 'login') AS last_login
       FROM roster r LEFT JOIN registrations g ON g.course = r.course AND g.sid = r.sid
      WHERE r.course = ? ORDER BY r.sid`,
  ).bind(course).all();
  const { results: events } = await env.CLASS_DB.prepare(
    "SELECT at, sid, actor, action, detail FROM events WHERE course = ? OR (course IS NULL AND sid IN (SELECT sid FROM roster WHERE course = ?)) ORDER BY at DESC LIMIT 300",
  ).bind(course, course).all();
  return json({
    course: c,
    phase: phaseOf(c),
    pass: PASS,
    capacity: CAPACITY,
    topics: topicList(course).map(({ id, title, gear, group }) => ({ id, title, gear, group })),
    roster: roster.map((r) => {
      const t = r.topic ? findTopic(course, r.topic) : null;
      return { ...r, param: t ? paramFor(t, r.sid).text : null };
    }),
    events,
  });
}

async function saveSchedule(env, user, body) {
  const { course } = body ?? {};
  const fields = ["phase1_at", "phase2_at", "select_end", "deadline_at"];
  const vals = fields.map((f) => (body[f] === null || body[f] === "" ? null : Number(body[f])));
  if (vals.some((v) => v !== null && !Number.isFinite(v))) return fail(400, "bad-time", "時間格式錯誤。");
  const res = await env.CLASS_DB.prepare(
    `UPDATE courses SET ${fields.map((f) => `${f} = ?`).join(", ")} WHERE slug = ?`,
  ).bind(...vals, course).run();
  if (!res.meta.changes) return fail(404, "no-course", "沒有這門課。");
  await log(env, user.email, "admin-schedule", { course, detail: JSON.stringify(Object.fromEntries(fields.map((f, i) => [f, vals[i]]))) });
  return json({ ok: true });
}

async function assign(env, user, body) {
  const { course, sid, topic } = body ?? {};
  const r = await env.CLASS_DB.prepare("SELECT 1 FROM roster WHERE course = ? AND sid = ?").bind(course, sid).first();
  if (!r) return fail(404, "no-student", "名單中沒有這位同學。");
  const now = Date.now();
  if (!topic) {
    await env.CLASS_DB.prepare("DELETE FROM registrations WHERE course = ? AND sid = ?").bind(course, sid).run();
  } else {
    if (!findTopic(course, topic)) return fail(400, "bad-topic", "沒有這個題目。");
    // 教師指定可超過名額（例如同學無法登入時代為登記），前端會先提醒。
    await env.CLASS_DB.prepare(
      `INSERT INTO registrations (course, sid, topic, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (course, sid) DO UPDATE SET topic = excluded.topic, updated_at = excluded.updated_at`,
    ).bind(course, sid, topic, now, now).run();
  }
  await log(env, user.email, "admin-assign", { course, sid, detail: topic ?? "(移除)" });
  return json({ ok: true });
}

async function exportCsv(env, url) {
  const course = url.searchParams.get("course");
  const { results } = await env.CLASS_DB.prepare(
    `SELECT r.sid, r.name, r.klass, r.midterm, r.status, g.topic, g.updated_at FROM roster r
       LEFT JOIN registrations g ON g.course = r.course AND g.sid = r.sid WHERE r.course = ? ORDER BY g.topic, r.sid`,
  ).bind(course).all();
  const esc = (v) => (v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const fmt = (ms) => (ms ? new Date(ms + 8 * 3600e3).toISOString().slice(0, 16).replace("T", " ") : "");
  const lines = [["學號", "姓名", "班級", "期中", "狀態", "題號", "題目", "指定參數", "登記時間"].join(",")];
  for (const r of results) {
    const t = r.topic ? findTopic(course, r.topic) : null;
    lines.push([r.sid, r.name, r.klass, r.midterm ?? "缺考", r.status === "active" ? "" : "撤選", r.topic, t?.title, t ? paramFor(t, r.sid).text : "", fmt(r.updated_at)].map(esc).join(","));
  }
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="lab-${course}.csv"`,
      "cache-control": "no-store",
    },
  });
}

// ---------- 路由 ----------

export async function handleClassApi(request, env, url) {
  const path = url.pathname.slice("/api/class".length);
  const method = request.method;

  if (path === "/auth/login" && method === "GET") return login(request, env, url);
  if (path === "/auth/callback" && method === "GET") return callback(request, env, url);

  if (method === "POST" && request.headers.get("origin") !== url.origin) return fail(403, "origin", "來源不符。");

  const user = await currentUser(request, env);
  if (path === "/auth/logout" && method === "POST") return logout(request, env);
  if (!user) return fail(401, "login", "請先登入。");

  const body = method === "POST" ? await request.json().catch(() => null) : null;
  if (path === "/me" && method === "GET") return me(env, user);
  if (user.role === "student") {
    if (path === "/lab/select" && method === "POST") return select(env, user, body);
    if (path === "/lab/cancel" && method === "POST") return cancel(env, user, body);
  }
  if (user.role === "teacher") {
    if (path === "/admin/overview" && method === "GET") return overview(env, url);
    if (path === "/admin/schedule" && method === "POST") return saveSchedule(env, user, body);
    if (path === "/admin/assign" && method === "POST") return assign(env, user, body);
    if (path === "/admin/export.csv" && method === "GET") return exportCsv(env, url);
  }
  return fail(404, "not-found", "找不到這個功能。");
}
