package com.sallaemallae.backend.domain.signal.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import static com.sallaemallae.backend.global.util.NativeQueryResultUtils.toFloat;
import static com.sallaemallae.backend.global.util.NativeQueryResultUtils.toInteger;
import static com.sallaemallae.backend.global.util.NativeQueryResultUtils.toLong;
import static com.sallaemallae.backend.global.util.NativeQueryResultUtils.toOffsetDateTime;

@Repository
@RequiredArgsConstructor
public class SignalQueryRepository {

  private final EntityManager entityManager;

  public List<SignalCandidateRow> findLatestSignalCandidates() {
    String sql = """
        WITH latest_report_date AS (
            SELECT MAX(report_date) AS report_date
            FROM ai_debate_reports
            WHERE report_date <= CURRENT_DATE
        ),
        latest_reports AS (
            SELECT DISTINCT ON (r.stock_id)
                   r.stock_id,
                   r.chairman_signal AS signal,
                   r.debate_confidence AS confidence,
                   r.created_at
            FROM ai_debate_reports r
            JOIN latest_report_date d ON r.report_date = d.report_date
            ORDER BY r.stock_id, r.created_at DESC, r.id DESC
        )
        SELECT s.id AS stock_id,
               s.ticker,
               s.name,
               s.category,
               p.close_price,
               CASE
                   WHEN p.close_price IS NOT NULL AND s.outstanding_shares IS NOT NULL
                       THEN p.close_price::bigint * s.outstanding_shares
                   ELSE NULL
               END AS market_cap,
               p.fluctuation_rate,
               lr.signal,
               lr.confidence,
               lr.created_at
        FROM latest_reports lr
        JOIN stocks s ON s.id = lr.stock_id
        LEFT JOIN LATERAL (
            SELECT close_price, fluctuation_rate
            FROM stock_prices_daily
            WHERE stock_id = s.id
              AND trade_date <= CURRENT_DATE
            ORDER BY trade_date DESC, id DESC
            LIMIT 1
        ) p ON true
        WHERE s.is_active = true
          AND lr.signal IN ('BUY', 'SELL')
        """;

    List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class).getResultList();
    List<SignalCandidateRow> items = new ArrayList<>();
    for (Tuple row : rows) {
      items.add(new SignalCandidateRow(
          toLong(row.get("stock_id")),
          row.get("ticker", String.class),
          row.get("name", String.class),
          row.get("category", String.class),
          toInteger(row.get("close_price")),
          toLong(row.get("market_cap")),
          toFloat(row.get("fluctuation_rate")),
          row.get("signal", String.class),
          toFloat(row.get("confidence")),
          toOffsetDateTime(row.get("created_at"))
      ));
    }
    return items;
  }

  /** 관심종목 전용: stockId 목록에 대해 종목별 가장 최근 시그널 조회 (BUY/SELL/HOLD/STAY 모두 포함) */
  public List<SignalCandidateRow> findLatestSignalsForStocks(List<Long> stockIds) {
    if (stockIds == null || stockIds.isEmpty()) {
      return List.of();
    }

    String sql = """
        SELECT DISTINCT ON (r.stock_id)
               r.stock_id,
               s.ticker,
               s.name,
               s.category,
               p.close_price,
               CASE
                   WHEN p.close_price IS NOT NULL AND s.outstanding_shares IS NOT NULL
                       THEN p.close_price::bigint * s.outstanding_shares
                   ELSE NULL
               END AS market_cap,
               p.fluctuation_rate,
               r.chairman_signal AS signal,
               r.debate_confidence AS confidence,
               r.created_at
        FROM ai_debate_reports r
        JOIN stocks s ON s.id = r.stock_id
        LEFT JOIN LATERAL (
            SELECT close_price, fluctuation_rate
            FROM stock_prices_daily
            WHERE stock_id = s.id
              AND trade_date <= CURRENT_DATE
            ORDER BY trade_date DESC, id DESC
            LIMIT 1
        ) p ON true
        WHERE r.stock_id IN (:stockIds)
          AND r.report_date <= CURRENT_DATE
        ORDER BY r.stock_id, r.report_date DESC, r.created_at DESC, r.id DESC
        """;

    @SuppressWarnings("unchecked")
    List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
        .setParameter("stockIds", stockIds)
        .getResultList();

    List<SignalCandidateRow> items = new ArrayList<>();
    for (Tuple row : rows) {
      items.add(new SignalCandidateRow(
          toLong(row.get("stock_id")),
          row.get("ticker", String.class),
          row.get("name", String.class),
          row.get("category", String.class),
          toInteger(row.get("close_price")),
          toLong(row.get("market_cap")),
          toFloat(row.get("fluctuation_rate")),
          row.get("signal", String.class),
          toFloat(row.get("confidence")),
          toOffsetDateTime(row.get("created_at"))
      ));
    }
    return items;
  }

  public record SignalCandidateRow(
      Long stockId,
      String ticker,
      String name,
      String category,
      Integer price,
      Long marketCap,
      Float fluctuationRate,
      String signal,
      Float confidence,
      OffsetDateTime createdAt
  ) {
  }
}
