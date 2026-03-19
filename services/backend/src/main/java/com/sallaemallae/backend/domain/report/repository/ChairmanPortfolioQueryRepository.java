package com.sallaemallae.backend.domain.report.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import java.time.LocalDate;
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
public class ChairmanPortfolioQueryRepository {

  private final EntityManager entityManager;

  public int countHoldings(Long portfolioId) {
    String sql = """
        SELECT COUNT(*)
        FROM ai_portfolio_holdings
        WHERE portfolio_id = :portfolioId
        """;
    Number count = (Number) entityManager.createNativeQuery(sql)
        .setParameter("portfolioId", portfolioId)
        .getSingleResult();
    return count.intValue();
  }

  public List<HoldingRow> findHoldingRows(Long portfolioId, int offset, int limit) {
    String sql = """
        SELECT s.id AS stock_id,
               s.ticker,
               s.name,
               buy_entry.trade_price_rate AS buy_price,
               price.close_price AS current_price,
               buy_entry.trade_time AS buy_time,
               h.return_rate
        FROM ai_portfolio_holdings h
        JOIN stocks s ON s.id = h.stock_id
        LEFT JOIN LATERAL (
            SELECT trade_price_rate, trade_time
            FROM ai_trading_history
            WHERE portfolio_id = :portfolioId
              AND stock_id = h.stock_id
              AND trade_type = 'BUY'
            ORDER BY trade_time DESC, id DESC
            LIMIT 1
        ) buy_entry ON true
        LEFT JOIN LATERAL (
            SELECT close_price
            FROM stock_prices_daily
            WHERE stock_id = h.stock_id
              AND trade_date <= CURRENT_DATE
            ORDER BY trade_date DESC, id DESC
            LIMIT 1
        ) price ON true
        WHERE h.portfolio_id = :portfolioId
        ORDER BY h.return_rate DESC NULLS LAST, h.updated_at DESC
        LIMIT :limit OFFSET :offset
        """;

    List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
        .setParameter("portfolioId", portfolioId)
        .setParameter("offset", offset)
        .setParameter("limit", limit)
        .getResultList();

    List<HoldingRow> items = new ArrayList<>();
    for (Tuple row : rows) {
      items.add(new HoldingRow(
          toLong(row.get("stock_id")),
          row.get("ticker", String.class),
          row.get("name", String.class),
          toFloat(row.get("buy_price")),
          toInteger(row.get("current_price")),
          toOffsetDateTime(row.get("buy_time")),
          toFloat(row.get("return_rate"))
      ));
    }
    return items;
  }

  public int countTodayTradeRows(Long portfolioId) {
    String sql = """
        WITH latest_trade_day AS (
            SELECT MAX(DATE(trade_time)) AS trade_day
            FROM ai_trading_history
            WHERE portfolio_id = :portfolioId
        )
        SELECT COUNT(*)
        FROM ai_trading_history h
        JOIN latest_trade_day d ON DATE(h.trade_time) = d.trade_day
        WHERE h.portfolio_id = :portfolioId
        """;
    Number count = (Number) entityManager.createNativeQuery(sql)
        .setParameter("portfolioId", portfolioId)
        .getSingleResult();
    return count.intValue();
  }

  public List<TodayTradeRow> findTodayTradeRows(Long portfolioId, int offset, int limit) {
    String sql = """
        WITH latest_trade_day AS (
            SELECT MAX(DATE(trade_time)) AS trade_day
            FROM ai_trading_history
            WHERE portfolio_id = :portfolioId
        )
        SELECT s.id AS stock_id,
               s.ticker,
               s.name,
               h.trade_type,
               h.trade_time,
               h.trade_price_rate,
               h.return_rate
        FROM ai_trading_history h
        JOIN stocks s ON s.id = h.stock_id
        JOIN latest_trade_day d ON DATE(h.trade_time) = d.trade_day
        WHERE h.portfolio_id = :portfolioId
        ORDER BY h.trade_time DESC, h.id DESC
        LIMIT :limit OFFSET :offset
        """;

    List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
        .setParameter("portfolioId", portfolioId)
        .setParameter("offset", offset)
        .setParameter("limit", limit)
        .getResultList();

    List<TodayTradeRow> items = new ArrayList<>();
    for (Tuple row : rows) {
      items.add(new TodayTradeRow(
          toLong(row.get("stock_id")),
          row.get("ticker", String.class),
          row.get("name", String.class),
          row.get("trade_type", String.class),
          toOffsetDateTime(row.get("trade_time")),
          toFloat(row.get("trade_price_rate")),
          toFloat(row.get("return_rate"))
      ));
    }
    return items;
  }

