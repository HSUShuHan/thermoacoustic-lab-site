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

  // 就業單位（聚合、去重、不對應到個人、不與職位配對）
  employers: [
    "台積電",
    "台灣應用材料",
    "東京威力科創",
    "台達電子",
    "Supermicro",
    "巨騰事務機器",
    "昇拓模具",
    "永隆工程",
    "佳興油壓五金行",
    "PK AUTOPACK",
  ],

  // 職位（聚合、去重、不與單位配對）
  positions: [
    "設備工程師",
    "客戶工程師",
    "現場工程師",
    "資深機構工程師",
    "BMC FW Engineer",
    "業務",
    "經理",
    "設計部",
    "執行長",
  ],

  // 升學學校（校友深造過之研究所；部分校友深造後再就業）
  gradSchools: [
    "國立臺灣大學 機械所",
    "日本 東京科學大學",
    "加拿大 University of British Columbia",
  ],
};
