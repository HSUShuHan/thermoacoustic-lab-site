# 熱聲實驗室網站重構規劃（Astro 版）

> 目標：把 thermoacoustictw.org 從 WordPress 遷移到 Astro 靜態站，內容以 markdown / MDX 為主，git 版控、Cloudflare Pages 自動部署，Claude Code 為主要協作介面。

---

## 1. 現況盤點

從現行站擷取出的資訊架構：

- **首頁**
- **研究內容** —— 熱聲引擎原理、研究主題、參考文獻
- **成員一覽** —— PI 許書涵助理教授（地址：10608 台北市忠孝東路三段 1 號綜合科館 614-2A）
- **近期計劃** —— 目前主軸：使用濕蓄熱器與液柱之行波型熱聲引擎（低溫廢熱 230℃ 以下）
- **學術發表** —— 主要為中華民國燃燒學會、機械工程學會年會論文
- **公告**

新版要新增的：
- **教學** —— 課程資訊 + 教材 PDF 下載
- **軟體** —— 求解器、工具下載（連到獨立 GitHub repo + Releases）
- **加入我們 / 新生須知**
- **校友 (Alumni)**

---

## 2. 新版資訊架構

主導覽（top nav，初版）：

```
Home  |  Research  |  Publications  |  People  |  Join Us  |  News  |  Contact
首頁     研究         發表             成員        加入我們      近況     聯絡
```

> Teaching（教學）與 Software（求解器下載）已規劃但**初版不上線**，schema 與 routing 預留好，未來開始累積內容時直接補進去即可。詳見 §11。

雙語策略建議：**中英並列以中文為主**。在 Astro 用 i18n routing：

- `/` → 中文（預設）
- `/en/` → 英文（漸進式翻譯，先翻 Home / Research / People / Join Us）

短期不必為了雙語延後上線，可以先做中文版，英文路由架構先留好。

---

## 3. 檔案結構

```
thermoacoustic-lab-site/
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── CLAUDE.md                       # 給 Claude Code 的工作指南
├── README.md
│
├── public/                         # 靜態資產，URL 直連
│   ├── favicon.svg
│   ├── images/
│   │   ├── logo.svg
│   │   ├── members/                # 成員照片
│   │   ├── research/               # 實驗裝置、結果圖
│   │   └── home/                   # 首頁 hero 用圖
│   ├── papers/                     # 論文作者保留版 PDF
│   │   └── 2024-bujunyun-wet-stack.pdf
│   ├── cv/
│   │   └── cv-shu-han-hsu.pdf
│   └── posters/                    # 研討會海報
│   #
│   # ── 以下為未來擴充，初版不建立 ──
│   # teaching/                     # 課程教材 PDF
│   # downloads/                    # 其他可下載檔案
│
├── src/
│   ├── content/
│   │   ├── config.ts               # Content Collections schema 定義
│   │   ├── publications/           # 每篇論文一個 .mdx
│   │   │   ├── 2020-li-stable-amplitude.mdx
│   │   │   └── 2024-bujunyun-wet-stack.mdx
│   │   ├── members/
│   │   │   ├── current/
│   │   │   │   ├── shu-han-hsu.mdx     # PI
│   │   │   │   ├── student-a.mdx
│   │   │   │   └── student-b.mdx
│   │   │   └── alumni/
│   │   │       └── alumni-a.mdx
│   │   ├── research/               # 研究主題（每個一頁深入介紹）
│   │   │   ├── wet-thermoacoustic-engine.mdx
│   │   │   ├── nonlinear-dynamics.mdx
│   │   │   └── stack-acoustic-impedance.mdx
│   │   ├── projects/               # 計畫（NSTC / 國科會等）
│   │   │   └── 2023-wet-stack-traveling-wave.mdx
│   │   └── news/
│   │       └── 2024-11-conference-recap.mdx
│   │   #
│   │   # ── 以下 collections 已定義 schema 但初版不建立內容 ──
│   │   # courses/                  # 課程
│   │   # software/                 # 求解器
│   │
│   ├── pages/
│   │   ├── index.astro             # 首頁
│   │   ├── research/
│   │   │   ├── index.astro         # 研究主題列表
│   │   │   └── [...slug].astro     # 個別主題頁
│   │   ├── publications/
│   │   │   ├── index.astro         # 論文列表（依年份分組）
│   │   │   └── [...slug].astro
│   │   ├── people/
│   │   │   └── index.astro         # PI + 在學成員 + 校友
│   │   ├── join-us.astro           # 新生加入須知 ⭐
│   │   ├── news/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   └── contact.astro
│   │   #
│   │   # ── 未來擴充頁面（初版不建立）──
│   │   # teaching/                 # 課程
│   │   # software/                 # 求解器下載
│   │
│   ├── components/
│   │   ├── nav/
│   │   │   ├── Header.astro
│   │   │   ├── Footer.astro
│   │   │   └── LangSwitcher.astro
│   │   ├── cards/
│   │   │   ├── PublicationCard.astro
│   │   │   ├── MemberCard.astro
│   │   │   ├── ResearchCard.astro
│   │   │   └── NewsCard.astro
│   │   ├── Prose.astro              # MDX 內文 wrapper（控制 typography）
│   │   ├── Bibtex.astro             # 顯示 + 複製 BibTeX
│   │   └── DownloadButton.astro
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro         # html + meta + nav + footer
│   │   ├── PageLayout.astro         # 一般內容頁
│   │   └── EntryLayout.astro        # 個別 collection entry 用
│   │
│   ├── lib/
│   │   ├── publications.ts          # 論文排序、分組、BibTeX 產生
│   │   ├── bib.ts                   # 解析 .bib 檔（如果改用 BibTeX 為單一資料源）
│   │   └── i18n.ts
│   │
│   └── styles/
│       └── global.css
│
└── scripts/
    └── import-bibtex.ts             # 從 publications.bib 自動產生 mdx
```

