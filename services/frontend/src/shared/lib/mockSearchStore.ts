import type {
  RecentSearchItem,
  RecentSearchesResponse,
  SaveRecentSearchRequest,
  SearchAutocompleteResponse,
  SearchMessageResponse,
  SearchNewsItem,
  SearchStockItem,
} from "@/shared/types/search";

type SearchNewsSeed = SearchNewsItem & {
  keywords: string[];
};

const stockSeeds: SearchStockItem[] = [
  { id: 1, ticker: "005930", name: "삼성전자", gicsSector: "반도체", currentPrice: 73200, fluctuationRate: 1.64 },
  { id: 2, ticker: "000660", name: "SK하이닉스", gicsSector: "반도체", currentPrice: 184300, fluctuationRate: 2.28 },
  { id: 3, ticker: "035420", name: "NAVER", gicsSector: "인터넷 서비스", currentPrice: 185400, fluctuationRate: 1.24 },
  { id: 4, ticker: "035720", name: "카카오", gicsSector: "인터넷 서비스", currentPrice: 42150, fluctuationRate: -2.15 },
  { id: 5, ticker: "000270", name: "기아", gicsSector: "자동차", currentPrice: 103500, fluctuationRate: 0.94 },
  { id: 6, ticker: "012330", name: "현대모비스", gicsSector: "자동차", currentPrice: 251500, fluctuationRate: -0.38 },
  { id: 7, ticker: "042700", name: "한미반도체", gicsSector: "반도체 장비", currentPrice: 118400, fluctuationRate: 2.11 },
  { id: 8, ticker: "373220", name: "LG에너지솔루션", gicsSector: "이차전지", currentPrice: 341000, fluctuationRate: 1.67 },
  { id: 9, ticker: "247540", name: "에코프로비엠", gicsSector: "이차전지", currentPrice: 174200, fluctuationRate: 2.74 },
  { id: 10, ticker: "068270", name: "셀트리온", gicsSector: "바이오", currentPrice: 181200, fluctuationRate: -0.64 },
  { id: 11, ticker: "207940", name: "삼성바이오로직스", gicsSector: "바이오", currentPrice: 810000, fluctuationRate: 0.0 },
  { id: 12, ticker: "005380", name: "현대차", gicsSector: "자동차", currentPrice: 218000, fluctuationRate: 1.12 },
  { id: 13, ticker: "105560", name: "KB금융", gicsSector: "금융", currentPrice: 87700, fluctuationRate: -0.56 },
  { id: 14, ticker: "055550", name: "신한지주", gicsSector: "금융", currentPrice: 55300, fluctuationRate: 0.82 },
  { id: 15, ticker: "086790", name: "하나금융지주", gicsSector: "금융", currentPrice: 61200, fluctuationRate: 0.84 },
  { id: 16, ticker: "316140", name: "우리금융지주", gicsSector: "금융", currentPrice: 16210, fluctuationRate: 0.48 },
  { id: 17, ticker: "323410", name: "카카오뱅크", gicsSector: "금융", currentPrice: 22350, fluctuationRate: -1.18 },
  { id: 18, ticker: "028260", name: "삼성물산", gicsSector: "산업재", currentPrice: 145800, fluctuationRate: 0.53 },
  { id: 19, ticker: "034730", name: "SK", gicsSector: "지주사", currentPrice: 162300, fluctuationRate: -0.22 },
  { id: 20, ticker: "003550", name: "LG", gicsSector: "지주사", currentPrice: 75600, fluctuationRate: 0.31 },
  { id: 21, ticker: "011200", name: "HMM", gicsSector: "운송", currentPrice: 19760, fluctuationRate: 1.36 },
  { id: 22, ticker: "329180", name: "HD현대중공업", gicsSector: "조선", currentPrice: 244000, fluctuationRate: 1.32 },
  { id: 23, ticker: "009540", name: "HD한국조선해양", gicsSector: "조선", currentPrice: 214000, fluctuationRate: 3.12 },
  { id: 24, ticker: "042660", name: "한화오션", gicsSector: "조선", currentPrice: 39550, fluctuationRate: 2.08 },
  { id: 25, ticker: "012450", name: "한화에어로스페이스", gicsSector: "방산", currentPrice: 385000, fluctuationRate: 4.41 },
  { id: 26, ticker: "079550", name: "LIG넥스원", gicsSector: "방산", currentPrice: 213500, fluctuationRate: 1.36 },
  { id: 27, ticker: "000810", name: "삼성화재", gicsSector: "보험", currentPrice: 356000, fluctuationRate: 0.74 },
  { id: 28, ticker: "032830", name: "삼성생명", gicsSector: "보험", currentPrice: 94800, fluctuationRate: 0.41 },
  { id: 29, ticker: "006400", name: "삼성SDI", gicsSector: "이차전지", currentPrice: 362500, fluctuationRate: 1.08 },
  { id: 30, ticker: "003670", name: "포스코퓨처엠", gicsSector: "이차전지", currentPrice: 237500, fluctuationRate: 1.18 },
  { id: 31, ticker: "066970", name: "엘앤에프", gicsSector: "이차전지", currentPrice: 114800, fluctuationRate: 1.73 },
  { id: 32, ticker: "096770", name: "SK이노베이션", gicsSector: "에너지", currentPrice: 111300, fluctuationRate: 1.12 },
  { id: 33, ticker: "051910", name: "LG화학", gicsSector: "화학", currentPrice: 319500, fluctuationRate: -0.88 },
  { id: 34, ticker: "011170", name: "롯데케미칼", gicsSector: "화학", currentPrice: 97300, fluctuationRate: -0.42 },
  { id: 35, ticker: "010950", name: "S-Oil", gicsSector: "에너지", currentPrice: 67800, fluctuationRate: -0.42 },
  { id: 36, ticker: "267250", name: "HD현대", gicsSector: "지주사", currentPrice: 81400, fluctuationRate: 0.92 },
  { id: 37, ticker: "010130", name: "고려아연", gicsSector: "소재", currentPrice: 521000, fluctuationRate: 0.61 },
  { id: 38, ticker: "005490", name: "POSCO홀딩스", gicsSector: "철강", currentPrice: 432500, fluctuationRate: 0.92 },
  { id: 39, ticker: "034020", name: "두산에너빌리티", gicsSector: "산업재", currentPrice: 21950, fluctuationRate: 1.27 },
  { id: 40, ticker: "000150", name: "두산", gicsSector: "산업재", currentPrice: 238000, fluctuationRate: 0.88 },
  { id: 41, ticker: "241560", name: "두산밥캣", gicsSector: "기계", currentPrice: 48950, fluctuationRate: 1.63 },
  { id: 42, ticker: "000100", name: "유한양행", gicsSector: "제약", currentPrice: 132400, fluctuationRate: 1.44 },
  { id: 43, ticker: "128940", name: "한미약품", gicsSector: "제약", currentPrice: 287500, fluctuationRate: -0.35 },
  { id: 44, ticker: "145020", name: "휴젤", gicsSector: "바이오", currentPrice: 318000, fluctuationRate: 0.57 },
  { id: 45, ticker: "000720", name: "현대건설", gicsSector: "건설", currentPrice: 33900, fluctuationRate: 0.82 },
  { id: 46, ticker: "375500", name: "DL이앤씨", gicsSector: "건설", currentPrice: 34350, fluctuationRate: -0.51 },
  { id: 47, ticker: "051900", name: "LG생활건강", gicsSector: "생활용품", currentPrice: 329000, fluctuationRate: -0.76 },
  { id: 48, ticker: "090430", name: "아모레퍼시픽", gicsSector: "화장품", currentPrice: 131200, fluctuationRate: 1.07 },
  { id: 49, ticker: "352820", name: "하이브", gicsSector: "엔터테인먼트", currentPrice: 228500, fluctuationRate: 1.19 },
  { id: 50, ticker: "259960", name: "크래프톤", gicsSector: "게임", currentPrice: 292500, fluctuationRate: 1.45 },
  { id: 51, ticker: "036570", name: "엔씨소프트", gicsSector: "게임", currentPrice: 212000, fluctuationRate: -0.64 },
  { id: 52, ticker: "251270", name: "넷마블", gicsSector: "게임", currentPrice: 62400, fluctuationRate: 0.72 },
  { id: 53, ticker: "017670", name: "SK텔레콤", gicsSector: "통신", currentPrice: 56700, fluctuationRate: 0.28 },
  { id: 54, ticker: "030200", name: "KT", gicsSector: "통신", currentPrice: 45100, fluctuationRate: 0.14 },
  { id: 55, ticker: "032640", name: "LG유플러스", gicsSector: "통신", currentPrice: 11120, fluctuationRate: -0.11 },
  { id: 56, ticker: "066570", name: "LG전자", gicsSector: "전자제품", currentPrice: 105300, fluctuationRate: -1.33 },
  { id: 57, ticker: "009150", name: "삼성전기", gicsSector: "전자부품", currentPrice: 148600, fluctuationRate: 0.52 },
  { id: 58, ticker: "011070", name: "LG이노텍", gicsSector: "전자부품", currentPrice: 221000, fluctuationRate: -1.14 },
  { id: 59, ticker: "003230", name: "삼양식품", gicsSector: "음식료", currentPrice: 538000, fluctuationRate: 2.04 },
  { id: 60, ticker: "271560", name: "오리온", gicsSector: "음식료", currentPrice: 116400, fluctuationRate: 0.34 },
  { id: 61, ticker: "004370", name: "농심", gicsSector: "음식료", currentPrice: 384000, fluctuationRate: -0.22 },
  { id: 62, ticker: "139480", name: "이마트", gicsSector: "유통", currentPrice: 74500, fluctuationRate: -0.84 },
  { id: 63, ticker: "008770", name: "호텔신라", gicsSector: "유통", currentPrice: 49500, fluctuationRate: 0.48 },
  { id: 64, ticker: "023530", name: "롯데쇼핑", gicsSector: "유통", currentPrice: 68400, fluctuationRate: -0.37 },
  { id: 65, ticker: "086280", name: "현대글로비스", gicsSector: "물류", currentPrice: 122900, fluctuationRate: -0.38 },
  { id: 66, ticker: "003490", name: "대한항공", gicsSector: "항공", currentPrice: 22150, fluctuationRate: 0.67 },
  { id: 67, ticker: "020560", name: "아시아나항공", gicsSector: "항공", currentPrice: 10460, fluctuationRate: -0.48 },
  { id: 68, ticker: "018260", name: "삼성에스디에스", gicsSector: "IT서비스", currentPrice: 151400, fluctuationRate: 0.64 },
  { id: 69, ticker: "047810", name: "한국항공우주", gicsSector: "방산", currentPrice: 60400, fluctuationRate: 0.95 },
  { id: 70, ticker: "034220", name: "LG디스플레이", gicsSector: "디스플레이", currentPrice: 10420, fluctuationRate: -0.72 },
];

