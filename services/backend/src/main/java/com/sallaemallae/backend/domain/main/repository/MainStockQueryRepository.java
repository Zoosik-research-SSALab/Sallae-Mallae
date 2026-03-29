package com.sallaemallae.backend.domain.main.repository;

import com.sallaemallae.backend.domain.main.dto.NewSignalItemResponse;
import com.sallaemallae.backend.domain.main.dto.TopStockItemResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class MainStockQueryRepository {

    private static final LocalTime MARKET_CLOSE = LocalTime.of(15, 30);
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final EntityManager entityManager;

    /**
     * 현재 거래일 계산: KST 15:30(장 마감) 이후면 오늘, 이전이면 어제.
     * 주말/공휴일은 별도 처리 없이 <= 로 조회하여 직전 영업일 데이터를 자동 선택.
     */
    private LocalDate getCurrentTradingDate() {
        ZonedDateTime nowKst = ZonedDateTime.now(KST);
        if (nowKst.toLocalTime().isBefore(MARKET_CLOSE)) {
            return nowKst.toLocalDate().minusDays(1);
        }
        return nowKst.toLocalDate();
    }

    /**
     * 의장 confidence 상위 10종목 조회 (직전 영업일 report_date 기준, 종목별 최신 1건).
     * CTE로 최신 리포트를 한 번에 추출 후 JOIN하여 LATERAL 반복 실행을 최소화.
     */
    public List<TopStockItemResponse> getTopTenStocksToday() {
        LocalDate tradingDate = getCurrentTradingDate();

        String sql = """
            WITH latest_date AS (
                SELECT MAX(report_date) AS rd
                FROM ai_debate_reports
                WHERE report_date <= :tradingDate
            ),
            latest_reports AS (
                SELECT DISTINCT ON (stock_id) stock_id, chairman_signal, debate_confidence
                FROM ai_debate_reports
                WHERE report_date = (SELECT rd FROM latest_date)
                ORDER BY stock_id, created_at DESC, id DESC
            )
            SELECT s.id AS stock_id, s.name AS stock_name,
                   sp.close_price, sp.fluctuation_rate,
                   lr.chairman_signal, lr.debate_confidence
            FROM latest_reports lr
            JOIN stocks s ON s.id = lr.stock_id AND s.is_active = true
            JOIN LATERAL (
                SELECT close_price, fluctuation_rate
                FROM stock_prices_daily
                WHERE stock_id = s.id
                  AND trade_date <= :tradingDate
                ORDER BY trade_date DESC LIMIT 1
            ) sp ON true
            ORDER BY lr.debate_confidence DESC NULLS LAST
            LIMIT 10
            """;

        List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
            .setParameter("tradingDate", tradingDate)
            .getResultList();
        List<TopStockItemResponse> items = new ArrayList<>();
        int rank = 1;
        for (Tuple row : rows) {
            items.add(new TopStockItemResponse(
                rank++,
                row.get("stock_id", Number.class).longValue(),
                row.get("stock_name", String.class),
                row.get("close_price", Number.class).intValue(),
                toFloat(row.get("fluctuation_rate", Number.class)),
                row.get("chairman_signal", String.class),
                toPercentInt(row.get("debate_confidence", Number.class)),
                false
            ));
        }
        return items;
    }

    /** 매수 상위 3종목 (최근 거래일 기준, confidence DESC) */
    public List<NewSignalItemResponse> getTodayBuySignals() {
        return getSignalsByType("BUY");
    }

    /** 매도 상위 3종목 (최근 거래일 기준, confidence DESC) */
    public List<NewSignalItemResponse> getTodaySellSignals() {
        return getSignalsByType("SELL");
    }

    /** 카테고리별 최신 가격 데이터 (1분봉 우선, 없으면 일봉 fallback) */
    public List<Object[]> getCategoryStocksRaw() {
        String sql = """
            SELECT s.category, s.name,
                   COALESCE(m.close_price, d.close_price) AS close_price,
                   COALESCE(m.fluctuation_rate, d.fluctuation_rate) AS fluctuation_rate
            FROM stocks s
            LEFT JOIN LATERAL (
                SELECT close_price, fluctuation_rate
                FROM stock_prices_minute
                WHERE stock_id = s.id
                  AND trade_timestamp <= CURRENT_TIMESTAMP
                ORDER BY trade_timestamp DESC LIMIT 1
            ) m ON true
            LEFT JOIN LATERAL (
                SELECT close_price, fluctuation_rate
                FROM stock_prices_daily
                WHERE stock_id = s.id
                  AND trade_date <= CURRENT_DATE
                ORDER BY trade_date DESC LIMIT 1
            ) d ON true
            WHERE s.category IS NOT NULL
              AND s.is_active = true
              AND COALESCE(m.close_price, d.close_price) IS NOT NULL
            """;

        @SuppressWarnings("unchecked")
        List<Object[]> result = entityManager.createNativeQuery(sql).getResultList();
        return result;
    }

    /**
     * 종목 ID 목록에 대한 최신 가격 및 전일 대비 변동률 조회.
     * 현재가: 1분봉 우선, 없으면 일봉 fallback.
     * 변동률: (현재가 - 전일 종가) / 전일 종가 * 100 으로 계산.
     */
    public Map<Long, float[]> getLatestPrices(List<Long> stockIds) {
        if (stockIds == null || stockIds.isEmpty()) {
            return Map.of();
        }

        String sql = """
            SELECT s.id AS stock_id,
                   COALESCE(m.close_price, d.close_price) AS current_price,
                   prev.close_price AS prev_close_price
            FROM stocks s
            LEFT JOIN LATERAL (
                SELECT close_price
                FROM stock_prices_minute
                WHERE stock_id = s.id
                ORDER BY trade_timestamp DESC LIMIT 1
            ) m ON true
            LEFT JOIN LATERAL (
                SELECT close_price
                FROM stock_prices_daily
                WHERE stock_id = s.id
                ORDER BY trade_date DESC LIMIT 1
            ) d ON true
            LEFT JOIN LATERAL (
                SELECT close_price
                FROM stock_prices_daily
                WHERE stock_id = s.id
                  AND trade_date < CURRENT_DATE
                ORDER BY trade_date DESC LIMIT 1
            ) prev ON true
            WHERE s.id IN (:stockIds)
            """;

        List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
            .setParameter("stockIds", stockIds)
            .getResultList();

        Map<Long, float[]> result = new HashMap<>();
        for (Tuple row : rows) {
            Long stockId = row.get("stock_id", Number.class).longValue();
            Number currentNum = row.get("current_price", Number.class);
            Number prevNum = row.get("prev_close_price", Number.class);
            int price = currentNum != null ? currentNum.intValue() : 0;
            float rate = 0f;
            if (currentNum != null && prevNum != null && prevNum.floatValue() != 0f) {
                rate = (currentNum.floatValue() - prevNum.floatValue()) / prevNum.floatValue() * 100f;
            }
            result.put(stockId, new float[]{price, rate});
        }
        return result;
    }

    // ── private helpers ──

    /** ai_debate_reports에서 직전 영업일 report_date 기준으로 BUY/SELL 시그널 조회 (종목별 최신 1건) */
    private List<NewSignalItemResponse> getSignalsByType(String signalType) {
        LocalDate tradingDate = getCurrentTradingDate();

        String sql = """
            WITH latest_date AS (
                SELECT MAX(report_date) AS rd
                FROM ai_debate_reports
                WHERE report_date <= :tradingDate
            )
            SELECT s.id AS stock_id, s.ticker, s.name AS stock_name,
                   latest.debate_confidence, sp.close_price, sp.fluctuation_rate
            FROM (
                SELECT DISTINCT ON (stock_id) stock_id, debate_confidence
                FROM ai_debate_reports
                WHERE report_date = (SELECT rd FROM latest_date)
                  AND chairman_signal = :signalType
                ORDER BY stock_id, created_at DESC, id DESC
            ) latest
            JOIN stocks s ON s.id = latest.stock_id
            JOIN LATERAL (
                SELECT close_price, fluctuation_rate
                FROM stock_prices_daily
                WHERE stock_id = s.id
                  AND trade_date <= :tradingDate
                ORDER BY trade_date DESC LIMIT 1
            ) sp ON true
            WHERE s.is_active = true
            ORDER BY latest.debate_confidence DESC NULLS LAST
            LIMIT 3
            """;

        List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
            .setParameter("signalType", signalType)
            .setParameter("tradingDate", tradingDate)
            .getResultList();

        List<NewSignalItemResponse> items = new ArrayList<>();
        for (Tuple row : rows) {
            items.add(new NewSignalItemResponse(
                row.get("stock_id", Number.class).longValue(),
                row.get("ticker", String.class),
                row.get("stock_name", String.class),
                toPercentInt(row.get("debate_confidence", Number.class)),
                row.get("close_price", Number.class).intValue(),
                toFloat(row.get("fluctuation_rate", Number.class)),
                false
            ));
        }
        return items;
    }

    /** 0.0~1.0 소수를 0~100 정수 퍼센트로 변환 */
    private int toPercentInt(Number value) {
        if (value == null) {
            return 0;
        }
        return Math.round(value.floatValue() * 100);
    }

    private float toFloat(Number value) {
        if (value == null) {
            return 0f;
        }
        return value.floatValue();
    }
}