---

## 4. Content Collections Schema

`src/content/config.ts`，定義每種 collection 的 frontmatter 規則。schema 對 Claude Code 特別重要——它會根據這個自動填出符合格式的 frontmatter。

> **註**：以下 `courses` 與 `software` 兩個 collection 是為未來擴充預留，schema 先定義好放著，初版不需建立任何 mdx 內容。未來要啟用時，建內容資料夾 + 加 page route 即可，schema 已 ready。

```typescript
import { defineCollection, z } from "astro:content";

const publications = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    title_zh: z.string().optional(),
    authors: z.array(z.string()),         // 例：["李彥廷", "許書涵"]
    venue: z.string(),                    // 期刊或會議名
    venue_short: z.string().optional(),   // JSV / PRE / JASA…
    year: z.number(),
    type: z.enum(["journal", "conference", "thesis", "preprint"]),
    doi: z.string().optional(),
    url: z.string().url().optional(),
    pdf: z.string().optional(),           // /papers/xxx.pdf
    bibtex: z.string().optional(),        // 直接內嵌 BibTeX
    abstract: z.string().optional(),
    featured: z.boolean().default(false), // 首頁要不要 highlight
    tags: z.array(z.string()).default([]),
  }),
});

const members = defineCollection({
  type: "content",
  schema: z.object({
    name_zh: z.string(),
    name_en: z.string(),
    role: z.enum([
      "pi",
      "postdoc",
      "phd",
      "ms",
      "undergrad",
      "research-assistant",
      "alumni",
    ]),
    email: z.string().email().optional(),
    photo: z.string().optional(),         // /images/members/xxx.jpg
    affiliation: z.string().optional(),
    interests: z.array(z.string()).default([]),
    cv: z.string().optional(),
    homepage: z.string().url().optional(),
    google_scholar: z.string().url().optional(),
    orcid: z.string().optional(),
    joined: z.string().optional(),        // YYYY-MM
    graduated: z.string().optional(),
    current_position: z.string().optional(), // alumni 用
    order: z.number().default(100),       // 同 role 內排序
  }),
});

const research = defineCollection({
  type: "content",
  schema: z.object({
    title_zh: z.string(),
    title_en: z.string(),
    summary: z.string(),                  // 一兩句話的 tagline
    cover: z.string().optional(),
    order: z.number().default(100),
    related_publications: z.array(z.string()).default([]),
    active: z.boolean().default(true),
  }),
});

const courses = defineCollection({
  type: "content",
  schema: z.object({
    code: z.string(),                     // 課號
    title_zh: z.string(),
    title_en: z.string().optional(),
    semester: z.string(),                 // 例 "2024 Fall"
    instructor: z.string(),
    level: z.enum(["undergrad", "grad", "both"]),
    credits: z.number().optional(),
    syllabus: z.string().optional(),      // PDF path
    materials: z.array(z.object({
      title: z.string(),
      file: z.string(),                   // 例 "/teaching/.../lecture-01.pdf"
      type: z.enum(["lecture", "homework", "project", "exam", "other"]),
    })).default([]),
  }),
});

const software = defineCollection({
  type: "content",
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    language: z.enum(["julia", "python", "matlab", "fortran", "cpp", "other"]),
    license: z.string(),                  // MIT / GPL-3.0…
    repo: z.string().url(),               // GitHub URL
    latest_release: z.string().optional(),// 例 "v0.3.1"
    docs: z.string().url().optional(),
    doi: z.string().optional(),           // Zenodo DOI
    citation: z.string().optional(),      // BibTeX
    cover: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

const news = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.date(),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title_zh: z.string(),
    title_en: z.string().optional(),
    funder: z.string(),                   // NSTC / 國科會…
    grant_id: z.string().optional(),
    period_start: z.string(),             // YYYY-MM
    period_end: z.string(),
    pi: z.string(),
    co_pis: z.array(z.string()).default([]),
    summary: z.string(),
    active: z.boolean().default(true),
  }),
});

export const collections = {
  publications,
  members,
  research,
  courses,
  software,
  news,
  projects,
};
```

