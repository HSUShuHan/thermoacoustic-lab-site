
## 2026-09-06 實驗作業制度變更（lecture-slides session 代改）
- 實驗作業改為「開學即公開」：四份加密 deck 與 courses/*.mdx 的「期中考後公布」已改為「已公布」。
- 已及格者加分由 +3 改為「至多加 10 分（上限 100）」：intro/lab 四份 deck 的數字卡（＋3→＋10）與兩份 mdx 表格已同步更新。
- 未動：選題順序仍為「期中考不及格者優先、選剩開放已及格者」。若 /courses/ 頁其他段落有引用加分數字，請再檢查一次。

## 2026-09-06（補）不及格者補分規則改版（lecture-slides session 代改）
- 「不及格者通過以 60 分計」改為「至多加 20 分、補分後上限 60」（原始成績需約 40 以上才可能達 60），防堵「棄考只做作業」策略。
- 已同步：四份加密 deck 數字卡（60分→＋20分）＋說明句、courses/*.mdx 兩處。

## 2026-11-06 教材加密頁改版（iPad Chrome 開不了大檔）
- 症狀：課程密碼正確，iPad 的 Chrome 打不開講義／課程介紹頁（Safari 與成績頁正常）。原因是 staticrypt 把整份 PDF／deck 以 hex 內嵌，單頁 16–24 MB。
- 改法：密碼頁只留約 50 KB 的載入頁，本體另存 AES-GCM 加密檔（`<out>.pdf.enc`／`<out>.html.enc`）。七份 PDF 講義與四份 deck 已全部轉換，網址、密碼、「記住我」都不變。
- **lecture-slides session 請注意**：之後更新 intro／lab deck 請改用 `node scripts/protect-html.mjs <deck.html> --out <檔名> --semester 115-1 --password <課程密碼>`，不要再直接跑 `npx staticrypt`；PDF 照舊用 `scripts/protect-pdf.mjs`。

## 2026-11-21 熱聲效應頁外部連結修正（待追蹤）
- Swift 改連新站 losalamosthermoacoustics.org；杉本（researchmap 已消失）、小林（`c.nagaokaut.ac.jp` 當天連不上）暫改 KAKEN 研究者頁；Ramon、Fatimah、Tijani DOI 一併修正。
- **待辦（約 11/25 之後）**：小林的研究室網站應仍在經營，再試 `http://c.nagaokaut.ac.jp/`；若恢復，把中英兩頁的主連結改回研究室網址（KAKEN 可留作小字次連結）。
