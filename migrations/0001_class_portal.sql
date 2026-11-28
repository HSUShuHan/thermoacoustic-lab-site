-- 課堂互動系統：課程設定、名冊、實驗作業選題、登入 session、操作紀錄。

CREATE TABLE courses (
  slug        TEXT PRIMARY KEY,          -- dynamics / thermodynamics
  name        TEXT NOT NULL,
  semester    TEXT NOT NULL,
  klass       TEXT NOT NULL,
  lab_url     TEXT,                      -- 實驗作業說明頁
  phase1_at   INTEGER,                   -- 第一階段開放（期中不及格者），ms epoch
  phase2_at   INTEGER,                   -- 第二階段開放（全班）
  select_end  INTEGER,                   -- 選題／換題截止
  deadline_at INTEGER                    -- 繳交截止
);

CREATE TABLE roster (
  course   TEXT NOT NULL REFERENCES courses(slug),
  sid      TEXT NOT NULL,                -- 學號；學校信箱 = sid@ntut.edu.tw
  name     TEXT NOT NULL,
  klass    TEXT NOT NULL,
  midterm  REAL,                         -- 調整後期中成績；NULL = 缺考（視同不及格）
  status   TEXT NOT NULL DEFAULT 'active', -- active / withdrawn
  PRIMARY KEY (course, sid)
);

CREATE TABLE registrations (
  course     TEXT NOT NULL,
  sid        TEXT NOT NULL,
  topic      TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (course, sid)              -- 每人一題
);
CREATE INDEX registrations_topic ON registrations (course, topic);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,           -- sha256(cookie)，cookie 本身不落地
  email      TEXT NOT NULL,
  role       TEXT NOT NULL,              -- student / teacher
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT
);
CREATE INDEX sessions_email ON sessions (email);

CREATE TABLE events (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  at     INTEGER NOT NULL,
  course TEXT,
  sid    TEXT,
  actor  TEXT NOT NULL,                  -- 操作者 email
  action TEXT NOT NULL,                  -- login / select / switch / cancel / admin-assign …
  detail TEXT
);
CREATE INDEX events_course ON events (course, at);