const newsSeeds: SearchNewsSeed[] = [
  {
    id: 101,
    title: "삼성전자와 SK하이닉스, HBM 수요 기대감에 동반 강세",
    publisher: "한국경제",
    publishedAt: new Date(Date.now() - 15 * 60_000).toISOString(),
    keywords: ["삼성전자", "sk하이닉스", "hbm", "반도체", "005930", "000660"],
  },
  {
    id: 102,
    title: "NAVER, AI 검색 고도화 전략 공개",
    publisher: "매일경제",
    publishedAt: new Date(Date.now() - 42 * 60_000).toISOString(),
    keywords: ["naver", "검색", "ai", "035420"],
  },
  {
    id: 103,
    title: "카카오, 플랫폼 개편 이후 광고 회복 기대",
    publisher: "이데일리",
    publishedAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    keywords: ["카카오", "플랫폼", "광고", "035720"],
  },
  {
    id: 104,
    title: "기아와 현대모비스, 전기차 밸류체인 재평가",
    publisher: "서울경제",
    publishedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    keywords: ["기아", "현대모비스", "자동차", "전기차", "000270", "012330"],
  },
  {
    id: 105,
    title: "에코프로비엠, 이차전지 업황 반등 기대감 부각",
    publisher: "연합뉴스",
    publishedAt: new Date(Date.now() - 5 * 60 * 60_000).toISOString(),
    keywords: ["에코프로비엠", "이차전지", "247540"],
  },
  {
    id: 106,
    title: "삼성바이오로직스, 대규모 수주 기대감에 바이오 대형주 강세",
    publisher: "조선비즈",
    publishedAt: new Date(Date.now() - 7 * 60 * 60_000).toISOString(),
    keywords: ["삼성바이오로직스", "207940", "바이오", "수주", "셀트리온", "휴젤"],
  },
  {
    id: 107,
    title: "현대차·기아, 미국 판매 호조에 자동차주 투자심리 개선",
    publisher: "한국경제",
    publishedAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    keywords: ["현대차", "기아", "005380", "000270", "자동차", "현대모비스", "전기차"],
  },
  {
    id: 108,
    title: "KB금융·신한지주, 배당 매력 부각되며 금융주 강세",
    publisher: "매일경제",
    publishedAt: new Date(Date.now() - 95 * 60_000).toISOString(),
    keywords: ["KB금융", "신한지주", "하나금융지주", "우리금융지주", "금융", "배당", "은행"],
  },
  {
    id: 109,
    title: "카카오뱅크, 여신 성장 둔화 우려에도 플랫폼 확장 기대 공존",
    publisher: "이데일리",
    publishedAt: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
    keywords: ["카카오뱅크", "323410", "인터넷은행", "플랫폼", "금융"],
  },
  {
    id: 110,
    title: "HD현대중공업·한화오션, 친환경 선박 수요에 조선주 재부각",
    publisher: "서울경제",
    publishedAt: new Date(Date.now() - 55 * 60_000).toISOString(),
    keywords: ["HD현대중공업", "HD한국조선해양", "한화오션", "조선", "친환경선박", "329180", "009540", "042660"],
  },
  {
    id: 111,
    title: "한화에어로스페이스와 LIG넥스원, 방산 수출 모멘텀 확대",
    publisher: "연합뉴스",
    publishedAt: new Date(Date.now() - 2.5 * 60 * 60_000).toISOString(),
    keywords: ["한화에어로스페이스", "LIG넥스원", "방산", "수출", "012450", "079550", "한국항공우주"],
  },
  {
    id: 112,
    title: "LG에너지솔루션·삼성SDI, 배터리 업황 반등 기대에 상승세",
    publisher: "머니투데이",
    publishedAt: new Date(Date.now() - 35 * 60_000).toISOString(),
    keywords: ["LG에너지솔루션", "삼성SDI", "포스코퓨처엠", "엘앤에프", "이차전지", "배터리", "373220", "006400"],
  },
  {
    id: 113,
    title: "LG화학·롯데케미칼, 화학 업황 바닥론에 저가 매수세 유입",
    publisher: "파이낸셜뉴스",
    publishedAt: new Date(Date.now() - 6 * 60 * 60_000).toISOString(),
    keywords: ["LG화학", "롯데케미칼", "화학", "051910", "011170", "S-Oil", "정유"],
  },
  {
    id: 114,
    title: "POSCO홀딩스·고려아연, 비철금속 가격 반등에 소재주 강세",
    publisher: "아시아경제",
    publishedAt: new Date(Date.now() - 8 * 60 * 60_000).toISOString(),
    keywords: ["POSCO홀딩스", "고려아연", "철강", "소재", "005490", "010130"],
  },
  {
    id: 115,
    title: "하이브·크래프톤, 실적 시즌 앞두고 엔터·게임주 관심 확대",
    publisher: "전자신문",
    publishedAt: new Date(Date.now() - 3.5 * 60 * 60_000).toISOString(),
    keywords: ["하이브", "크래프톤", "엔씨소프트", "넷마블", "엔터", "게임", "352820", "259960"],
  },
  {
    id: 116,
    title: "SK텔레콤·KT, AI 인프라 투자 확대에 통신주 방어력 주목",
    publisher: "디지털타임스",
    publishedAt: new Date(Date.now() - 7.5 * 60 * 60_000).toISOString(),
    keywords: ["SK텔레콤", "KT", "LG유플러스", "통신", "AI", "017670", "030200", "032640"],
  },
  {
    id: 117,
    title: "이마트·호텔신라, 소비 회복 기대와 면세 수요 개선 전망",
    publisher: "헤럴드경제",
    publishedAt: new Date(Date.now() - 9 * 60 * 60_000).toISOString(),
    keywords: ["이마트", "호텔신라", "롯데쇼핑", "유통", "면세", "139480", "008770", "023530"],
  },
  {
    id: 118,
    title: "대한항공·현대글로비스, 물류 정상화 흐름에 운송주 강보합",
    publisher: "매일경제",
    publishedAt: new Date(Date.now() - 11 * 60 * 60_000).toISOString(),
    keywords: ["대한항공", "현대글로비스", "HMM", "아시아나항공", "항공", "물류", "운송"],
  },
  {
    id: 119,
    title: "LG전자·삼성전기·LG이노텍, 전장 수요에 전자부품주 동반 상승",
    publisher: "한국경제TV",
    publishedAt: new Date(Date.now() - 105 * 60_000).toISOString(),
    keywords: ["LG전자", "삼성전기", "LG이노텍", "전자부품", "전장", "066570", "009150", "011070"],
  },
  {
    id: 120,
    title: "유한양행·한미약품, 신약 파이프라인 기대감에 제약주 차별화",
    publisher: "연합뉴스",
    publishedAt: new Date(Date.now() - 13 * 60 * 60_000).toISOString(),
    keywords: ["유한양행", "한미약품", "제약", "신약", "000100", "128940", "셀트리온"],
  },
  {
    id: 121,
    title: "현대건설·DL이앤씨, 해외 수주 기대감에 건설주 반등",
    publisher: "서울경제",
    publishedAt: new Date(Date.now() - 14 * 60 * 60_000).toISOString(),
    keywords: ["현대건설", "DL이앤씨", "건설", "해외수주", "000720", "375500"],
  },
  {
    id: 122,
    title: "LG생활건강·아모레퍼시픽, 중국 소비 회복 기대에 화장품주 강세",
    publisher: "이데일리",
    publishedAt: new Date(Date.now() - 16 * 60 * 60_000).toISOString(),
    keywords: ["LG생활건강", "아모레퍼시픽", "화장품", "생활용품", "051900", "090430"],
  },
  {
    id: 123,
    title: "삼양식품·오리온·농심, 음식료주 실적 방어력 부각",
    publisher: "한국경제",
    publishedAt: new Date(Date.now() - 18 * 60 * 60_000).toISOString(),
    keywords: ["삼양식품", "오리온", "농심", "음식료", "라면", "제과", "003230", "271560", "004370"],
  },
  {
    id: 124,
    title: "삼성에스디에스·NAVER, 기업용 AI 수요 확대로 IT서비스 기대감",
    publisher: "전자신문",
    publishedAt: new Date(Date.now() - 19 * 60 * 60_000).toISOString(),
    keywords: ["삼성에스디에스", "NAVER", "IT서비스", "AI", "018260", "035420", "클라우드"],
  },
];

