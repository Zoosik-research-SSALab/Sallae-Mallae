package com.sallaemallae.backend.domain.search.repository;

import com.sallaemallae.backend.domain.search.dto.response.SearchNewsItemResponse;
import com.sallaemallae.backend.domain.search.dto.response.SearchStockItemResponse;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class SearchQueryRepository {

  private static final String LIKE_ESCAPE = "\\";
  private static final int STOCK_SEARCH_LIMIT = 10;
  private static final int NEWS_SEARCH_LIMIT = 5;
  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");

  private final EntityManager entityManager;

  public List<SearchStockItemResponse> searchStocks(String keyword) {
    String contains = buildContainsPattern(keyword);
    String startsWith = buildStartsWithPattern(keyword);

    @SuppressWarnings("unchecked")
    List<Object[]> rows = entityManager.createNativeQuery("""
        WITH matched_stocks AS (
            SELECT s.id,
                   s.ticker,
                   s.name,
                   s.gics_sector,
                   CASE
                       WHEN s.name ILIKE :startsWith ESCAPE '\\' THEN 0
                       WHEN s.ticker ILIKE :startsWith ESCAPE '\\' THEN 1
                       ELSE 2
                       END AS match_priority
            FROM stocks s
            WHERE s.is_active = true
              AND (
                s.name ILIKE :contains ESCAPE '\\'
                    OR s.ticker ILIKE :contains ESCAPE '\\'
                    OR COALESCE(s.gics_sector, '') ILIKE :contains ESCAPE '\\'
                    OR COALESCE(s.category, '') ILIKE :contains ESCAPE '\\'
                )
            ORDER BY match_priority, s.name
            LIMIT :stockLimit
        )
        SELECT ms.id,
               ms.ticker,
               ms.name,
               ms.gics_sector,
               latest_price.close_price,
               latest_price.fluctuation_rate
        FROM matched_stocks ms
                 LEFT JOIN LATERAL (
            SELECT sp.close_price, sp.fluctuation_rate
            FROM stock_prices_daily sp
            WHERE sp.stock_id = ms.id
            ORDER BY sp.trade_date DESC
            LIMIT 1
            ) latest_price ON TRUE
        ORDER BY ms.match_priority, ms.name
        """)
        .setParameter("contains", contains)
        .setParameter("startsWith", startsWith)
        .setParameter("stockLimit", STOCK_SEARCH_LIMIT)
        .getResultList();

    return rows.stream()
        .map(this::toStockItem)
        .toList();
  }

  public List<SearchNewsItemResponse> searchNews(String keyword) {
    String contains = buildContainsPattern(keyword);
    String startsWith = buildStartsWithPattern(keyword);

    @SuppressWarnings("unchecked")
    List<Object[]> rows = entityManager.createNativeQuery("""
        WITH matched_news AS (
            SELECT n.id,
                   n.title,
                   n.publisher,
                   n.url,
                   n.published_at,
                   CASE
                       WHEN n.title ILIKE :startsWith ESCAPE '\\' THEN 0
                       ELSE 1
                       END AS match_priority
            FROM stock_news n
            WHERE n.published_at IS NOT NULL
              AND (
                n.title ILIKE :contains ESCAPE '\\'
                    OR COALESCE(n.snippet, '') ILIKE :contains ESCAPE '\\'
                )
        )
        SELECT mn.id,
               mn.title,
               mn.publisher,
               mn.url,
               mn.published_at
        FROM matched_news mn
        ORDER BY mn.match_priority, mn.published_at DESC, mn.id DESC
        """)
        .setParameter("contains", contains)
        .setParameter("startsWith", startsWith)
        .setMaxResults(NEWS_SEARCH_LIMIT)
        .getResultList();

    return rows.stream()
        .map(this::toNewsItem)
        .toList();
  }

  private SearchStockItemResponse toStockItem(Object[] row) {
    return new SearchStockItemResponse(
        toLong(row[0]),
        (String) row[1],
        (String) row[2],
        (String) row[3],
        toInteger(row[4]),
        toBigDecimal(row[5])
    );
  }

  private SearchNewsItemResponse toNewsItem(Object[] row) {
    return new SearchNewsItemResponse(
        toLong(row[0]),
        (String) row[1],
        (String) row[2],
        (String) row[3],
        toOffsetDateTime(row[4])
    );
  }

  static String buildContainsPattern(String keyword) {
    return "%" + escapeLikeKeyword(keyword) + "%";
  }

  static String buildStartsWithPattern(String keyword) {
    return escapeLikeKeyword(keyword) + "%";
  }

  static String escapeLikeKeyword(String keyword) {
    return keyword
        .replace(LIKE_ESCAPE, LIKE_ESCAPE + LIKE_ESCAPE)
        .replace("%", LIKE_ESCAPE + "%")
        .replace("_", LIKE_ESCAPE + "_");
  }

  private Long toLong(Object value) {
    if (value == null) {
      return null;
    }
    return ((Number) value).longValue();
  }

  private Integer toInteger(Object value) {
    if (value == null) {
      return null;
    }
    return ((Number) value).intValue();
  }

  private BigDecimal toBigDecimal(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof BigDecimal decimal) {
      return decimal;
    }
    return BigDecimal.valueOf(((Number) value).doubleValue());
  }

  private OffsetDateTime toOffsetDateTime(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof OffsetDateTime dateTime) {
      return dateTime;
    }
    if (value instanceof Timestamp timestamp) {
      return timestamp.toInstant().atZone(ZONE_ID).toOffsetDateTime();
    }
    return null;
  }
}
