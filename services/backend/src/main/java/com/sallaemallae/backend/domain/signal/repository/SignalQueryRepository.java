package com.sallaemallae.backend.domain.signal.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class SignalQueryRepository {

  private final EntityManager entityManager;

  public List<SignalCandidateRow> findLatestSignalCandidates() {
    String sql = """
        WITH latest_report_date AS (
            SELECT MAX(report_date) AS report_date
            FROM ai_ml_reports
            WHERE report_date <= CURRENT_DATE
        ),
        latest_reports AS (
            SELECT DISTINCT ON (r.stock_id)
                   r.stock_id,
                   r.ml_signal,
                   r.ml_confidence,
                   r.created_at
            FROM ai_ml_reports r
            JOIN latest_report_date d ON r.report_date = d.report_date
            ORDER BY r.stock_id, r.created_at DESC, r.id DESC
        )
        SELECT s.id AS stock_id,
               s.ticker,
               s.name,
               p.close_price,
               p.fluctuation_rate,
               lr.ml_signal,
               lr.ml_confidence,
               lr.created_at
        FROM latest_reports lr
        JOIN stocks s ON s.id = lr.stock_id
        JOIN LATERAL (
            SELECT close_price, fluctuation_rate
            FROM stock_prices_daily
            WHERE stock_id = s.id
              AND trade_date <= CURRENT_DATE
            ORDER BY trade_date DESC, id DESC
            LIMIT 1
        ) p ON true
        WHERE s.is_active = true
          AND lr.ml_signal IN ('BUY', 'SELL')
        """;

    List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class).getResultList();
    List<SignalCandidateRow> items = new ArrayList<>();
    for (Tuple row : rows) {
      items.add(new SignalCandidateRow(
          toLong(row.get("stock_id")),
          row.get("ticker", String.class),
          row.get("name", String.class),
          toInteger(row.get("close_price")),
          toFloat(row.get("fluctuation_rate")),
          row.get("ml_signal", String.class),
          toFloat(row.get("ml_confidence")),
          toOffsetDateTime(row.get("created_at"))
      ));
    }
    return items;
  }

  public record SignalCandidateRow(
      Long stockId,
      String ticker,
      String name,
      Integer price,
      Float fluctuationRate,
      String signal,
      Float confidence,
      OffsetDateTime createdAt
  ) {
  }

  private Long toLong(Object value) {
    return value instanceof Number number ? number.longValue() : null;
  }

  private Integer toInteger(Object value) {
    return value instanceof Number number ? number.intValue() : null;
  }

  private Float toFloat(Object value) {
    return value instanceof Number number ? number.floatValue() : null;
  }

  private OffsetDateTime toOffsetDateTime(Object value) {
    if (value instanceof OffsetDateTime offsetDateTime) {
      return offsetDateTime;
    }
    if (value instanceof java.sql.Timestamp timestamp) {
      return timestamp.toInstant().atOffset(ZoneOffset.UTC);
    }
    return null;
  }
}
