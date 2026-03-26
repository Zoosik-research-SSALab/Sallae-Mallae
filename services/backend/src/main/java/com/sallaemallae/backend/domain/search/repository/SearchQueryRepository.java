package com.sallaemallae.backend.domain.search.repository;

import com.sallaemallae.backend.domain.search.dto.response.SearchNewsItemResponse;
import com.sallaemallae.backend.domain.search.dto.response.SearchStockItemResponse;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class SearchQueryRepository {

  private static final char[] INITIAL_CONSONANTS = {
      'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
      'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  };
  private static final int HANGUL_BASE = 0xAC00;
  private static final int HANGUL_LAST = 0xD7A3;
  private static final int HANGUL_INITIAL_CYCLE = 21 * 28;
  private static final String LIKE_ESCAPE = "\\";
  private static final int STOCK_SEARCH_LIMIT = 10;
  private static final int NEWS_SEARCH_LIMIT = 5;
  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");

  private final EntityManager entityManager;

  public List<SearchStockItemResponse> searchStocks(String keyword) {
    @SuppressWarnings("unchecked")
    List<Object[]> rows = entityManager.createNativeQuery("""
        SELECT s.id,
               s.ticker,
               s.name,
               s.gics_sector,
               s.icon_url,
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
        ORDER BY s.name
        """)
        .getResultList();

    return rows.stream()
        .map(this::toStockItem)
        .filter(item -> matchesStock(item, keyword))
        .sorted(stockComparator(keyword))
        .limit(STOCK_SEARCH_LIMIT)
        .toList();
  }

  public List<SearchNewsItemResponse> searchNews(String keyword) {
    @SuppressWarnings("unchecked")
    List<Object[]> rows = entityManager.createNativeQuery("""
        SELECT n.id,
               n.title,
               n.publisher,
               n.url,
               n.published_at
        FROM stock_news n
        WHERE n.published_at IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM news_keyword_map nkm
                     JOIN keywords k ON k.id = nkm.keyword_id
            WHERE nkm.news_id = n.id
              AND k.name = :keyword
          )
        ORDER BY n.published_at DESC, n.id DESC
        """)
        .setParameter("keyword", keyword)
        .setMaxResults(NEWS_SEARCH_LIMIT)
        .getResultList();

    return rows.stream()
        .map(this::toNewsItem)
        .toList();
  }

  static boolean matchesStock(SearchStockItemResponse item, String keyword) {
    return startsWithIgnoreCase(item.name(), keyword)
        || startsWithIgnoreCase(item.ticker(), keyword)
        || containsIgnoreCase(item.name(), keyword)
        || containsIgnoreCase(item.ticker(), keyword)
        || matchesInitialConsonant(item.name(), keyword);
  }

  static Comparator<SearchStockItemResponse> stockComparator(String keyword) {
    return Comparator
        .comparingInt((SearchStockItemResponse item) -> stockMatchPriority(item, keyword))
        .thenComparing(SearchStockItemResponse::name, String.CASE_INSENSITIVE_ORDER)
        .thenComparing(SearchStockItemResponse::ticker, String.CASE_INSENSITIVE_ORDER);
  }

  static int stockMatchPriority(SearchStockItemResponse item, String keyword) {
    if (startsWithIgnoreCase(item.name(), keyword)) {
      return 0;
    }
    if (startsWithIgnoreCase(item.ticker(), keyword)) {
      return 1;
    }
    if (matchesInitialConsonant(item.name(), keyword)) {
      return 2;
    }
    if (containsIgnoreCase(item.name(), keyword)) {
      return 3;
    }
    if (containsIgnoreCase(item.ticker(), keyword)) {
      return 4;
    }
    return 5;
  }

  private SearchStockItemResponse toStockItem(Object[] row) {
    return new SearchStockItemResponse(
        toLong(row[0]),
        (String) row[1],
        (String) row[2],
        (String) row[3],
        toInteger(row[5]),
        toBigDecimal(row[6]),
        (String) row[4]
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

  static boolean matchesInitialConsonant(String stockName, String keyword) {
    if (keyword == null || keyword.isBlank()) {
      return false;
    }
    String initials = extractInitialConsonants(stockName);
    return initials.startsWith(keyword);
  }

  static String extractInitialConsonants(String text) {
    StringBuilder builder = new StringBuilder();
    for (char ch : text.toCharArray()) {
      if (ch >= HANGUL_BASE && ch <= HANGUL_LAST) {
        int index = (ch - HANGUL_BASE) / HANGUL_INITIAL_CYCLE;
        builder.append(INITIAL_CONSONANTS[index]);
      } else if (!Character.isWhitespace(ch)) {
        builder.append(ch);
      }
    }
    return builder.toString();
  }

  private static boolean startsWithIgnoreCase(String text, String keyword) {
    return normalizeForCompare(text).startsWith(normalizeForCompare(keyword));
  }

  private static boolean containsIgnoreCase(String text, String keyword) {
    return normalizeForCompare(text).contains(normalizeForCompare(keyword));
  }

  private static String normalizeForCompare(String text) {
    return text == null ? "" : text.toLowerCase(Locale.ROOT);
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