const initialRecentSearches: RecentSearchItem[] = [
  {
    keyword: "삼성전자",
    searchedAt: new Date(Date.now() - 25 * 60_000).toISOString(),
    stockId: 1,
  },
  {
    keyword: "반도체",
    searchedAt: new Date(Date.now() - 80 * 60_000).toISOString(),
    stockId: null,
  },
];

const recentSearchStore = [...initialRecentSearches];
const chosungList = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function extractChosung(value: string) {
  return [...value]
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < 44032 || code > 55203) {
        return char;
      }

      const index = Math.floor((code - 44032) / 588);
      return chosungList[index] ?? char;
    })
    .join("");
}

function matchesKeyword(target: string, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return false;
  }

  const normalizedTarget = normalizeSearchText(target);
  if (normalizedTarget.includes(normalizedQuery)) {
    return true;
  }

  return extractChosung(target).includes(normalizedQuery);
}

function jitterPrice(base: number, spread = 800) {
  return Math.max(1000, Math.round(base + (Math.random() - 0.5) * spread));
}

function jitterRate(base: number, spread = 0.32) {
  return Number((base + (Math.random() - 0.5) * spread).toFixed(2));
}

export function getMockSearchAutocomplete(query: string): SearchAutocompleteResponse {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      stocks: [],
      news: [],
    };
  }

  const stocks = stockSeeds
    .filter((item) => {
      return [item.name, item.ticker, item.gicsSector].some((target) => matchesKeyword(target, trimmedQuery));
    })
    .slice(0, 8)
    .map((item) => ({
      ...item,
      currentPrice: jitterPrice(item.currentPrice),
      fluctuationRate: jitterRate(item.fluctuationRate),
    }));

  const news = newsSeeds
    .filter((item) => {
      return [item.title, item.publisher, ...item.keywords].some((target) => matchesKeyword(target, trimmedQuery));
    })
    .slice(0, 6)
    .map(({ id, title, publisher, publishedAt }) => ({
      id,
      title,
      publisher,
      publishedAt,
    }));

  return {
    stocks,
    news,
  };
}

