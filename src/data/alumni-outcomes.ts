// 校友去向「聚合」統計資料（無姓名、不對應到個人；供成員頁統計卡使用）。
// 個人層級的具體對應僅存於私有內部紀錄，不放此公開 repo。
// 新增/更新校友去向時，於此彙整更新數字與單位清單即可。

export type Sector = { zh: string; en: string; n: number };

export const alumniOutcomes = {
  // 目前已掌握去向的人數（其餘校友資料建置中）
  knownCount: 13,

  // 就業產業別（人數）
  sectors: [
    { zh: "半導體與設備", en: "Semiconductor & equipment", n: 4 },
    { zh: "電子與資通訊", en: "Electronics & ICT", n: 2 },
    { zh: "機械、模具與製造", en: "Machinery & manufacturing", n: 5 },
  ] as Sector[],

  // 就業單位與職位（聚合清單，不對應到個人）
  employers: [
    { org: "台積電", title: "設備工程師" },
    { org: "台灣應用材料", title: "客戶工程師" },
    { org: "東京威力科創", title: "現場工程師" },
    { org: "台達電子", title: "資深機構工程師" },
    { org: "Supermicro", title: "BMC FW Engineer" },
    { org: "巨騰事務機器", title: "業務" },
    { org: "昇拓模具", title: "經理" },
    { org: "永隆工程", title: "設計部" },
    { org: "佳興油壓五金行", title: "執行長" },
    { org: "PK AUTOPACK", title: "業務" },
  ] as { org: string; title: string }[],

  // 升學學校（校友深造過之研究所；部分校友深造後再就業）
  gradSchools: [
    "國立臺灣大學 機械所",
    "日本 東京科學大學",
    "加拿大 University of British Columbia",
  ],
};
