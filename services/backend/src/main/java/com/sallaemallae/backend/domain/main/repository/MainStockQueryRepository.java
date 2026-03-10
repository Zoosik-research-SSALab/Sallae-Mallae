package com.sallaemallae.backend.domain.main.repository;

import com.sallaemallae.backend.domain.main.dto.NewSignalItemResponse;
import com.sallaemallae.backend.domain.main.dto.TopStockItemResponse;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class MainStockQueryRepository {

    private final EntityManager entityManager;

    /** 오늘 날짜 기준 ML confidence 상위 10종목 조회 */
    @SuppressWarnings("unchecked")
    public List<TopStockItemResponse> getTopTenStocksToday() {
        String sql = """
            SELECT s.id, s.name, sp.close_price, sp.fluctuation_rate,
                   r.ml_signal, r.ml_confidence
            FROM stocks s
            JOIN LATERAL (
                SELECT ml_signal, ml_confidence
                FROM ai_ml_reports
                WHERE stock_id = s.id
                  AND report_date = CURRENT_DATE
                ORDER BY created_at DESC LIMIT 1
            ) r ON true
            JOIN LATERAL (
                SELECT close_price, fluctuation_rate
                FROM stock_prices_daily
                WHERE stock_id = s.id
                  AND trade_date = CURRENT_DATE
                LIMIT 1
            ) sp ON true
            WHERE s.is_active = true
            ORDER BY r.ml_confidence DESC
            LIMIT 10
            """;

        List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();
        List<TopStockItemResponse> items = new ArrayList<>();
        int rank = 1;
        for (Object[] row : rows) {
            items.add(new TopStockItemResponse(
                rank++,
                ((Number) row[0]).longValue(),
                (String) row[1],
                ((Number) row[2]).intValue(),
                toFloat(row[3]),
                (String) row[4],
                toPercentInt(row[5])
            ));
        }
        return items;
    }

    /** 오늘 매수 상위 3종목 (confidence DESC) */
    public List<NewSignalItemResponse> getTodayBuySignals() {
        return getTodaySignalsByType("BUY");
    }

    /** 오늘 매도 상위 3종목 (confidence DESC) */
    public List<NewSignalItemResponse> getTodaySellSignals() {
        return getTodaySignalsByType("SELL");
    }

    /** 카테고리별 최신 가격 raw 데이터 (category, name, close_price, fluctuation_rate) */
    @SuppressWarnings("unchecked")
    public List<Object[]> getCategoryStocksRaw() {
        String sql = """
            SELECT s.category, s.name, sp.close_price, sp.fluctuation_rate
            FROM stocks s
            JOIN LATERAL (
                SELECT close_price, fluctuation_rate
                FROM stock_prices_daily
                WHERE stock_id = s.id
                  AND trade_date = CURRENT_DATE
                LIMIT 1
            ) sp ON true
            WHERE s.category IS NOT NULL
              AND s.is_active = true
            """;

        return entityManager.createNativeQuery(sql).getResultList();
    }

    // ── private helpers ──

    private List<NewSignalItemResponse> getTodaySignalsByType(String tradeType) {
        String sql = """
            SELECT s.id, s.ticker, s.name, r.ml_confidence,
                   sp.close_price, sp.fluctuation_rate
            FROM ai_trading_history h
            JOIN stocks s ON s.id = h.stock_id
            LEFT JOIN ai_ml_reports r ON r.id = h.ml_report_id
            JOIN LATERAL (
                SELECT close_price, fluctuation_rate
                FROM stock_prices_daily
                WHERE stock_id = s.id
                  AND trade_date = CURRENT_DATE
                LIMIT 1
            ) sp ON true
            WHERE h.trade_time >= CURRENT_DATE
              AND h.trade_type = :tradeType
            ORDER BY r.ml_confidence DESC NULLS LAST
            LIMIT 3
            """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql)
            .setParameter("tradeType", tradeType)
            .getResultList();

        List<NewSignalItemResponse> items = new ArrayList<>();
        for (Object[] row : rows) {
            items.add(new NewSignalItemResponse(
                ((Number) row[0]).longValue(),
                (String) row[1],
                (String) row[2],
                toPercentInt(row[3]),
                ((Number) row[4]).intValue(),
                toFloat(row[5])
            ));
        }
        return items;
    }

    /** 0.0~1.0 소수를 0~100 정수 퍼센트로 변환 */
    private int toPercentInt(Object value) {
        if (value == null) {
            return 0;
        }
        return Math.round(((Number) value).floatValue() * 100);
    }

    private float toFloat(Object value) {
        if (value == null) {
            return 0f;
        }
        return ((Number) value).floatValue();
    }
}
