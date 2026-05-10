export type Lang = "zh" | "en";

export const defaultLang: Lang = "zh";

export const languages: Record<Lang, string> = {
  zh: "華",
  en: "EN",
};

export const ui = {
  zh: {
    "site.title": "熱聲實驗室",
    "site.title_full": "熱聲實驗室 Thermoacoustic Lab",
    "site.subtitle": "Thermoacoustic Lab",

    "nav.home": "首頁",
    "nav.research": "研究",
    "nav.publications": "發表",
    "nav.media": "影像",
    "nav.projects": "計畫",
    "nav.people": "成員",
    "nav.join": "加入我們",
    "nav.news": "近況",
    "nav.contact": "聯絡",

    "common.see_all": "查看全部 →",
    "common.see_more": "了解更多 →",
    "common.see_research": "了解我們的研究 →",
    "common.see_all_pubs": "查看所有論文 →",
    "common.see_all_projects": "查看所有計畫 →",
    "common.see_all_members": "查看所有成員 →",
    "common.see_all_media": "查看所有影像 →",
    "common.see_full_cv": "查看完整簡歷 →",
    "common.empty_news": "尚無動態。",
    "common.back_overview": "← 回動畫總覽",

    "section.news": "近況",
    "section.pi": "指導教授",
    "section.pi_label": "Principal Investigator",
    "section.research": "研究內容",
    "section.research_label": "Research",
    "section.media": "影像紀錄",
    "section.media_label": "Media",
    "section.selected_pubs": "精選發表",
    "section.selected_pubs_label": "Selected Publications",
    "section.recent_projects": "近期計畫",
    "section.projects_label": "Projects",
    "section.research_directions": "研究方向",
    "section.contact": "聯絡",
    "section.address": "地址",
    "section.address_hint": "台北科技大學忠孝校區綜合科館 6 樓（忠孝東路側）",
    "section.navigation": "導航",
    "section.openmap": "在 Google Maps 開啟",

    "footer.address_lines": [
      "10608 台北市忠孝東路三段 1 號",
      "綜合科館 614-2A",
      "國立臺北科技大學機械工程系",
    ],
    "footer.contact": "聯絡",
    "footer.contact_us": "聯絡我們 →",
    "footer.external": "外部連結",
    "footer.ntut": "臺北科技大學",
    "footer.copyright": "熱聲實驗室 Thermoacoustic Lab",

    "role.pi": "副教授",
    "role.pi_en_prefix": "Assoc. Prof.",
    "role.postdoc": "博士後",
    "role.phd": "博士生",
    "role.ms": "碩士生",
    "role.undergrad": "大學部專題生",
    "role.research-assistant": "研究助理",
    "role.alumni": "校友",

    "page.research.title": "研究",
    "page.research.subtitle": "Research",
    "page.research.active": "目前研究方向",
    "page.research.past": "歷年研究方向",
    "page.research.animations": "互動動畫",

    "page.pubs.title": "論文與發表",
    "page.pubs.subtitle": "Publications",

    "page.projects.title": "研究計畫",
    "page.projects.subtitle": "Funded Projects",

    "page.people.title": "成員",
    "page.people.subtitle": "People",
    "page.people.current": "現任成員",
    "page.people.alumni": "校友",

    "page.news.title": "近況",
    "page.news.subtitle": "News",

    "page.media.title": "影像紀錄",
    "page.media.subtitle": "Media",

    "page.contact.title": "聯絡",
    "page.contact.subtitle": "Contact",

    "page.join.title": "加入我們",
    "page.join.subtitle": "Join Us",

    "page.404.title": "頁面找不到",
    "page.404.message":
      "你輸入的網址不存在，或頁面已移除／改名。",
    "page.404.cta_home": "回首頁",
    "page.404.cta_research": "看研究內容",
  },

  en: {
    "site.title": "Thermoacoustic Lab",
    "site.title_full": "Thermoacoustic Lab",
    "site.subtitle": "熱聲實驗室",

    "nav.home": "Home",
    "nav.research": "Research",
    "nav.publications": "Publications",
    "nav.media": "Media",
    "nav.projects": "Projects",
    "nav.people": "People",
    "nav.join": "Join Us",
    "nav.news": "News",
    "nav.contact": "Contact",

    "common.see_all": "See all →",
    "common.see_more": "Learn more →",
    "common.see_research": "Explore our research →",
    "common.see_all_pubs": "See all publications →",
    "common.see_all_projects": "See all projects →",
    "common.see_all_members": "See all members →",
    "common.see_all_media": "See all media →",
    "common.see_full_cv": "Full CV →",
    "common.empty_news": "No news yet.",
    "common.back_overview": "← Back to animation index",

    "section.news": "News",
    "section.pi": "Principal Investigator",
    "section.pi_label": "Principal Investigator",
    "section.research": "Research",
    "section.research_label": "Research",
    "section.media": "Media",
    "section.media_label": "Media",
    "section.selected_pubs": "Selected Publications",
    "section.selected_pubs_label": "Selected Publications",
    "section.recent_projects": "Recent Projects",
    "section.projects_label": "Projects",
    "section.research_directions": "Research Interests",
    "section.contact": "Contact",
    "section.address": "Address",
    "section.address_hint":
      "6F, NTUT Zhongxiao Campus, Comprehensive Building (Zhongxiao E. Rd. side)",
    "section.navigation": "Directions",
    "section.openmap": "Open in Google Maps",

    "footer.address_lines": [
      "1, Section 3, Zhongxiao E. Road",
      "Taipei 10608, Taiwan",
      "Department of Mechanical Engineering",
      "National Taipei University of Technology",
      "Comprehensive Science Building 614-2A",
    ],
    "footer.contact": "Contact",
    "footer.contact_us": "Contact us →",
    "footer.external": "Links",
    "footer.ntut": "NTUT",
    "footer.copyright": "Thermoacoustic Lab",

    "role.pi": "Associate Professor",
    "role.pi_en_prefix": "Assoc. Prof.",
    "role.postdoc": "Postdoc",
    "role.phd": "PhD Student",
    "role.ms": "MS Student",
    "role.undergrad": "Undergraduate",
    "role.research-assistant": "Research Assistant",
    "role.alumni": "Alumni",

    "page.research.title": "Research",
    "page.research.subtitle": "Research",
    "page.research.active": "Current Directions",
    "page.research.past": "Past Directions",
    "page.research.animations": "Interactive Animations",

    "page.pubs.title": "Publications",
    "page.pubs.subtitle": "Publications",

    "page.projects.title": "Funded Projects",
    "page.projects.subtitle": "Funded Projects",

    "page.people.title": "People",
    "page.people.subtitle": "People",
    "page.people.current": "Current Members",
    "page.people.alumni": "Alumni",

    "page.news.title": "News",
    "page.news.subtitle": "News",

    "page.media.title": "Media",
    "page.media.subtitle": "Media",

    "page.contact.title": "Contact",
    "page.contact.subtitle": "Contact",

    "page.join.title": "Join Us",
    "page.join.subtitle": "Join Us",

    "page.404.title": "Page not found",
    "page.404.message":
      "The URL you entered does not exist, or the page has been removed or renamed.",
    "page.404.cta_home": "Back to home",
    "page.404.cta_research": "See research",
  },
} as const;

export type UIKey = keyof (typeof ui)["zh"];

export function getLangFromUrl(url: URL): Lang {
  const [, first] = url.pathname.split("/");
  if (first === "en") return "en";
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t<K extends UIKey>(key: K): (typeof ui)["zh"][K] {
    return (ui[lang][key] ?? ui[defaultLang][key]) as (typeof ui)["zh"][K];
  };
}

/** Translate a path between locales. /people → /en/people, /en/people → /people */
export function translatePath(pathname: string, target: Lang): string {
  const cleaned = pathname.replace(/^\/en(\/|$)/, "/").replace(/\/$/, "") || "/";
  if (target === "en") {
    return cleaned === "/" ? "/en/" : `/en${cleaned}`;
  }
  return cleaned === "" ? "/" : cleaned;
}
