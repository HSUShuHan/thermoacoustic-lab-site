# CLAUDE.md

> 此檔案是給 Claude Code 看的專案工作指南。每次在這個 repo 開啟 session 都會自動讀。
> 完整的網站架構規劃見 `docs/site-plan.md`（從 thermoacoustic-lab-site-plan.md 改名而來）。

---

## 專案概要

這是 **熱聲實驗室** 的官方網站，網域 `thermoacoustictw.org`。

- **指導老師（PI）**：許書涵 副教授（Shu-Han HSU，ORCID [0000-0002-3014-2013](https://orcid.org/0000-0002-3014-2013)）
- **單位**：國立臺北科技大學機械工程系，10608 台北市忠孝東路三段 1 號 綜合科館 614-2A
- **研究主軸**：熱聲引擎、熱聲製冷、非線性熱聲動力學；當前重點為使用濕蓄熱器與液柱之行波型熱聲引擎
- **網站定位**：學術實驗室 official site，主要受眾依序為：潛在學生、同行研究者、合作單位、媒體

從 WordPress 遷移而來，採用 Astro 靜態站架構 + git 版控 + Cloudflare Pages 自動部署。

---

## 技術棧

- **框架**：Astro 5+
- **CSS**：Tailwind CSS 4
- **內容格式**：MDX（`.mdx`）為主，純 Markdown（`.md`）次之
- **數學式**：rehype-katex + remark-math（語法 `$...$` 與 `$$...$$`）
- **圖示**：Lucide / Heroicons（透過 astro-icon 整合）
- **i18n**：Astro 內建 routing（`/` 中文預設、`/en/` 英文）
- **部署**：Cloudflare Pages（main branch auto deploy；PR 自動產生 preview URL）

Node 版本：見 `.nvmrc`。包管理：npm（除非另有說明）。

---

## 開發指令

```bash
npm install              # 安裝依賴
npm run dev              # 本機開發 (預設 http://localhost:4321)
npm run build            # 正式建置到 dist/
npm run preview          # 預覽 build 結果
npm run typecheck        # TypeScript 檢查
npm run lint             # ESLint
npm run format           # Prettier
npm run import:bib       # 從 publications.bib 重新產生論文 mdx（見下節）
```

對網站做任何改動之後，**至少執行一次 `npm run build`** 確認沒有編譯錯誤再 commit。

---

## 重要資料夾速查

| 路徑 | 內容 | 改動頻率 |
|---|---|---|
| `src/content/` | 所有 collections（論文、成員、研究、專案、新聞）| 高 |
| `src/pages/` | 路由 / 頁面 | 低 |
| `src/components/` | UI 元件 | 中 |
| `src/layouts/` | 頁面 layout | 低 |
| `public/papers/` | 已發表論文 PDF（**唯讀**，見「不要動的檔案」） | — |
| `public/images/` | 圖片資產（成員照、實驗照） | 中 |
| `data/publications.bib` | 論文資料庫單一來源（master BibTeX） | 高 |
| `scripts/` | 工具腳本（如 BibTeX → mdx 轉換器） | 低 |

---

## Content Collections 速查

詳細 schema 在 `src/content/config.ts`。日常常用欄位：

### `publications`
- 必填：`title`、`authors`（陣列）、`venue`、`year`、`type`（`journal` / `conference` / `thesis` / `preprint`）
- 常用：`doi`、`pdf`（指向 `/papers/...`）、`bibtex`、`abstract`、`featured`（首頁 highlight）
- 檔名規則：`<year>-<first-author-lastname>-<short-keyword>.mdx`
  - 例：`2024-bujunyun-wet-stack.mdx`、`2020-li-stable-amplitude.mdx`

### `members`
- 必填：`name_zh`、`name_en`、`role`（`pi` / `postdoc` / `phd` / `ms` / `undergrad` / `research-assistant` / `alumni`）
- 路徑：在學成員放 `members/current/`，校友放 `members/alumni/`
- 校友額外欄位：`graduated`、`current_position`

### `research`
- 必填：`title_zh`、`title_en`、`summary`、`order`
- `active: false` 表示已結束的研究方向（會顯示在「歷年研究」區）

### `projects`
- 必填：`title_zh`、`funder`、`period_start`、`period_end`、`pi`、`summary`
- 用途：研究計畫頁（NSTC、產學合作等）

### `news`
- 必填：`title`、`date`
- 簡單貼文格式

未來會啟用但**目前不建立內容**的 collections：`courses`（教學）、`software`（求解器）。schema 已預先定義在 config.ts。

---

## 常見維護任務

以下是使用者最可能下達的指令類型，附上你應該怎麼做：

### 「新增一篇論文：[使用者貼上 BibTeX]」

1. 解析 BibTeX，抽出 `title`、`author`、`journal`/`booktitle`、`year`、`doi`
2. 作者陣列：保留原順序，姓名格式統一為「中文姓名」或「First Last」（看原始 BibTeX）
3. 在 `data/publications.bib` 新增一筆
4. 執行 `npm run import:bib`（會自動在 `src/content/publications/` 產出對應 mdx）
   - 如果 script 不存在或失敗，手動建立 mdx，frontmatter 對齊 schema
5. 如果使用者有附 PDF，提示放到 `public/papers/<entry-key>.pdf`，frontmatter `pdf:` 欄位填對應路徑
6. 詢問是否要 `featured: true`（首頁是否要 highlight）

> **若使用者只給 DOI**：可直接 fetch `https://api.crossref.org/works/<doi>` 取得 metadata 自動產出 BibTeX，再走上述流程。
> **若使用者要求「同步 ORCID 上所有論文」**：見 `scripts/sync-orcid.ts`（如果尚未存在則先建立）。PI 的 ORCID 為 `0000-0002-3014-2013`，可用 ORCID Public API（`https://pub.orcid.org/v3.0/<orcid>/works`）抓取作品列表，與 publications.bib 比對缺漏。注意 ORCID 上的資料粒度不一定夠細，仍以 BibTeX 為準。

### 「新增一位學生：姓名 X、研究題目 Y、入學 YYYY-MM」

1. 在 `src/content/members/current/` 建一個 `<pinyin-or-id>.mdx`
2. frontmatter 必填欄位：`name_zh`、`name_en`、`role`、`joined`、`order`
3. 詢問是否有照片；若有，放 `public/images/members/<id>.jpg`，frontmatter `photo:` 填路徑；若無，先空著
4. 正文寫 1–2 段研究方向簡介
5. **不要**自動填假的 email、homepage、scholar 連結；空著就好

### 「學生 X 畢業了，現在去 [機構]」

1. 把 `src/content/members/current/<id>.mdx` 移到 `members/alumni/<id>.mdx`
2. 改 `role: alumni`
3. 補上 `graduated: YYYY-MM`、`current_position: ...`
4. 問使用者要不要在 `news/` 加一篇畢業 / 就職新聞

### 「新增一篇 news：[標題或內容]」

1. 在 `src/content/news/` 建 `<YYYY-MM-DD>-<slug>.mdx`
2. frontmatter：`title`、`date`、可選 `cover`、`tags`
3. 正文用一般 markdown 寫，可嵌圖片（放 `public/images/news/`）

### 「更新研究主題 X 的描述」

1. 找 `src/content/research/<topic>.mdx`
2. 編輯時保留 frontmatter，修改正文
3. 涉及數學式時用 KaTeX 語法（`$E = mc^2$` 行內、`$$...$$` 區塊）
4. 改完跑 `npm run build` 確認 KaTeX 沒語法錯誤

### 「從這個 .bib 檔重新產生所有論文頁」

執行 `npm run import:bib`。如果發現衝突（mdx 已存在但 bib 內容不同），預設**不覆蓋**，列出差異請使用者確認。

### 「Join Us 頁的 FAQ 加一條：問題 X / 回答 Y」

1. 找 `src/pages/join-us.astro` 中 FAQ 區塊
2. 維持既有的 Q / A 格式
3. 新問題附加在現有列表最後（除非使用者指定位置）

---

## 撰寫風格

中文網站，但實驗室是學術 / 國際合作脈絡，請遵守：

### 語氣
- **直接、誠實、不過度行銷**。學術網站不是廣告
- 避免「革命性」「全球頂尖」「業界第一」這類誇飾詞
- 自我介紹用「我們」而非「本實驗室」（後者太官方）
- Join Us 等對潛在學生的內容保持坦誠語氣，包含勸退條件

### 用詞
- 技術名詞**首次出現中英並列**：例「熱聲引擎（thermoacoustic engine）」
- 之後可只用中文或只用英文，全文一致即可
- 西元年、阿拉伯數字統一用半形：「2024 年」非「２０２４年」
- 數字與單位中間留**半形空格**：「230 °C」「13.8 Hz」「5 mm」
- 縮寫首次展開：「美國國家科學基金會（NSF）」

### 標點
- 中文段落使用中文標點（「，」「。」「：」）
- 英文夾雜時，純英文句子用英文標點
- 不要把「。」誤打成「. 」
- 引號用「」與『』，不用 ""

### Markdown 慣例
- 標題層級從 H2 (`##`) 開始（H1 由 layout 控制）
- 列點用 `-`，不用 `*`
- 程式碼一律用 fenced code block，標語言：```` ```julia ````、```` ```python ````
- 數學式：行內 `$ ... $`、區塊 `$$ ... $$`
- 圖片：`![alt 文字](/images/...)`，alt 一定要寫，方便視障使用者與 SEO

---

## Commit / Git 規範

格式：`<type>: <短描述>`，type 沿用 conventional commits：

- `feat`: 新功能 / 新頁面 / 新元件
- `fix`: bug 修復
- `content`: 內容更新（新增論文、改成員資料、寫 news）
- `refactor`: 重構，行為不變
- `style`: 樣式調整（CSS、字型、間距）
- `docs`: 文件（README、本檔案、site-plan）
- `chore`: 雜項（依賴升級、設定）

**Subject 用中文 OK**，例：

```
content: 新增 2024 JSV 論文（不均勻 et al., wet stack）
content: 學生王凌煒畢業，移至 alumni
fix: KaTeX 在 Safari 行內公式垂直對齊
style: people 頁卡片 hover 加 shadow
feat: 新增 BibTeX 自動匯入 script
```

Body（可選）：解釋「為什麼這麼改」，不解釋「改了什麼」（diff 已經說明）。

**不要**在一個 commit 裡混合多種 type（例如新增論文又順手改 footer 樣式 — 拆兩個 commit）。

**Branch**：日常小改動直接 push main；改架構、加大功能、改設計開 feature branch + PR，靠 Cloudflare preview URL 看效果再 merge。

---

## 不要動的檔案 / 區域

- `public/papers/*.pdf` — 已發表論文存檔，**永遠唯讀**。需新增就放新檔，不改舊檔
- 既有 `src/content/publications/*.mdx` — 除非使用者明確指示，不要動既有論文 mdx 的內容（避免引用斷裂）
- `data/publications.bib` 既有條目 — 同上，新增 OK，**不要改既有 entry key**
- `.env`、`.env.local`、任何 `*secret*` 檔 — 永遠不讀、不寫、不 commit
- `public/cv/` — PI / 成員 CV 由本人提供，**不要自己改寫內容**
- 外部 GitHub repo 的內容（求解器、其他 lab tools）— 那些 repo 各自獨立，網站只連結，不存原始碼
- `astro.config.mjs`、`tailwind.config.mjs` 的 plugin 列表 — 大改前先告知使用者，這類設定變更容易連鎖出錯

---

## 圖片與媒體處理

- **格式**：照片 `.jpg`（品質 80–85），插圖 / icon `.svg`，截圖 / 圖表 `.png`（必要時 `.webp`）
- **尺寸**：
  - 成員照：方形 600×600px，靠 `astro:assets` 自動產生 srcset
  - Hero / cover：橫式 1600×900px 或 16:9
  - 內文圖：寬度上限 1200px
- **檔名**：小寫、kebab-case、ASCII：`shu-han-hsu.jpg`、`wet-stack-setup.jpg`
- **不要**直接把手機原圖（5MB+）丟進 repo，先壓到 < 500KB
- **alt 文字必填**，中文 OK

---

## 數學式撰寫慣例

- 行內：`$p = p_0 \cos(\omega t)$`
- 區塊：

```
$$
\frac{\partial^2 p}{\partial t^2} = c^2 \nabla^2 p
$$
```

- 單位用 `\,` 加細空格：`$230\,°\text{C}$`
- 向量粗體：`\mathbf{u}` 或 `\vec{u}`，全站擇一風格
- 太長的推導不要塞進首頁或 Research 簡介；放個別研究主題頁的「Methods」段落

---

## 遇到不確定時

優先級：

1. **不確定就問**，不要自行編造（特別是論文題目、年份、人名拼音、機構名稱）
2. 如果問題很小且使用者沒空回，提供 2–3 個合理選項讓他選
3. 對於「找不到資料」的欄位（例如某論文沒 DOI），**留空**，不要填佔位字串如 "TBD" 或 "10.xxxx/xxx"
4. 對於可能影響部署的改動（`astro.config`、`package.json` 重大變更、DNS / 部署設定），改之前先說明會影響什麼

不確定的範例：

| 情境 | 動作 |
|---|---|
| 使用者貼一個 BibTeX，但作者欄是 `B. Y. Wang` 這種縮寫 | 詢問完整中文姓名 |
| 新增成員，沒給入學年 | 詢問或先用 `joined: TBD` 並提醒回來補 |
| 論文 venue 寫 "JSV"，但要展開全名 | 用標準全名 "Journal of Sound and Vibration" |
| 使用者要刪除某論文 / 成員 | 確認後再做，並提醒這會破壞既有連結 |

---

## 一些不對稱的提醒

- **Performance 預設不用擔心**：Astro 預設輸出靜態 HTML，0 JS by default。Cloudflare CDN 全球分發，效能對學術站綽綽有餘。除非使用者指明，不要為了「優化」加 SSR、ISR、edge functions
- **SEO 中等優先**：每頁的 `<title>` 跟 `<meta description>` 要寫好，但不要過度堆關鍵字。學術網站靠 Google Scholar 跟 arXiv 引用引流，比 SEO 重要
- **無障礙**：alt 文字、語義化 HTML、足夠對比度。Tailwind 的 `text-gray-500 on bg-white` 是最低能接受的對比；更淡的灰色不要用
- **暗色模式**：規劃中支援，但**初版可以先不做**，集中火力把內容做好

---

## 其他文件指引

- **完整網站架構規劃**：`docs/site-plan.md`
- **README.md**：對外的專案說明（簡短）
- **CONTRIBUTING.md**（未來）：給其他實驗室成員看的「怎麼貢獻內容」指引

如果使用者要求「重新規劃網站架構」「大改某個區塊」，先讀 `docs/site-plan.md`，那是 ground truth；本檔（CLAUDE.md）是日常維運指南。

---

*最後更新：2026-05-08*
*維護者：許書涵*
