package com.sallaemallae.backend.domain.main.repository;

import com.sallaemallae.backend.domain.main.dto.NewSignalItemResponse;
import com.sallaemallae.backend.domain.main.dto.TopStockItemResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class MainStockQueryRepository {

    private final EntityManager entityManager;

    /** 의장 confidence 상위 10종목 조회 (종목별 최신 데이터 기준) */
    public List<TopStockItemResponse> getTopTenStocksToday() {
        String sql = """
            SELECT s.id AS stock_id, s.name AS stock_name,
                   sp.close_price, sp.fluctuation_rate,
                   r.chairman_signal, r.debate_confidence
            FROM stocks s
            JOIN LATERAL (
                SELECT chairman_signal, debate_confidence
                FROM ai_debate_reports
                WHERE stock_id = s.id
                ORDER BY report_date DESC, created_at DESC LIMIT 1
            ) r ON true
            JOIN LATERAL (
                SELECT close_price, fluctuation_rate
                FROM stock_prices_daily
                WHERE stock_id = s.id
                ORDER BY trade_date DESC LIMIT 1
            ) sp ON true
            WHERE s.is_active = true
            ORDER BY r.debate_confidence DESC
            LIMIT 10
            """;

        List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class).getResultList();
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

    /** 카테고리별 최신 가격 데이터 (종목별 최신 거래일 기준) */
    public List<Object[]> getCategoryStocksRaw() {
        String sql = """
            SELECT s.category, s.name, sp.close_price, sp.fluctuation_rate
            FROM stocks s
            JOIN LATERAL (
                SELECT close_price, fluctuation_rate
                FROM stock_prices_daily
                WHERE stock_id = s.id
                ORDER BY trade_date DESC LIMIT 1
            ) sp ON true
            WHERE s.category IS NOT NULL
              AND s.is_active = true
            """;

        @SuppressWarnings("unchecked")
        List<Object[]> result = entityManager.createNativeQuery(sql).getResultList();
        return result;
    }

    // ── private helpers ──

    private List<NewSignalItemResponse> getSignalsByType(String tradeType) {
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
                ORDER BY trade_date DESC LIMIT 1
            ) sp ON true
            WHERE DATE(h.trade_time) = (
                SELECT MAX(DATE(trade_time))
                FROM ai_trading_history
                WHERE trade_time <= CURRENT_TIMESTAMP
            )
              AND h.trade_type = :tradeType
            ORDER BY r.debate_confidence DESC NULLS LAST
            LIMIT 3
            """;

        List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
            .setParameter("tradeType", tradeType)
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