  public SignalSummaryRow findSignalSummary() {
    String sql = """
        WITH latest_report_date AS (
            SELECT MAX(report_date) AS report_date
            FROM ai_debate_reports
            WHERE report_date <= CURRENT_DATE
        ),
        latest_reports AS (
            SELECT DISTINCT ON (r.stock_id)
                   r.stock_id,
                   r.chairman_signal AS signal
            FROM ai_debate_reports r
            JOIN latest_report_date d ON r.report_date = d.report_date
            ORDER BY r.stock_id, r.created_at DESC, r.id DESC
        )
        SELECT COALESCE(SUM(CASE WHEN signal = 'BUY' THEN 1 ELSE 0 END), 0) AS buy_count,
               COALESCE(SUM(CASE WHEN signal = 'SELL' THEN 1 ELSE 0 END), 0) AS sell_count,
               COALESCE(SUM(CASE WHEN signal = 'HOLD' THEN 1 ELSE 0 END), 0) AS hold_count,
               COALESCE(SUM(CASE WHEN signal = 'STAY' THEN 1 ELSE 0 END), 0) AS watch_count
        FROM latest_reports
        """;

    Tuple row = (Tuple) entityManager.createNativeQuery(sql, Tuple.class).getSingleResult();
    return new SignalSummaryRow(
        toInteger(row.get("buy_count")),
        toInteger(row.get("sell_count")),
        toInteger(row.get("hold_count")),
        toInteger(row.get("watch_count"))
    );
  }

  public List<PopularSignalRow> findPopularSignalRows(int limit) {
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
               p.close_price,
               lr.signal
        FROM latest_reports lr
        JOIN stocks s ON s.id = lr.stock_id
        LEFT JOIN LATERAL (
            SELECT close_price
            FROM stock_prices_daily
            WHERE stock_id = s.id
              AND trade_date <= CURRENT_DATE
            ORDER BY trade_date DESC, id DESC
            LIMIT 1
        ) p ON true
        WHERE s.is_active = true
        ORDER BY lr.confidence DESC NULLS LAST, lr.created_at DESC, s.id ASC
        LIMIT :limit
        """;

    List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
        .setParameter("limit", limit)
        .getResultList();

    List<PopularSignalRow> items = new ArrayList<>();
    int rank = 1;
    for (Tuple row : rows) {
      items.add(new PopularSignalRow(
          rank++,
          toLong(row.get("stock_id")),
          row.get("ticker", String.class),
          row.get("name", String.class),
          toInteger(row.get("close_price")),
          row.get("signal", String.class)
      ));
    }
    return items;
  }

  public record HoldingRow(
      Long stockId,
      String ticker,
      String name,
      Float buyPrice,
      Integer currentPrice,
      OffsetDateTime buyTime,
      Float returnRate
  ) {
    public Integer holdingDays(LocalDate currentDate) {
      if (buyTime == null) {
        return null;
      }
      return Math.toIntExact(java.time.temporal.ChronoUnit.DAYS.between(buyTime.toLocalDate(), currentDate));
    }
  }

  public record TodayTradeRow(
      Long stockId,
      String ticker,
      String name,
      String tradeType,
      OffsetDateTime tradeTime,
      Float tradePrice,
      Float returnRate
  ) {
  }

  public record SignalSummaryRow(
      Integer buyCount,
      Integer sellCount,
      Integer holdCount,
      Integer watchCount
  ) {
  }

  public record PopularSignalRow(
      Integer rank,
      Long stockId,
      String ticker,
      String name,
      Integer price,
      String signal
  ) {
  }
}
