package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockBasicInfoResponse;
import com.sallaemallae.backend.domain.stock.dto.StockAnnouncementDetailResponse;
import com.sallaemallae.backend.domain.stock.dto.StockAnnouncementsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockAnnouncementsResponse.AnnouncementItem;
import com.sallaemallae.backend.domain.stock.dto.StockDetailResponse;
import com.sallaemallae.backend.domain.stock.dto.StockFinancialsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockFinancialsResponse.FinancialItem;
import com.sallaemallae.backend.domain.stock.dto.StockIndicatorsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockIndicatorsResponse.Dividend;
import com.sallaemallae.backend.domain.stock.dto.StockIndicatorsResponse.Earnings;
import com.sallaemallae.backend.domain.stock.dto.StockIndicatorsResponse.Valuation;
import com.sallaemallae.backend.domain.stock.dto.StockKeywordsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockKeywordsResponse.KeywordItem;
import com.sallaemallae.backend.domain.stock.dto.StockKeywordsResponse.NewsItem;
import com.sallaemallae.backend.domain.stock.dto.StockOverviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockOverviewResponse.LatestPrice;
import com.sallaemallae.backend.domain.stock.dto.StockOverviewResponse.PriceRange52w;
import com.sallaemallae.backend.domain.stock.dto.StockSummaryResponse;
import com.sallaemallae.backend.domain.stock.entity.StockAnnouncement;
import com.sallaemallae.backend.domain.stock.entity.StockDividendYieldSnapshot;
import com.sallaemallae.backend.domain.stock.entity.StockFinancial;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.repository.StockAnnouncementRepository;
import com.sallaemallae.backend.domain.stock.repository.StockDividendYieldSnapshotRepository;
import com.sallaemallae.backend.domain.stock.repository.StockFinancialRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.support.StockRequestNormalizer;
import com.sallaemallae.backend.domain.stock.repository.StockKeywordDataRepository;
import com.sallaemallae.backend.domain.stock.repository.StockKeywordsCacheRepository;
import com.sallaemallae.backend.domain.stock.entity.StockKeywordData;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class StockServiceImpl implements StockService {

  private static final String DIVIDEND_ANNOUNCEMENT_KEYWORD = "배당";
  private static final TypeReference<List<Map<String, Object>>> JSONB_LIST_TYPE = new TypeReference<>() {};

  private final StockRepository stockRepository;
  private final StockPriceDailyRepository stockPriceDailyRepository;
  private final StockFinancialRepository stockFinancialRepository;
  private final StockAnnouncementRepository stockAnnouncementRepository;
  private final StockDividendYieldSnapshotRepository stockDividendYieldSnapshotRepository;
  private final StockKeywordDataRepository stockKeywordDataRepository;
  private final StockKeywordsCacheRepository stockKeywordsCacheRepository;
  private final ObjectMapper objectMapper;

  @Override
  public Long resolveStockId(String ticker) {
    return stockRepository.findByTickerAndIsActiveTrue(
            StockRequestNormalizer.normalizeTicker(ticker, StockErrorCode.STOCK_NOT_FOUND)
        )
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND))
        .getId();
  }

  @Override
  public List<StockSummaryResponse> getAllStocks() {
    return stockRepository.findAllByIsActiveTrueOrderByNameAsc().stream()
        .map(this::toSummaryResponse)
        .toList();
  }

  @Override
  public StockDetailResponse getStockDetail(String ticker) {
    Stock stock = stockRepository.findByTickerAndIsActiveTrue(
            StockRequestNormalizer.normalizeTicker(ticker, StockErrorCode.STOCK_NOT_FOUND)
        )
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));
    return toDetailResponse(stock);
  }

  @Override
  public StockBasicInfoResponse getStockBasicInfo(Long stockId) {
    Stock stock = stockRepository.findByIdAndIsActiveTrue(stockId)
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));
    return toBasicInfoResponse(stock);
  }

  @Override
  public StockOverviewResponse getStockOverview(Long stockId) {
    Stock stock = stockRepository.findByIdAndIsActiveTrue(stockId)
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));

    StockPriceDaily latestPriceRow = stockPriceDailyRepository.findTopByStockIdOrderByTradeDateDescIdDesc(stockId)
        .orElse(null);

    LatestPrice latestPrice = latestPriceRow == null ? null : new LatestPrice(
        latestPriceRow.getTradeDate(),
        latestPriceRow.getClosePrice(),
        latestPriceRow.getFluctuationRate()
    );

    PriceRange52w priceRange52w = buildPriceRange52w(stockId, latestPriceRow);

    return new StockOverviewResponse(
        stock.getId(),
        stock.getTicker(),
        stock.getName(),
        stock.getMarketType() != null ? stock.getMarketType().name() : null,
        stock.getGicsSector(),
        stock.getCategory(),
        latestPrice,
        priceRange52w
    );
  }

  @Override
  public StockIndicatorsResponse getStockIndicators(Long stockId) {
    Stock stock = getActiveStock(stockId);
    StockFinancial latestFinancial = stockFinancialRepository.findLatestByStockId(stockId).orElse(null);
    StockPriceDaily latestPrice = stockPriceDailyRepository.findTopByStockIdOrderByTradeDateDescIdDesc(stockId).orElse(null);
    StockDividendYieldSnapshot latestDividend = stockDividendYieldSnapshotRepository
        .findFirstByStockIdAndIsLatestTrueOrderByAsOfDateDescIdDesc(stockId)
        .orElse(null);

    Float per = toFloat(latestFinancial == null ? null : latestFinancial.getPer());
    Float pbr = toFloat(latestFinancial == null ? null : latestFinancial.getPbr());
    Float roe = toFloat(latestFinancial == null ? null : latestFinancial.getRoe());
    Float psr = calculatePsr(latestFinancial, stock, latestPrice);
    Long eps = calculatePerShare(latestFinancial == null ? null : latestFinancial.getNetIncome(), stock.getOutstandingShares());
    Long bps = calculatePerShare(latestFinancial == null ? null : latestFinancial.getTotalEquity(), stock.getOutstandingShares());

    Float dividendYield = latestDividend == null ? null : latestDividend.cashDividendYieldValue();
    Integer annualDividendPerShare = calculateAnnualDividendPerShare(latestPrice, dividendYield);
    List<StockAnnouncement> dividendAnnouncements = stockAnnouncementRepository.findDividendAnnouncements(
        stockId,
        LocalDate.now().minusYears(1),
        DIVIDEND_ANNOUNCEMENT_KEYWORD
    );

    return new StockIndicatorsResponse(
        new Valuation(per, psr, pbr),
        new Earnings(eps, bps, roe),
        new Dividend(
            "최근 12개월",
            dividendAnnouncements.size(),
            formatAnnouncementMonths(dividendAnnouncements),
            annualDividendPerShare,
            dividendYield
        )
    );
  }

  @Override
  public StockFinancialsResponse getStockFinancials(Long stockId, String type) {
    getActiveStock(stockId);
    String normalizedType = normalizeFinancialType(type);
    List<FinancialItem> financials = stockFinancialRepository.findByStockIdAndType(stockId, normalizedType).stream()
        .map(this::toFinancialItem)
        .toList();
    return new StockFinancialsResponse(financials);
  }

  /** 종목별 키워드 상위 3개 + 키워드당 뉴스 3건 조회 (Redis 캐시 → DB fallback) */
  @Override
  public StockKeywordsResponse getStockKeywords(Long stockId) {
    getActiveStock(stockId);

    // 1. Redis 캐시 히트 시 즉시 반환
    var cached = stockKeywordsCacheRepository.get(stockId);
    if (cached.isPresent()) {
      return cached.get();
    }

    // 2. DB에서 최신 데이터 조회
    StockKeywordData data = stockKeywordDataRepository
        .findTopByStockIdOrderByReportDateDesc(stockId)
        .orElse(null);

    if (data == null || data.getTopKeywords() == null) {
      return new StockKeywordsResponse(List.of(), List.of());
    }

    // 3. JSONB 파싱 → DTO 변환
    StockKeywordsResponse response = parseKeywordData(data.getTopKeywords());

    // 4. Redis 캐시 저장 (빈 응답은 캐시하지 않음 — 파싱 실패 시 stale 방지)
    if (!response.keywords().isEmpty()) {
      stockKeywordsCacheRepository.save(stockId, response);
    }

    return response;
  }

  /** news_agent_stock_data.top_keywords JSONB → StockKeywordsResponse 변환 */
  private StockKeywordsResponse parseKeywordData(String topKeywordsJson) {
    List<Map<String, Object>> items;
    try {
      items = objectMapper.readValue(topKeywordsJson, JSONB_LIST_TYPE);
    } catch (Exception e) {
      log.warn("top_keywords JSONB 파싱 실패", e);
      return new StockKeywordsResponse(List.of(), List.of());
    }

    List<KeywordItem> keywords = new ArrayList<>();
    List<NewsItem> news = new ArrayList<>();

    for (Map<String, Object> item : items) {
      Number kwId = (Number) item.get("keyword_id");
      String kwName = (String) item.get("keyword");
      keywords.add(new KeywordItem(kwId != null ? kwId.longValue() : null, kwName));

      @SuppressWarnings("unchecked")
      List<Map<String, Object>> newsItems = (List<Map<String, Object>>) item.get("news");
      if (newsItems == null) {
        continue;
      }
      for (Map<String, Object> n : newsItems) {
        Number newsId = (Number) n.get("news_id");
        String title = (String) n.get("title");
        String publisher = (String) n.get("publisher");
        String publishedAtStr = (String) n.get("published_at");
        java.time.OffsetDateTime publishedAt = null;
        if (publishedAtStr != null) {
          try {
            publishedAt = java.time.OffsetDateTime.parse(publishedAtStr);
          } catch (Exception ignored) {
          }
        }
        news.add(new NewsItem(
            newsId != null ? newsId.longValue() : null,
            title,
            publisher,
            publishedAt
        ));
      }
    }

    return new StockKeywordsResponse(keywords, news);
  }

  @Override
  public StockAnnouncementsResponse getStockAnnouncements(Long stockId, int limit, int offset) {
    getActiveStock(stockId);
    int safeLimit = Math.max(1, Math.min(limit, 100));
    int safeOffset = Math.max(0, offset);
    List<AnnouncementItem> announcements = stockAnnouncementRepository
        .findPageByStockId(stockId, safeLimit, safeOffset)
        .stream()
        .map(this::toAnnouncementItem)
        .toList();

    return new StockAnnouncementsResponse(
        stockAnnouncementRepository.countByStockId(stockId),
        announcements
    );
  }

  @Override
  public StockAnnouncementDetailResponse getStockAnnouncement(Long stockId, Long announcementId) {
    getActiveStock(stockId);
    StockAnnouncement announcement = stockAnnouncementRepository.findByIdAndStockId(announcementId, stockId)
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_ANNOUNCEMENT_NOT_FOUND));
    return new StockAnnouncementDetailResponse(
        announcement.getId(),
        announcement.getTitle(),
        announcement.getAnnouncedAt(),
        announcement.getContent(),
        announcement.getUrl()
    );
  }

  private StockSummaryResponse toSummaryResponse(Stock stock) {
    return new StockSummaryResponse(
        stock.getId(),
        stock.getTicker(),
        stock.getName(),
        stock.getMarketType() != null ? stock.getMarketType().name() : null
    );
  }

  private StockDetailResponse toDetailResponse(Stock stock) {
    return new StockDetailResponse(
        stock.getId(),
        stock.getTicker(),
        stock.getName(),
        stock.getMarketType() != null ? stock.getMarketType().name() : null,
        stock.getGicsSector(),
        stock.getCategory(),
        stock.getUpdatedAt()
    );
  }

  private StockBasicInfoResponse toBasicInfoResponse(Stock stock) {
    return new StockBasicInfoResponse(
        stock.getId(),
        stock.getTicker(),
        stock.getName(),
        stock.getMarketType() != null ? stock.getMarketType().name() : null,
        stock.getGicsSector(),
        stock.getCategory(),
        stock.getUpdatedAt()
    );
  }

  private Stock getActiveStock(Long stockId) {
    return stockRepository.findByIdAndIsActiveTrue(stockId)
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));
  }

  private PriceRange52w buildPriceRange52w(Long stockId, StockPriceDaily latestPriceRow) {
    if (latestPriceRow == null) {
      return null;
    }

    LocalDate latestTradeDate = latestPriceRow.getTradeDate();
    LocalDate rangeStart = latestTradeDate.minusYears(1);
    List<StockPriceDaily> rangePrices = stockPriceDailyRepository.findByStockIdAndTradeDateBetweenOrderByTradeDateDescIdDesc(
        stockId,
        rangeStart,
        latestTradeDate
    );
    if (rangePrices.isEmpty()) {
      return null;
    }

    StockPriceDaily highest = null;
    StockPriceDaily lowest = null;
    for (StockPriceDaily row : rangePrices) {
      if (row.getHighPrice() != null && (highest == null || row.getHighPrice() > highest.getHighPrice())) {
        highest = row;
      }
      if (row.getLowPrice() != null && (lowest == null || row.getLowPrice() < lowest.getLowPrice())) {
        lowest = row;
      }
    }

    Integer latestClosePrice = latestPriceRow.getClosePrice();
    Float distanceFromHighRate = highest == null ? null : calculateDistanceRate(latestClosePrice, highest.getHighPrice());
    Float distanceFromLowRate = lowest == null ? null : calculateDistanceRate(latestClosePrice, lowest.getLowPrice());

    return new PriceRange52w(
        highest != null ? highest.getHighPrice() : null,
        highest != null ? highest.getTradeDate() : null,
        lowest != null ? lowest.getLowPrice() : null,
        lowest != null ? lowest.getTradeDate() : null,
        distanceFromHighRate,
        distanceFromLowRate
    );
  }

  private Float calculateDistanceRate(Integer latestPrice, Integer referencePrice) {
    if (latestPrice == null || referencePrice == null || referencePrice == 0) {
      return null;
    }
    return (latestPrice - referencePrice) * 100.0f / referencePrice;
  }

  private String normalizeFinancialType(String type) {
    if (type == null || type.isBlank()) {
      return "YEARLY";
    }

    String normalized = type.trim().toUpperCase(Locale.ROOT);
    if (!normalized.equals("YEARLY") && !normalized.equals("QUARTERLY")) {
      throw new BusinessException(StockErrorCode.STOCK_FINANCIAL_TYPE_INVALID);
    }
    return normalized;
  }

  private FinancialItem toFinancialItem(StockFinancial financial) {
    return new FinancialItem(
        financial.getReportYear(),
        parseQuarter(financial.getReportQuarter()),
        financial.getRevenue(),
        financial.getOperatingProfit()
    );
  }

  private Integer parseQuarter(String reportQuarter) {
    if (reportQuarter == null || reportQuarter.equals("YEARLY")) {
      return null;
    }
    if (reportQuarter.endsWith("Q")) {
      String numericPart = reportQuarter.replace("Q", "");
      if (numericPart.isBlank()) {
        return null;
      }
      try {
        return Integer.parseInt(numericPart);
      } catch (NumberFormatException ignored) {
        return null;
      }
    }
    return null;
  }

  private Float toFloat(BigDecimal value) {
    return value == null ? null : value.floatValue();
  }

  private Float calculatePsr(StockFinancial latestFinancial, Stock stock, StockPriceDaily latestPrice) {
    if (latestFinancial == null
        || latestPrice == null
        || latestFinancial.getRevenue() == null
        || latestFinancial.getRevenue() == 0
        || stock.getOutstandingShares() == null
        || stock.getOutstandingShares() == 0
        || latestPrice.getClosePrice() == null) {
      return null;
    }

    BigDecimal marketCap = BigDecimal.valueOf(latestPrice.getClosePrice()).multiply(BigDecimal.valueOf(stock.getOutstandingShares()));
    return marketCap.divide(BigDecimal.valueOf(latestFinancial.getRevenue()), 4, RoundingMode.HALF_UP).floatValue();
  }

  private Long calculatePerShare(Long value, Long outstandingShares) {
    if (value == null || outstandingShares == null || outstandingShares == 0) {
      return null;
    }
    return BigDecimal.valueOf(value)
        .divide(BigDecimal.valueOf(outstandingShares), 0, RoundingMode.HALF_UP)
        .longValue();
  }

  private Integer calculateAnnualDividendPerShare(StockPriceDaily latestPrice, Float dividendYield) {
    if (latestPrice == null || latestPrice.getClosePrice() == null || dividendYield == null) {
      return null;
    }
    return BigDecimal.valueOf(latestPrice.getClosePrice())
        .multiply(BigDecimal.valueOf(dividendYield))
        .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
        .intValue();
  }

  private String formatAnnouncementMonths(List<StockAnnouncement> announcements) {
    if (announcements.isEmpty()) {
      return "";
    }

    Set<Integer> months = new LinkedHashSet<>();
    announcements.stream()
        .sorted(Comparator.comparing(StockAnnouncement::getAnnouncedAt))
        .forEach(item -> months.add(item.getAnnouncedAt().getMonthValue()));

    List<String> labels = new ArrayList<>();
    for (Integer monthValue : months) {
      labels.add(Month.of(monthValue).getDisplayName(TextStyle.FULL, Locale.KOREAN));
    }
    return String.join(", ", labels);
  }

  private AnnouncementItem toAnnouncementItem(StockAnnouncement announcement) {
    return new AnnouncementItem(
        announcement.getId(),
        announcement.getTitle(),
        announcement.getAnnouncedAt()
    );
  }

}