---

## 5. 各頁面內容規劃

### 5.1 Home（首頁）

- **Hero**：實驗室名稱、一句話 tagline（「探索熱與聲的能量轉換」之類）、一張代表性的研究照片
- **Mission / 簡介**：兩三段
- **最新動態**：news collection 取最新 3 篇
- **代表性研究主題**：research collection 取 3 個 active
- **精選論文**：publications collection 取 `featured: true` 前 3 篇
- **CTA**：Join Us 連結 + Contact

### 5.2 Research

- 列表頁：所有 research 主題卡片
- 個別頁：完整介紹（背景、方法、成果、相關發表、相關計畫）
- 內容可含數學式（KaTeX）、圖片、影片

**初版要寫的研究主題**：
1. 濕蓄熱器熱聲特性（基礎研究）
2. 氣液耦合行波型熱聲引擎
3. 非線性熱聲動力學與隨機信號識別
4. （未來擴充）熱聲製冷機

### 5.3 Publications

- 預設依年份倒序，分組顯示
- 篩選：`type` (期刊 / 會議 / 學位論文)、年份
- 每筆顯示：作者（粗體標出實驗室成員）、標題、venue、年份
- 點擊展開 abstract、PDF、DOI、BibTeX
- **資料來源建議**：用一個 master `publications.bib` 檔，寫個 `scripts/import-bibtex.ts` 自動產生 mdx — 這樣引用論文跟更新網站是同一個動作

### 5.4 People

- 分區塊：**Principal Investigator** → **Current Members**（postdoc / PhD / MS / 大專生）→ **Alumni**
- PI 卡片大版（照片、職稱、研究興趣、CV、聯絡）
- 學生卡片簡版（照片、姓名、學位階段、題目、入學年）
- Alumni 顯示：畢業年、論文題目、目前去向（這對招生超有用）

### 5.5 Teaching（未來擴充，初版不上線）

預期內容：課程列表（依學期）、每門課個別頁（課綱、講義、作業、專題成果）、PDF 直接連 `public/teaching/`。等實際要放材料時再啟用。

### 5.6 Software（未來擴充，初版不上線）

預期內容：求解器 / 工具列表卡片，個別頁說明安裝、Quick start、citation、Download（連到獨立 GitHub repo 的 Releases）。**重申原則**：原始碼留在獨立 repo，不放網站 repo。等求解器 v0.1 release 之後再啟用本頁。

### 5.7 Join Us（新生加入實驗室之前須知）⭐

完整內容看下節 §6。

### 5.8 News

- 簡單 blog 格式
- 用途：研討會發表、新成員加入、論文 accepted、招生公告
- 每篇可短可長

### 5.9 Contact

- 地址（綜合科館 614-2A）
- 電話、Email
- Google Maps 嵌入
- 大眾運輸資訊（捷運忠孝復興 / 公車）
- 招生詢問請參考 Join Us（避免重複的問題）

---

## 6. Join Us 頁面草稿

> 以下是建議內容，你可以直接 copy 進 `src/pages/join-us.astro` 並修整語氣。每段標題後面括號是寫作意圖註記，正式上線前刪掉。

---

### 寫在前面（破題、設定預期）

如果你正在考慮加入熱聲實驗室——不論是準備推甄、考研究所、想做大專專題、或者已經錄取在猶豫——這頁是給你的。我們希望你**在進實驗室之前**就清楚知道：我們在做什麼、需要什麼樣的同學、你會學到什麼、以及你應該期待怎樣的研究生活。

