// 校友去向「聚合」統計資料（無姓名、不對應到個人；供成員頁統計卡使用）。
// 個人層級的具體對應僅存於私有內部紀錄，不放此公開 repo。
// 新增/更新校友去向時，於此彙整更新數字與單位清單即可。

export type Sector = { zh: string; en: string; n: number };

export const alumniOutcomes = {
  // 目前已掌握去向的人數（其餘校友資料建置中）
  knownCount: 13,
  furtherStudyCount: 2,
  employmentCount: 11,

  // 就業產業別（人數）
  sectors: [
    { zh: "半導體與設備", en: "Semiconductor & equipment", n: 4 },
    { zh: "電子與資通訊", en: "Electronics & ICT", n: 2 },
    { zh: "機械、模具與製造", en: "Machinery & manufacturing", n: 5 },
  ] as Sector[],

  // 就業單位（不重複；不對應到個人）
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

  // 升學學校
  gradSchools: ["國立臺灣大學 機械所", "日本東京科學大學"],
};
