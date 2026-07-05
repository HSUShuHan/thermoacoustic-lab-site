// PI 學術資料庫／個人檔案連結（顯示於發表頁頂端）。
// 新增資料庫：補一筆 { label, url }（可選 urlEn 提供英文頁專用連結）。
export interface ScholarProfile {
  label: string;
  url: string;
  urlEn?: string;
}

export const scholarProfiles: ScholarProfile[] = [
  {
    label: "ORCID",
    url: "https://orcid.org/0000-0002-3014-2013",
  },
  {
    label: "NSTC",
    url: "https://wrs.nstc.gov.tw/modules/talentSearch/talentSearch.do?action=initRsm17new&rsNo=54dd1397f8ea4f919455e0fa4b43f2c6&LANG=chi",
    urlEn:
      "https://wrs.nstc.gov.tw/modules/talentSearch/talentSearch.do?action=initRsm17new&rsNo=54dd1397f8ea4f919455e0fa4b43f2c6&LANG=eng",
  },
  // 待補（提供 ID/URL 後加入）：
  // { label: "Google Scholar", url: "https://scholar.google.com/citations?user=XXXX" },
  // { label: "Scopus", url: "https://www.scopus.com/authid/detail.uri?authorId=XXXX" },
  // { label: "Web of Science", url: "https://www.webofscience.com/wos/author/record/XXXX" },
];
