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
               s.icon_url,
               h.avg_buy_price AS buy_price,
               COALESCE(h.current_price, price.close_price) AS current_price,
               h.buy_date AS buy_time,
               h.holding_quantity,
               h.return_rate
        FROM ai_portfolio_holdings h
        JOIN stocks s ON s.id = h.stock_id
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
          toLong(row.get("holding_quantity")),
          toFloat(row.get("return_rate")),
          row.get("icon_url", String.class)
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
               s.icon_url,
               h.trade_type,
               h.trade_time,
               h.trade_price_rate,
               price.close_price AS current_price,
               COALESCE(holding.holding_quantity, h.holding_quantity_after) AS holding_quantity,
               h.return_rate
        FROM ai_trading_history h
        JOIN stocks s ON s.id = h.stock_id
        JOIN latest_trade_day d ON DATE(h.trade_time) = d.trade_day
        LEFT JOIN ai_portfolio_holdings holding
               ON holding.portfolio_id = h.portfolio_id
              AND holding.stock_id = h.stock_id
        LEFT JOIN LATERAL (
            SELECT close_price
            FROM stock_prices_daily
            WHERE stock_id = h.stock_id
              AND trade_date <= CURRENT_DATE
            ORDER BY trade_date DESC, id DESC
            LIMIT 1
        ) price ON true
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
          toInteger(row.get("current_price")),
          toLong(row.get("holding_quantity")),
          toFloat(row.get("return_rate")),
          row.get("icon_url", String.class)
      ));
    }
    return items;
  }

  public List<MonthlyTradeMetricRow> findMonthlyTradeMetricRows(Long portfolioId) {
    String sql = """
        SELECT TO_CHAR(DATE_TRUNC('month', h.trade_time), 'YYYY-MM') AS month,
               COALESCE(SUM(CASE WHEN h.trade_type = 'SELL' THEN h.realized_profit ELSE 0 END), 0) AS realized_profit_amount,
               COALESCE(SUM(CASE
                                WHEN h.trade_type = 'SELL' AND h.trade_amount IS NOT NULL
                                  THEN h.trade_amount - h.realized_profit
                                ELSE 0
                            END), 0) AS realized_cost_amount,
               COALESCE(SUM(CASE WHEN h.trade_type = 'BUY' THEN 1 ELSE 0 END), 0) AS buy_count,
               COALESCE(SUM(CASE WHEN h.trade_type = 'SELL' THEN 1 ELSE 0 END), 0) AS sell_count
        FROM ai_trading_history h
        WHERE h.portfolio_id = :portfolioId
        GROUP BY DATE_TRUNC('month', h.trade_time)
        ORDER BY month DESC
        """;

    List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
        .setParameter("portfolioId", portfolioId)
        .getResultList();

    List<MonthlyTradeMetricRow> items = new ArrayList<>();
    for (Tuple row : rows) {
      items.add(new MonthlyTradeMetricRow(
          row.get("month", String.class),
          toLong(row.get("realized_profit_amount")),
          toLong(row.get("realized_cost_amount")),
          toInteger(row.get("buy_count")),
          toInteger(row.get("sell_count"))
      ));
    }
    return items;
  }

  public SignalSummaryRow findSignalSummary(Long portfolioId) {
    String sql = """
        WITH latest_report_date AS (
            SELECT MAX(report_date) AS report_date
            FROM ai_debate_reports
            WHERE report_date <= CURRENT_DATE
        ),
        latest_reports AS (
            SELECT DISTINCT ON (r.stock_id)
                   r.stock_id,
                   r.chairman_signal
            FROM ai_debate_reports r
            JOIN latest_report_date d ON r.report_date = d.report_date
            ORDER BY r.stock_id, r.created_at DESC, r.id DESC
        )
        SELECT COALESCE(SUM(CASE WHEN r.chairman_signal = 'BUY' THEN 1 ELSE 0 END), 0) AS buy_count,
               COALESCE(SUM(CASE WHEN r.chairman_signal = 'SELL' THEN 1 ELSE 0 END), 0) AS sell_count,
               COALESCE(SUM(CASE WHEN r.chairman_signal = 'HOLD' AND h.stock_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS hold_count,
               COALESCE(SUM(CASE WHEN (r.chairman_signal = 'HOLD' AND h.stock_id IS NULL) OR r.chairman_signal = 'STAY' THEN 1 ELSE 0 END), 0) AS watch_count
        FROM latest_reports r
        LEFT JOIN ai_portfolio_holdings h
               ON h.portfolio_id = :portfolioId
              AND h.stock_id = r.stock_id
        """;

    Tuple row = (Tuple) entityManager.createNativeQuery(sql, Tuple.class)
        .setParameter("portfolioId", portfolioId)
        .getSingleResult();
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
               s.icon_url,
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
          row.get("signal", String.class),
          row.get("icon_url", String.class)
      ));
    }
    return items;
  }

  public List<HallOfFameHitRateRow> findHitRateTopRows(Long portfolioId, int limit) {
    String sql = """
        SELECT s.id AS stock_id,
               s.ticker,
               s.name,
               ROUND(AVG(CASE WHEN h.realized_profit > 0 THEN 100.0 ELSE 0.0 END)::numeric, 2) AS hit_rate,
               SUM(CASE WHEN h.realized_profit > 0 THEN 1 ELSE 0 END) AS winning_trades,
               COUNT(*) AS total_trades
        FROM ai_trading_history h
        JOIN stocks s ON s.id = h.stock_id
        WHERE h.portfolio_id = :portfolioId
          AND h.trade_type = 'SELL'
        GROUP BY s.id, s.ticker, s.name
        HAVING COUNT(*) > 0
        ORDER BY hit_rate DESC, total_trades DESC, s.id ASC
        LIMIT :limit
        """;

    List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
        .setParameter("portfolioId", portfolioId)
        .setParameter("limit", limit)
        .getResultList();

    List<HallOfFameHitRateRow> items = new ArrayList<>();
    int rank = 1;
    for (Tuple row : rows) {
      items.add(new HallOfFameHitRateRow(
          rank++,
          toLong(row.get("stock_id")),
          row.get("ticker", String.class),
          row.get("name", String.class),
          toFloat(row.get("hit_rate")),
          toInteger(row.get("winning_trades")),
          toInteger(row.get("total_trades"))
      ));
    }
    return items;
  }

  public List<HallOfFameReturnRow> findCumulativeReturnTopRows(Long portfolioId, int limit) {
    String sql = """
        SELECT s.id AS stock_id,
               s.ticker,
               s.name,
               ROUND(
                   (
                       SUM(COALESCE(h.realized_profit, 0))::numeric
                       / NULLIF(SUM(CASE WHEN h.trade_type = 'BUY' THEN COALESCE(h.trade_amount, 0) ELSE 0 END), 0)
                   ) * 100,
                   2
               ) AS metric_value
        FROM ai_trading_history h
        JOIN stocks s ON s.id = h.stock_id
        WHERE h.portfolio_id = :portfolioId
        GROUP BY s.id, s.ticker, s.name
        HAVING SUM(CASE WHEN h.trade_type = 'BUY' THEN COALESCE(h.trade_amount, 0) ELSE 0 END) > 0
        ORDER BY metric_value DESC NULLS LAST, s.id ASC
        LIMIT :limit
        """;
    return findHallOfFameReturnRows(sql, portfolioId, limit);
  }

  public List<HallOfFameReturnRow> findMaxSingleReturnTopRows(Long portfolioId, int limit) {
    String sql = """
        SELECT s.id AS stock_id,
               s.ticker,
               s.name,
               ROUND(MAX(h.return_rate)::numeric, 2) AS metric_value
        FROM ai_trading_history h
        JOIN stocks s ON s.id = h.stock_id
        WHERE h.portfolio_id = :portfolioId
          AND h.trade_type = 'SELL'
          AND h.return_rate IS NOT NULL
        GROUP BY s.id, s.ticker, s.name
        ORDER BY metric_value DESC NULLS LAST, s.id ASC
        LIMIT :limit
        """;
    return findHallOfFameReturnRows(sql, portfolioId, limit);
  }

  public List<HallOfFameReturnRow> findAverageReturnTopRows(Long portfolioId, int limit) {
    String sql = """
        SELECT s.id AS stock_id,
               s.ticker,
               s.name,
               ROUND(AVG(h.return_rate)::numeric, 2) AS metric_value
        FROM ai_trading_history h
        JOIN stocks s ON s.id = h.stock_id
        WHERE h.portfolio_id = :portfolioId
          AND h.trade_type = 'SELL'
          AND h.return_rate IS NOT NULL
        GROUP BY s.id, s.ticker, s.name
        ORDER BY metric_value DESC NULLS LAST, s.id ASC
        LIMIT :limit
        """;
    return findHallOfFameReturnRows(sql, portfolioId, limit);
  }

  private List<HallOfFameReturnRow> findHallOfFameReturnRows(String sql, Long portfolioId, int limit) {
    List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
        .setParameter("portfolioId", portfolioId)
        .setParameter("limit", limit)
        .getResultList();

    List<HallOfFameReturnRow> items = new ArrayList<>();
    int rank = 1;
    for (Tuple row : rows) {
      items.add(new HallOfFameReturnRow(
          rank++,
          toLong(row.get("stock_id")),
          row.get("ticker", String.class),
          row.get("name", String.class),
          toFloat(row.get("metric_value"))
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
      Long holdingQuantity,
      Float returnRate,
      String iconUrl
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
      Integer currentPrice,
      Long holdingQuantity,
      Float returnRate,
      String iconUrl
  ) {
  }

  public record MonthlyTradeMetricRow(
      String month,
      Long realizedProfitAmount,
      Long realizedCostAmount,
      Integer buyCount,
      Integer sellCount
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
      String signal,
      String iconUrl
  ) {
  }

  public record HallOfFameHitRateRow(
      Integer rank,
      Long stockId,
      String ticker,
      String name,
      Float hitRate,
      Integer winningTrades,
      Integer totalTrades
  ) {
  }

  public record HallOfFameReturnRow(
      Integer rank,
      Long stockId,
      String ticker,
      String name,
      Float value
  ) {
  }
}
