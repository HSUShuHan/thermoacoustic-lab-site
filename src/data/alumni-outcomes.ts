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
  // logo 選填：官方標誌檔放 public/images/logos/ 後填入路徑，設了才會顯示圖。
  employers: [
    { zh: "台積電", en: "TSMC", logo: "" },
    { zh: "台灣應用材料", en: "Applied Materials", logo: "" },
    { zh: "東京威力科創", en: "Tokyo Electron", logo: "" },
    { zh: "台達電子", en: "Delta Electronics", logo: "" },
    { zh: "美超微", en: "Supermicro", logo: "" },
    { zh: "巨騰事務機器", en: "Ju Teng" },
    { zh: "昇拓模具", en: "Sheng-Tuo Mould" },
    { zh: "永隆工程", en: "Yung Loong Engineering" },
    { zh: "佳興油壓五金行", en: "Jia-Xing Hydraulics" },
    { zh: "PK AUTOPACK", en: "PK AUTOPACK" },
  ] as { zh: string; en: string; logo?: string }[],

  // 職位（聚合、去重、不與單位配對）
  positions: [
    { zh: "設備工程師", en: "Equipment Engineer" },
    { zh: "客戶工程師", en: "Customer Engineer" },
    { zh: "現場工程師", en: "Field Engineer" },
    { zh: "資深機構工程師", en: "Senior Mechanical Engineer" },
    { zh: "BMC FW Engineer", en: "BMC FW Engineer" },
    { zh: "業務", en: "Sales" },
    { zh: "經理", en: "Manager" },
    { zh: "設計部", en: "Design Dept." },
    { zh: "執行長", en: "CEO" },
  ] as { zh: string; en: string }[],

  // 升學學校（校友深造過之研究所；部分校友深造後再就業）
  // logo 選填：官方校徽檔放 public/images/logos/ 後填入路徑。
  gradSchools: [
    { zh: "國立臺灣大學 機械所", en: "National Taiwan University (Mech. Eng.)", logo: "" },
    { zh: "日本 東京科學大學", en: "Institute of Science Tokyo (Japan)", logo: "" },
    {
      zh: "加拿大 University of British Columbia",
      en: "University of British Columbia (Canada)",
      logo: "",
    },
  ] as { zh: string; en: string; logo?: string }[],
};