這不是行銷文案。我們寧可現在勸退一些其實不適合的人，也不希望進來之後雙方都失望。

### 我們在做什麼（30 秒版）

熱聲（thermoacoustics）研究的是熱與聲波之間的能量轉換。一根管子裡放一塊蓄熱器，兩端施加溫度差，氣體會自發地振盪起來——這就是熱聲引擎。它沒有活塞、沒有滑動密封、結構極簡，可以汲取低溫廢熱發電或驅動製冷。

我們實驗室的特色是「**濕**」熱聲引擎：在傳統氣柱熱聲引擎中加入水蒸氣與液柱，利用相變化潛熱降低臨界發振溫度，同時縮小裝置體積。這條路在國際上做的人不多，能做出原創性的空間還很大。

詳細研究方向見 [Research](/research) 頁。

### 我們需要怎樣的同學（誠實版）

**期待你具備（或願意快速補上）的基礎**：

- **數學**：常微分方程、偏微分方程基礎、線性代數、複變函數
- **物理 / 工程**：熱力學、流體力學、振動學至少其中一兩門念得 OK
- **程式**：至少寫過一種科學計算語言（Julia / Python / MATLAB / Fortran 都行）。會 Git 加分
- **實驗 (組)**：對動手做不排斥，能耐得住反覆量測、調整參數、與儀器較勁
- **理論 / 計算 (組)**：願意 debug 數值方法、看英文 paper 把公式重新推一遍

**比上述背景更重要的特質**：

- 對「為什麼」會問到底，而不是「老師你叫我做什麼我就做什麼」
- 進度卡住時願意先嘗試、Google、看書，再來討論
- 看 paper 看不懂不會放棄，會回去補背景知識
- 能誠實回報實驗 / 計算結果，包括失敗與不確定

**比較不適合我們實驗室的情境**：

- 只想要一個學歷、不太在意題目本身
- 期待研究生活是「上下班」式的固定時數
- 不喜歡寫程式 / 不喜歡接觸儀器（我們兩種都會碰）
- 中英文閱讀都不耐久（讀 paper 是日常）

### 你會學到什麼

不論你之後走學術或業界，我們希望你帶走以下幾樣可遷移的能力：

**硬技能**

- 熱聲、聲學、振動的工程理論基礎
- 實驗：聲壓 / 速度 / 溫度量測、訊號處理、不確定度分析
- 計算：科學計算（Julia 為主）、數值方法、CFD / 聲學模擬
- 隨機過程信號識別、非線性動力學

**軟技能**

- 科學寫作：把實驗結果寫成可發表的論文
- 口頭報告：lab meeting、研討會
- 同儕審查：讀別人的稿子並寫 referee report
- 跨領域溝通：跟物理、機械、化工背景的人都能對話

### 我們的工作型態

- **Group meeting**：每週一次，輪流報告進度或選一篇 paper 講
- **One-on-one**：跟指導老師約定，通常隔週或每月
- **空間**：[綜合科館 614-2A](/contact)，有實驗區與計算 / 寫作區
- **時間**：彈性，但實驗有連續性需求時、論文投稿前後會比較忙；正常進度下不需要爆肝
- **語言**：日常中文、看 paper / 寫 paper / 國際研討會英文
- **設備使用**：新生會由學長姐帶 onboarding，獨立操作前需通過安全訓練

### 校友去向

> 這段建議放具體名字 + 目前職位，會比抽象敘述有說服力。先佔位，等你蒐集完資料再填。

過去畢業的同學分布在：

- 學術界：[姓名] 於 [學校 / 機構] [職稱]
- 半導體：[公司]
- 能源 / 機械：[公司]
- 聲學 / 儀器：[公司]

### 申請與加入流程

**1. 寄信給老師**（最重要的一步）

請寄到 [shuhan@…]，主旨格式：`[實驗室申請] 你的姓名 / 學校 / 系級`

信中請包含：

- 個人簡介（一段即可）
- CV / 履歷（PDF 附件）
- 為什麼想做熱聲？（看過哪些研究、哪一塊吸引你）
- 你目前最有信心的技術技能 + 最想補強的領域
- 大致時程：什麼時候希望開始？預計待多久？

**請不要寄罐頭信**——我們收得出來。一封誠懇的兩百字勝過範本式的一千字。

