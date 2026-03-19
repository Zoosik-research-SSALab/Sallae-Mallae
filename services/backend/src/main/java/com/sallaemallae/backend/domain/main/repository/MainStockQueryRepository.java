package com.sallaemallae.backend.domain.main.repository;

import com.sallaemallae.backend.domain.main.dto.NewSignalItemResponse;
import com.sallaemallae.backend.domain.main.dto.TopStockItemResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
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
     * 직전 장 마감 시각(KST 15:30) 계산.
     * 예: 7일 14:00 → 6일 15:30, 7일 16:00 → 7일 15:30.
     * created_at >= 이 시각 조건으로 장 마감 이후 생성된 데이터만 필터링.
     */
    private LocalDateTime getMarketCloseCutoff() {
        ZonedDateTime nowKst = ZonedDateTime.now(KST);
        LocalDate cutoffDate;
        if (nowKst.toLocalTime().isBefore(MARKET_CLOSE)) {
            cutoffDate = nowKst.toLocalDate().minusDays(1);
        } else {
            cutoffDate = nowKst.toLocalDate();
        }
        return cutoffDate.atTime(MARKET_CLOSE);
    }

    /** 의장 confidence 상위 10종목 조회 (장 마감 이후 생성된 데이터 기준) */
    public List<TopStockItemResponse> getTopTenStocksToday() {
        LocalDate tradingDate = getCurrentTradingDate();
        LocalDateTime cutoff = getMarketCloseCutoff();

        String sql = """
            SELECT s.id AS stock_id, s.name AS stock_name,
                   sp.close_price, sp.fluctuation_rate,
                   r.chairman_signal, r.debate_confidence
            FROM stocks s
            JOIN LATERAL (
                SELECT chairman_signal, debate_confidence
                FROM ai_debate_reports
                WHERE stock_id = s.id
                  AND report_date <= :tradingDate
                  AND created_at >= :cutoff
                ORDER BY report_date DESC, created_at DESC, id DESC LIMIT 1
            ) r ON true
            JOIN LATERAL (
                SELECT close_price, fluctuation_rate
                FROM stock_prices_daily
                WHERE stock_id = s.id
                  AND trade_date <= :tradingDate
                ORDER BY trade_date DESC LIMIT 1
            ) sp ON true
            WHERE s.is_active = true
            ORDER BY r.debate_confidence DESC
            LIMIT 10
            """;

        List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
            .setParameter("tradingDate", tradingDate)
            .setParameter("cutoff", cutoff)
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
                toPercentInt(row.get("debate_confidence", Number.class))
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

    // ── private helpers ──

    private List<NewSignalItemResponse> getSignalsByType(String tradeType) {
        LocalDate tradingDate = getCurrentTradingDate();
        LocalDateTime cutoff = getMarketCloseCutoff();

        String sql = """
            SELECT s.id AS stock_id, s.ticker, s.name AS stock_name,
                   r.debate_confidence, sp.close_price, sp.fluctuation_rate
            FROM ai_trading_history h
            JOIN stocks s ON s.id = h.stock_id
            LEFT JOIN ai_debate_reports r ON r.id = h.debate_report_id
            JOIN LATERAL (
                SELECT close_price, fluctuation_rate
                FROM stock_prices_daily
                WHERE stock_id = s.id
                  AND trade_date <= :tradingDate
                ORDER BY trade_date DESC LIMIT 1
            ) sp ON true
            WHERE h.created_at >= :cutoff
              AND h.trade_type = :tradeType
            ORDER BY r.debate_confidence DESC NULLS LAST
            LIMIT 3
            """;

        List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
            .setParameter("tradeType", tradeType)
            .setParameter("tradingDate", tradingDate)
            .setParameter("cutoff", cutoff)
            .getResultList();

        List<NewSignalItemResponse> items = new ArrayList<>();
        for (Tuple row : rows) {
            items.add(new NewSignalItemResponse(
                row.get("stock_id", Number.class).longValue(),
                row.get("ticker", String.class),
                row.get("stock_name", String.class),
                toPercentInt(row.get("debate_confidence", Number.class)),
                row.get("close_price", Number.class).intValue(),
                toFloat(row.get("fluctuation_rate", Number.class))
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
