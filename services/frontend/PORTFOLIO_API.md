# Portfolio API Spec

포트폴리오 페이지에서 현재 사용하는 프런트 공개 API 명세입니다.

기준:
- HTTP 요청/응답 바디는 실제 wire format 기준으로 `snake_case`
- 프런트 내부에서는 `apiFetch()`가 응답을 `camelCase`로 변환해서 사용
- 현재는 백엔드 API가 없어 프런트 route handler(`/api/portfolio`) mock으로 동작
- 프런트 클라이언트는 `useBaseUrl: false`로 로컬 route를 강제 사용

## 1. 포트폴리오 페이지 전체 조회

### `GET /api/portfolio`

설명:
- 포트폴리오 페이지 진입 시 필요한 전체 데이터를 한 번에 조회
- 상단 hero, 현재 보유 종목, 오늘 매매 내역, 월간 수익률, 우측 시그널 요약, 인기 종목 AI 신호, 명예의 전당 데이터 포함

Request Body:
- 없음

Response Body:
```json
{
  "success": true,
  "data": {
    "hero": {
      "updated_at_label": "오늘 09:00 업데이트 완료",
      "title": "의장 모의투자 포트폴리오",
      "description": "KOSPI 200 전 종목을 대상으로 매일 위원회 합의를 거쳐 운용되는 공식 모델 포트폴리오입니다",
      "metrics": [
        {
          "id": "cumulative-return",
          "label": "누적 수익률",
          "value": 42.5,
          "unit": "%",
          "decimals": 1,
          "tone": "danger"
        }
      ]
    },
    "holdings": [
      {
        "stock_id": 2,
        "ticker": "000660",
        "name": "SK하이닉스",
        "buy_price": 142000,
        "current_price": 162500,
        "holding_days": 14,
        "return_rate": 14.44
      }
    ],
    "today_trades": [
      {
        "id": 1,
        "stock_id": 15,
        "ticker": "042700",
        "name": "한미반도체",
        "action": "BUY",
        "executed_at": "09:12",
        "executed_price": 118500,
        "current_price": 124700,
        "return_rate": 5.23
      }
    ],
    "monthly_returns": [
      {
        "month": "2025.04",
        "portfolio_return_rate": 4.2,
        "kospi_return_rate": 1.1,
        "excess_return_rate": 3.1
      }
    ],
    "signal_summary": {
      "base_universe_label": "KOSPI 200 종목 기준",
      "buy_count": 15,
      "sell_count": 8,
      "hold_count": 124,
      "watch_count": 53
    },
    "popular_signals": [
      {
        "rank": 1,
        "stock_id": 1,
        "ticker": "005930",
        "name": "삼성전자",
        "price": 74300,
        "action": "BUY"
      }
    ],
    "hall_of_fame": [
      {
        "id": "hit-rate",
        "title": "예측 적중률 TOP 5",
        "tone": "info",
        "items": [
          {
            "rank": 1,
            "name": "삼성바이오로직스",
            "value": 94.2,
            "suffix": "%"
          }
        ]
      }
    ]
  },
  "message": null
}
```

## 2. 필드 설명

### `hero`
- 페이지 최상단 제목/설명/요약 지표 영역

### `holdings`
- 현재 보유 종목 목록
- 프런트는 데스크톱에서는 페이지네이션, 모바일/태블릿에서는 더보기 방식으로 클라이언트 처리

### `today_trades`
- 오늘 발생한 매수/매도 내역

### `monthly_returns`
- 월간 포트폴리오 수익률, 코스피 수익률, 초과 수익률

### `signal_summary`
- 오늘의 시그널 요약 카드

### `popular_signals`
- 인기 종목 AI 신호 카드

### `hall_of_fame`
- 명예의 전당 4개 섹션 데이터
- `tone`: `info | danger | warning | success`

## 3. 임시 호환 경로

### `GET /api/portfoilo`

설명:
- 기존 요청 문구에 있던 오타 경로 호환용 alias
- 프런트 mock에서는 동일 응답을 반환하지만, 백엔드 정식 구현은 `/api/portfolio`로 맞추는 것을 권장

## 4. 에러 응답 예시

### `500 Internal Server Error`
```json
{
  "success": false,
  "data": null,
  "message": "Portfolio service unavailable"
}
```

## 5. 프런트 사용 매핑

- 상단 hero/지표: `hero`
- 현재 보유 종목 탭: `holdings`
- 오늘 매매 내역 탭: `today_trades`
- 월간 수익률 추이 탭: `monthly_returns`
- 오늘의 시그널 요약: `signal_summary`
- 인기 종목 AI 신호: `popular_signals`
- 명예의 전당: `hall_of_fame`
