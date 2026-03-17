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

  private static final int STOCK_SEARCH_LIMIT = 10;
  private static final int NEWS_SEARCH_LIMIT = 5;
  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");

  private final EntityManager entityManager;

  public List<SearchStockItemResponse> searchStocks(String keyword) {
    String contains = "%" + keyword + "%";
    String startsWith = keyword + "%";

    @SuppressWarnings("unchecked")
    List<Object[]> rows = entityManager.createNativeQuery("""
        SELECT s.id,
               s.ticker,
               s.name,
               s.gics_sector,
               latest_price.close_price,
               latest_price.fluctuation_rate
        FROM stocks s
                 LEFT JOIN LATERAL (
            SELECT sp.close_price, sp.fluctuation_rate
            FROM stock_prices_daily sp
            WHERE sp.stock_id = s.id
            ORDER BY sp.trade_date DESC
            LIMIT 1
            ) latest_price ON TRUE
        WHERE s.is_active = true
          AND (
            s.name ILIKE :contains
                OR s.ticker ILIKE :contains
                OR COALESCE(s.gics_sector, '') ILIKE :contains
                OR COALESCE(s.category, '') ILIKE :contains
            )
        ORDER BY CASE
                     WHEN s.name ILIKE :startsWith THEN 0
                     WHEN s.ticker ILIKE :startsWith THEN 1
                     ELSE 2
                     END,
                 s.name
        """)
        .setParameter("contains", contains)
        .setParameter("startsWith", startsWith)
        .setMaxResults(STOCK_SEARCH_LIMIT)
        .getResultList();

    return rows.stream()
        .map(this::toStockItem)
        .toList();
  }

  public List<SearchNewsItemResponse> searchNews(String keyword) {
    String contains = "%" + keyword + "%";

    @SuppressWarnings("unchecked")
    List<Object[]> rows = entityManager.createNativeQuery("""
        SELECT n.id,
               n.title,
               n.publisher,
               n.published_at
        FROM stock_news n
        WHERE n.title ILIKE :contains
           OR COALESCE(n.snippet, '') ILIKE :contains
        ORDER BY n.published_at DESC
        """)
        .setParameter("contains", contains)
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
        toOffsetDateTime(row[3])
    );
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
