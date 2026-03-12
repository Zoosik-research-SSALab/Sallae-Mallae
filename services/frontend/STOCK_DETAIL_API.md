# Stock Detail API Spec

종목 상세 페이지에서 현재 사용하는 프런트 공개 API 명세입니다.

기준:
- HTTP 요청/응답 바디는 실제 wire format 기준으로 `snake_case`
- 프런트 내부에서는 `apiFetch()`가 응답을 `camelCase`로 변환해서 사용
- 종목 상세 조회 계열은 `ticker` 기준 경로
- 관심종목/알림 계열은 `stock_id` 기준 경로

## 1. 종목 기본 정보 조회

### `GET /api/stocks/{ticker}`

설명:
- 종목명, 티커, 시장/섹터, 마감 기준 시각 등 상단 개요 영역에 필요한 데이터 조회

Request Body:
- 없음

Response Body:
```json
{
  "id": 1,
  "ticker": "005930",
  "name": "삼성전자",
  "market_type": "KOSPI",
  "gics_sector": "반도체",
  "category": "KOSPI 200",
  "base_time": "2026-03-12T15:30:00+09:00"
}
```

## 2. 종목 가격 차트 스트림 조회

### `GET /api/stocks/{ticker}/prices?period={period}`

설명:
- 가격 차트 영역에서 사용하는 SSE 스트림

Request Method:
- `GET`

Query Params:
- `period`: `1MIN | 1D | 1W | 1M | 3M | 1Y | 3Y`

Request Body:
- 없음

Response Body:
- `text/event-stream`
- 각 이벤트 `data:` payload 형식:

```json
{
  "prices": [
    {
      "timestamp": "2026-03-12T15:30:00+09:00",
      "open": 74100,
      "high": 74500,
      "low": 73900,
      "close": 74300,
      "volume": 1234567
    }
  ]
}
```

## 3. 투자 주요 지표 조회

### `GET /api/stocks/{ticker}/indicators`

설명:
- 가치평가 / 수익 / 배당 카드에 필요한 지표 조회

Request Body:
- 없음

Response Body:
```json
{
  "valuation": {
    "per": 26.1,
    "psr": 3.5,
    "pbr": 2.7
  },
  "earnings": {
    "eps": 6563,
    "bps": 63997,
    "roe": 10.8
  },
  "dividend": {
    "period_label": "최근 12개월",
    "payment_count": 4,
    "payment_months": "3월, 6월, 9월, 12월",
    "annual_dividend_per_share": 1668,
    "dividend_yield": 0.96
  }
}
```

## 4. 연간/분기 실적 조회

### `GET /api/stocks/{ticker}/financials?type={type}`

설명:
- 연간/분기 실적 분석 차트 및 우측 표에 필요한 데이터 조회

Query Params:
- `type`: `YEARLY | QUARTERLY`

Request Body:
- 없음

Response Body:
```json
{
  "financials": [
    {
      "year": 2025,
      "revenue": 302.1,
      "operating_profit": 32.4
    },
    {
      "year": 2026,
      "quarter": 1,
      "revenue": 78.4,
      "operating_profit": 8.9
    }
  ]
}
```

비고:
- `YEARLY` 응답에서는 `quarter`가 없어도 됨
- `QUARTERLY` 응답에서는 `quarter` 사용

## 5. 키워드 및 관련 뉴스 조회

### `GET /api/stocks/{ticker}/keywords`

설명:
- 종목 핵심 뉴스 섹션
- 키워드 3개와 키워드별 뉴스 3건씩 사용

Request Body:
- 없음

Response Body:
```json
{
  "keywords": [
    {
      "id": 1,
      "name": "HBM 공급망",
      "news": [
        {
          "id": 101,
          "title": "삼성전자, 차세대 HBM 양산 본격화 전망",
          "publisher": "한국경제",
          "published_at": "2026-03-12T14:30:00+09:00",
          "url": "https://example.com/news/101"
        }
      ]
    }
  ],
  "total_news_count": 9
}
```

## 6. 공시 목록 조회

### `GET /api/stocks/{ticker}/announcements?limit={limit}&offset={offset}`

설명:
- 최신 공시 목록
- 실적 관련 최신 공시 카드의 원본 데이터

Query Params:
- `limit`: 기본 `4`
- `offset`: 기본 `0`

Request Body:
- 없음

Response Body:
```json
{
  "total": 12,
  "announcements": [
    {
      "id": 1,
      "title": "현금ㆍ현물배당결정 (결산배당)",
      "announced_at": "2026-02-15T00:00:00+09:00"
    }
  ]
}
```

## 7. 공시 상세 조회

### `GET /api/stocks/{ticker}/announcements/{announcement_id}`

설명:
- 개별 공시 상세 내용/원문 URL 조회

Request Body:
- 없음

Response Body:
```json
{
  "id": 1,
  "title": "현금ㆍ현물배당결정 (결산배당)",
  "announced_at": "2026-02-15T00:00:00+09:00",
  "content": "공시 상세 본문",
  "url": "https://example.com/announcement/1"
}
```

## 8. 관심종목 상태 조회

### `GET /api/users/watchlist/{stock_id}`

설명:
- 종목 상세 우상단 `관심종목` / `알림 설정` 버튼 상태 조회

Request Body:
- 없음

Response Body:
```json
{
  "is_watched": true,
  "is_notified_enabled": false
}
```

## 9. 관심종목 추가

### `POST /api/users/watchlist`

설명:
- 관심종목 등록

Request Body:
```json
{
  "stock_id": 1
}
```

Response Body:
```json
{
  "message": "관심종목 추가 완료",
  "count": 14
}
```

## 10. 관심종목 삭제

### `DELETE /api/users/watchlist/{stock_id}`

설명:
- 관심종목 해제

Request Body:
- 없음

Response Body:
```json
{
  "message": "관심종목 삭제 완료",
  "count": 13
}
```

## 11. 관심종목 알림 토글

### `PATCH /api/users/watchlist/{stock_id}`

설명:
- 관심종목에 추가된 종목만 호출 가능

Request Body:
- 없음

Response Body:
```json
{
  "is_notified_enabled": true
}
```

## 에러 응답 예시

### `400 Bad Request`
```json
{
  "message": "stock_id is required"
}
```

### `404 Not Found`
```json
{
  "message": "Announcement not found"
}
```

## 프런트 사용 매핑

- 상단 개요: `GET /api/stocks/{ticker}`
- 가격 차트: `GET /api/stocks/{ticker}/prices?period=...` (SSE)
- 투자 주요 지표: `GET /api/stocks/{ticker}/indicators`
- 실적 분석: `GET /api/stocks/{ticker}/financials?type=YEARLY|QUARTERLY`
- 키워드 뉴스: `GET /api/stocks/{ticker}/keywords`
- 최신 공시: `GET /api/stocks/{ticker}/announcements?limit=4&offset=0`
- 관심종목 상태/등록/삭제/알림: `/api/users/watchlist*`