export function getMockRecentSearches(): RecentSearchesResponse {
  return {
    recent: [...recentSearchStore]
      .sort((a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime())
      .slice(0, 10),
  };
}

export function saveMockRecentSearch({ keyword, stockId }: SaveRecentSearchRequest): SearchMessageResponse {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) {
    return {
      message: "저장 완료",
    };
  }

  const existingIndex = recentSearchStore.findIndex((item) => {
    if (stockId !== null && item.stockId !== null) {
      return item.stockId === stockId;
    }

    return item.keyword === trimmedKeyword;
  });

  if (existingIndex >= 0) {
    recentSearchStore.splice(existingIndex, 1);
  }

  recentSearchStore.unshift({
    keyword: trimmedKeyword,
    searchedAt: new Date().toISOString(),
    stockId,
  });

  if (recentSearchStore.length > 10) {
    recentSearchStore.length = 10;
  }

  return {
    message: "저장 완료",
  };
}

export function deleteMockRecentSearch(keyword: string): SearchMessageResponse {
  const index = recentSearchStore.findIndex((item) => item.keyword === keyword);
  if (index >= 0) {
    recentSearchStore.splice(index, 1);
  }

  return {
    message: "삭제 완료",
  };
}

export function clearMockRecentSearches(): SearchMessageResponse {
  recentSearchStore.length = 0;

  return {
    message: "전체 삭제 완료",
  };
}
