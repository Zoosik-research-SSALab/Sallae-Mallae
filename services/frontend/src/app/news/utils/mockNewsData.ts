import type { NewsItem, NewsPayload, NewsQueryParams, NewsSearchPayload } from "../types/news";
import { normalizeNewsKeyword } from "./newsQueryUtils";
import { NEWS_PAGE_SIZE } from "./newsConstants";

export { NEWS_PAGE_SIZE };

// ─── Mock-only constants ────────────────────────────────────────────────────

export const WATCHLIST_NEWS_STOCKS = ["삼성전자", "SK하이닉스", "NAVER", "현대차", "기아", "셀트리온"];

// ─── Mock news seed generation ──────────────────────────────────────────────

type MockNewsSeed = NewsItem & { views: number };

type NewsTemplate = {
  title: string;
  publisher: string;
  relatedStocks: string[];
};

const NEWS_PUBLISHED_OFFSETS_MINUTES = [
  1, 15, 60, 120, 180, 240, 360, 720, 1_440, 2_880, 4_320, 5_760, 10_080,
  14_400, 20_160, 28_800, 36_000, 43_200, 50_400, 57_600, 64_800, 72_000,
  79_200, 86_400,
];

const NEWS_TITLE_SUFFIXES = ["", " 투자 시선 확대", " 시장 반응 점검", " 후속 분석"];

const NEWS_TEMPLATES: NewsTemplate[] = [
  {
    title: '"AI 랠리는 이제 시작"... 외국인 \'Buy 코리아\'에 반도체주 연일 강세',
    publisher: "한국경제",
    relatedStocks: ["삼성전자", "SK하이닉스", "한미반도체"],
  },
  {
    title: "플랫폼 규제 불확실성 지속... NAVER·카카오 성장성 우려 재부각",
    publisher: "매일경제",
    relatedStocks: ["NAVER", "카카오"],
  },
  {
    title: '"저평가 매력 부각"... 밸류업 수혜 금융주, 주주환원 확대 기대',
    publisher: "이데일리",
    relatedStocks: ["KB금융", "신한지주", "하나금융지주"],
  },
  {
    title: "현대차·기아, 북미 판매량 역대 최대... 하반기 실적 기대감 확대",
    publisher: "조선비즈",
    relatedStocks: ["현대차", "기아"],
  },
  {
    title: "미 연준 금리 인하 신중론 지속... 코스피 외국인 수급 변수 부상",
    publisher: "연합인포맥스",
    relatedStocks: ["삼성전자", "KB금융"],
  },
  {
    title: "바이오시밀러 유럽 승인 임박... 제약·바이오 섹터 투자심리 회복",
    publisher: "한국경제",
    relatedStocks: ["셀트리온", "삼성바이오로직스"],
  },
  {
    title: "HBM 공급 확대 본격화... 소부장 밸류체인 재평가 기대",
    publisher: "서울경제",
    relatedStocks: ["한미반도체", "ISC", "리노공업"],
  },
  {
    title: "2차전지 조정 국면 이어져도 수주 모멘텀 유효... 중장기 관점 유지",
    publisher: "머니투데이",
    relatedStocks: ["에코프로", "포스코퓨처엠", "LG에너지솔루션"],
  },
  {
    title: "조선주 수주 공백 우려 완화... LNG선 발주 기대에 실적 전망 상향",
    publisher: "파이낸셜뉴스",
    relatedStocks: ["HD한국조선해양", "한화오션", "삼성중공업"],
  },
  {
    title: "방산 수출 모멘텀 지속... 중동·유럽 수주 기대에 신고가 경신",
    publisher: "아시아경제",
    relatedStocks: ["한화에어로스페이스", "LIG넥스원", "현대로템"],
  },
  {
    title: "엔터주 투어 라인업 기대감... 글로벌 팬덤 확장에 실적 상향 가능성",
    publisher: "데일리안",
    relatedStocks: ["하이브", "JYP Ent.", "에스엠"],
  },
  {
    title: "전력 인프라 투자 확대 기대... 친환경 설비주에 기관 매수 유입",
    publisher: "아주경제",
    relatedStocks: ["두산에너빌리티", "씨에스윈드", "대명에너지"],
  },
];

function buildMockNewsUrl(id: number) {
  return `https://news.sallaemallae.mock/articles/${id}`;
}

function buildMockNewsSeeds(): MockNewsSeed[] {
  const now = Date.now();

  return NEWS_PUBLISHED_OFFSETS_MINUTES.map((offsetMinutes, index) => {
    const template = NEWS_TEMPLATES[index % NEWS_TEMPLATES.length];
    const suffix = NEWS_TITLE_SUFFIXES[Math.floor(index / NEWS_TEMPLATES.length)] ?? "";

    return {
      id: index + 1,
      title: `${template.title}${suffix}`,
      publisher: template.publisher,
      publishedAt: new Date(now - offsetMinutes * 60_000).toISOString(),
      relatedStocks: template.relatedStocks,
      url: buildMockNewsUrl(index + 1),
      views: 18_000 - index * 370 + template.relatedStocks.length * 120,
    };
  });
}

export function getMockNewsSeeds(): MockNewsSeed[] {
  return buildMockNewsSeeds();
}

// ─── Mock API response builders ─────────────────────────────────────────────

const NEWS_SEARCH_KEYWORDS = [
  "삼성전자", "SK하이닉스", "NAVER", "카카오", "현대차", "기아", "셀트리온",
  "삼성바이오로직스", "한미반도체", "밸류업", "금리 인하", "AI 랠리", "2차전지", "조선", "방산",
];

export function getMockNewsResponse(params: NewsQueryParams): NewsPayload {
  const normalizedKeyword = normalizeNewsKeyword(params.keyword);

  const filteredNews = getMockNewsSeeds()
    .filter((item) => {
      if (!normalizedKeyword) return true;
      const haystack = [item.title, item.publisher, ...item.relatedStocks].join(" ").toLowerCase();
      return haystack.includes(normalizedKeyword);
    })
    .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime());

  return {
    news: filteredNews
      .slice(params.offset, params.offset + params.limit)
      .map(({ id, title, publisher, publishedAt, relatedStocks, url }) => ({
        id, title, publisher, publishedAt, relatedStocks, url,
      })),
  };
}

export function getMockNewsSearchResponse(keyword: string, limit: number): NewsSearchPayload {
  const normalizedKeyword = normalizeNewsKeyword(keyword);

  const matchedKeywords = NEWS_SEARCH_KEYWORDS.filter((item) => {
    if (!normalizedKeyword) return true;
    return item.toLowerCase().includes(normalizedKeyword);
  }).slice(0, limit);

  return { keywords: matchedKeywords };
}