**2. 一對一面談**（30–60 分鐘）

確認雙方期待對齊。你也可以問任何問題，包括經費、進度壓力、跟其他學長姐相處等等。

**3. 試做小專題**（可選）

如果你還在大學或剛確認研究所，建議先做一個 1–3 個月的小題目（暑期專題、學期專題）。對雙方都是低成本的試水溫。

**4. 正式加入**

對齊指導同意書 / 入學手續。

### FAQ

**Q：我不是相關科系的，可以加入嗎？**
A：可以。我們收過工科、物理、化工、應數背景的同學。重點是補課自學的能力，而不是你大學讀什麼。

**Q：可以雙指導嗎？**
A：原則上可以，但請事先溝通清楚兩邊的進度與資源分配。

**Q：有經費補助嗎？**
A：研究助理費、計畫獎助金、會議出席補助等等。額度依學位階段與計畫狀態而定，面談時會具體討論。

**Q：大學部專題可以做嗎？**
A：歡迎，名額有限請提早洽詢。建議學期初聯絡。

**Q：我比較想做計算 / 模擬，不想做實驗，可以嗎？**
A：可以。實驗組與計算組的題目都有，但即使主要做計算，也鼓勵到實驗區理解硬體在做什麼，反之亦然。

**Q：可以遠距 / 在家工作嗎？**
A：寫作、計算、讀 paper 部分彈性安排沒問題。實驗、儀器使用、group meeting 需要到場。

### 推薦先讀的一些東西

開始之前可以翻翻看：

