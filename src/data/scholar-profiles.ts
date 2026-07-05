// PI 學術資料庫／個人檔案連結（顯示於發表頁頂端），依性質分組。
// 新增：在對應 group 的 items 補一筆 { label, url }（可選 urlEn 提供英文頁專用連結）。
export interface ScholarProfile {
  label: string;
  url: string;
  urlEn?: string;
}

export interface ProfileGroup {
  zh: string;
  en: string;
  items: ScholarProfile[];
}

export const profileGroups: ProfileGroup[] = [
  {
    zh: "引用索引",
    en: "Citation indexes",
    items: [
      {
        label: "Google Scholar",
        url: "https://scholar.google.com.tw/citations?user=U2bWvSUAAAAJ&hl=zh-TW",
        urlEn: "https://scholar.google.com/citations?user=U2bWvSUAAAAJ&hl=en",
      },
      {
        label: "Scopus",
        url: "https://www.scopus.com/authid/detail.uri?authorId=57192693236",
      },
      {
        label: "Web of Science",
        url: "https://www.webofscience.com/wos/author/record/GLU-9976-2022",
      },
    ],
  },
  {
    zh: "學者檔案",
    en: "Author profiles",
    items: [
      {
        label: "ORCID",
        url: "https://orcid.org/0000-0002-3014-2013",
      },
      {
        label: "ResearchGate",
        url: "https://www.researchgate.net/profile/Shu-Han-Hsu-4",
      },
      {
        label: "SciProfiles",
        url: "https://sciprofiles.com/profile/3114312",
      },
      {
        label: "Kudos",
        url: "https://www.growkudos.com/profile/shu-han_hsu",
      },
      {
        label: "NSTC",
        url: "https://wrs.nstc.gov.tw/modules/talentSearch/talentSearch.do?action=initRsm17new&rsNo=54dd1397f8ea4f919455e0fa4b43f2c6&LANG=chi",
        urlEn:
          "https://wrs.nstc.gov.tw/modules/talentSearch/talentSearch.do?action=initRsm17new&rsNo=54dd1397f8ea4f919455e0fa4b43f2c6&LANG=eng",
      },
    ],
  },
];