- **書**：Swift, G. W., *Thermoacoustics: A Unifying Perspective for Some Engines and Refrigerators*（Acoustical Society of America 出版，免費 PDF 在作者網站上有）
- **入門 review**：Backhaus & Swift (1999), *A thermoacoustic Stirling heat engine*, Nature 399, 335–338
- **濕熱聲入門**：[填你想推的某幾篇代表性 paper]
- **數值工具**：Julia 教學 [https://julialang.org/learning/](https://julialang.org/learning/)；如果完全沒寫過程式，先把這個刷完

讀不懂沒關係——進來之後我們會一起念。但**有沒有翻過**，面談時很容易看出來。

### 還有疑問？

- 一般招生問題請寄 [Email]，主旨加 `[詢問]`
- 也歡迎直接到實驗室聊，請先約時間

---

## 7. 視覺風格建議

- **配色**：學術冷調 + 暖色強調。建議
  - 主色：deep navy（接近 `#1e3a5f`）
  - 強調色：warm orange（接近 `#d97757`，呼應加熱、火焰）
  - 中性：偏暖灰階
- **字體**：
  - 中文：Noto Sans TC（內文）+ Noto Serif TC（標題或可選）
  - 英文：Inter 或 IBM Plex Sans
  - 等寬：JetBrains Mono（程式碼）
- **排版原則**：留白多、行高 1.7、最大行寬 70 字元、段落間距明確
- **不要做**：自動播放影片、parallax 滾動、會跳的數字計數器這類 distracting 元素

---

## 8. 技術選型建議

- **框架**：Astro 5+（穩定版）
- **CSS**：Tailwind CSS 4（Astro 5 整合度高，且 Claude Code 對 Tailwind 熟悉）
- **MDX**：`@astrojs/mdx`（內容寫作）
- **數學式**：`rehype-katex` + `remark-math`
- **語法高亮**：Astro 內建 Shiki
- **圖片優化**：`astro:assets`
- **i18n**：Astro 內建 routing；翻譯文字用 `src/i18n/zh.json`、`en.json`
- **搜尋**（可選）：Pagefind（純客戶端、零後端）
- **分析**（可選）：Plausible / Umami（隱私友善）
- **部署**：Cloudflare Pages（推薦）或 GitHub Pages
- **Forms**（聯絡表單）：Cloudflare Pages 內建 Functions 或第三方 Formspree

---

## 9. CLAUDE.md 大綱（給 Claude Code 用）

在 repo 根目錄建一個 `CLAUDE.md`，每次 Claude Code 開啟工作目錄就會自動讀。建議放：

1. **專案概要**：本站是熱聲實驗室網站，技術棧 Astro + MDX + Tailwind
2. **內容結構摘要**：collections 列表 + schema 重點欄位
3. **常見任務 prompt 範例**：
   - 「新增一篇論文：給我 BibTeX，幫我建 publications/xxx.mdx」
   - 「新增一位學生：給我姓名、入學年、研究題目、照片檔名」
   - 「更新濕熱聲引擎研究頁，補上最新成果一段」
   - 「從 publications.bib 重新產生所有論文 mdx」
4. **撰寫風格**：中文敘述、avoid 誇飾、技術名詞中英並列首次出現
5. **不要動的東西**：`public/papers/` 已發表論文 PDF、外部 GitHub repo
6. **commit message 格式**：`feat: ...` / `fix: ...` / `content: 新增 2024-bujunyun 論文`

---

## 10. 上線時程建議

初版範圍縮小（不含 Teaching / Software），時程可以壓到 **4 週**：

| 週 | 工作 |
|---|---|
| W1 | `npm create astro@latest` 起骨架，套主題或從頭刻 layout、Tailwind 配色；建 collections schema |
| W2 | 寫 3–5 個範本 mdx；首頁 + Research + People 上線 |
| W3 | Publications 從現有資料搬入、加 BibTeX 自動產生 script；Join Us 頁完稿；News 機制 + 第一篇 news |
| W4 | Cloudflare Pages 部署測試、舊站 URL → 新站 redirect 對照表、DNS 切換 thermoacoustictw.org，舊 WordPress 站保留為 archive 子網域一個月 |

未來啟用 Teaching / Software 時，各約再花 1–2 個工作天即可（schema 已備、頁面只需建 list + detail 兩個 route）。

---

## 11. 後續擴充想法

### 近期（內容準備好就啟用，schema 已預留）

- **Teaching 頁啟用**：開課後把該學期的課綱、講義 PDF 放 `public/teaching/<學期>/`，建對應 mdx，加 nav 項目。預估工時 1 個工作天
- **Software 頁啟用**：求解器 release v0.1 後啟用。建獨立 GitHub repo、Zenodo 申 DOI、寫一篇 mdx 連過去。預估工時 1–2 個工作天

### 中長期（不急著做）

- **互動 demo**：用 Astro island + React 嵌一個小型熱聲共振模擬，讓參觀者拉滑桿觀察
- **Publications 頁加 Altmetric / Semantic Scholar 資訊**
- **校友地圖**：用 D3 或 Leaflet 顯示校友分佈
- **濕熱聲引擎結果視覺化**：把實驗 / 模擬資料轉成靜態圖嵌入研究頁
- **訂閱**：RSS feed for News + 論文發表（學術圈還是有人用）

---

## 附錄：mdx 範本

### A. publications/2024-example.mdx

```mdx
---
title: "Stochastic identification of van der Pol parameters in a wet thermoacoustic engine"
title_zh: "濕式熱聲引擎中 van der Pol 參數之隨機信號識別"
authors: ["不均勻", "許書涵"]
venue: "Journal of Sound and Vibration"
venue_short: "JSV"
year: 2025
type: "journal"
doi: "10.xxxx/yyyy"
pdf: "/papers/2024-bujunyun-wet-stack.pdf"
featured: true
tags: ["nonlinear dynamics", "wet thermoacoustic", "system identification"]
---

## Abstract

We apply Noiray's stochastic identification framework to ...

## BibTeX

```bibtex
@article{bujunyun2025stochastic,
  ...
}
```
```

### B. members/current/shu-han-hsu.mdx

```mdx
---
name_zh: "許書涵"
name_en: "Shu-Han HSU"
role: "pi"
email: "shuhan@..."
photo: "/images/members/shu-han-hsu.jpg"
affiliation: "助理教授"
interests:
  - "熱聲引擎與製冷"
  - "非線性熱聲現象"
  - "隨機過程信號識別"
orcid: "0000-0002-3014-2013"
google_scholar: "https://scholar.google.com/..."
order: 1
---

[正文：個人簡介、學經歷、研究哲學]
```

### C. software/thermoacoustic-solver-jl.mdx

```mdx
---
name: "ThermoacousticSolver.jl"
tagline: "Linear acoustic network solver for thermoacoustic devices, in Julia"
language: "julia"
license: "MIT"
repo: "https://github.com/yourname/ThermoacousticSolver.jl"
latest_release: "v0.3.1"
docs: "https://yourname.github.io/ThermoacousticSolver.jl"
doi: "10.5281/zenodo.xxxxx"
featured: true
---

## Overview

A modular solver based on transfer-matrix / acoustic network ...

## Install

```julia
] add ThermoacousticSolver
```

## Citation

```bibtex
@software{thermoacoustic_solver_jl,
  ...
}
```
```
