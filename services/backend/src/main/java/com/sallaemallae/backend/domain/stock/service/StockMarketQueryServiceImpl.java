package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockDataPipelinePreviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockPeriodPriceResponse;
import com.sallaemallae.backend.domain.stock.dto.StockQuoteResponse;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.support.StockRequestNormalizer;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.infra.kis.KisApiException;
import com.sallaemallae.backend.infra.kis.cache.CachedResult;
import com.sallaemallae.backend.infra.kis.stock.CachedKisDomesticStockGateway;
import com.sallaemallae.backend.infra.kis.stock.KisPeriodPriceData;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class StockMarketQueryServiceImpl implements StockMarketQueryService {

  private static final DateTimeFormatter BASIC_DATE = DateTimeFormatter.BASIC_ISO_DATE;

  private final CachedKisDomesticStockGateway cachedGateway;
  private final StockDataPipelineMapper pipelineMapper;
  private final StockRepository stockRepository;

  @Override
  public StockQuoteResponse getQuote(String ticker, String marketCode) {
    String normalizedTicker = StockRequestNormalizer.normalizeTicker(ticker, StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    String normalizedMarket = StockRequestNormalizer.normalizeMarket(marketCode, StockErrorCode.STOCK_MARKET_INPUT_INVALID);

    try {
      CachedResult<KisQuoteData> quote = cachedGateway.getQuote(normalizedMarket, normalizedTicker);
      return pipelineMapper.toQuoteResponse(quote, quote.value().name());
    } catch (KisApiException e) {
      log.warn("Failed to fetch KIS quote. ticker={}, market={}, code={}", normalizedTicker, normalizedMarket, e.getCode(), e);
      throw new BusinessException(StockErrorCode.STOCK_MARKET_DATA_UNAVAILABLE);
    }
  }

  @Override
  public StockPeriodPriceResponse getPeriodPrices(
      String ticker,
      String marketCode,
      String periodCode,
      String startDate,
      String endDate,
      boolean adjusted
  ) {
    String normalizedTicker = StockRequestNormalizer.normalizeTicker(ticker, StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    String normalizedMarket = StockRequestNormalizer.normalizeMarket(marketCode, StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    String normalizedPeriod = StockRequestNormalizer.normalizePeriod(periodCode, StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    LocalDate parsedStartDate = parseDate(startDate);
    LocalDate parsedEndDate = parseDate(endDate);
    validateDateRange(parsedStartDate, parsedEndDate);

    try {
      CachedResult<KisPeriodPriceData> period = cachedGateway.getPeriodPrices(
          normalizedMarket,
          normalizedTicker,
          normalizedPeriod,
          parsedStartDate,
          parsedEndDate,
          adjusted
      );
      return pipelineMapper.toPeriodPriceResponse(period, period.value().name());
    } catch (KisApiException e) {
      log.warn(
          "Failed to fetch KIS period prices. ticker={}, market={}, period={}, code={}",
          normalizedTicker,
          normalizedMarket,
          normalizedPeriod,
          e.getCode(),
          e
      );
      throw new BusinessException(StockErrorCode.STOCK_MARKET_DATA_UNAVAILABLE);
    }
  }

  @Override
  public StockDataPipelinePreviewResponse previewStoragePipeline(
      String ticker,
      String marketCode,
      String periodCode,
      String startDate,
      String endDate,
      boolean adjusted
  ) {
    String normalizedTicker = StockRequestNormalizer.normalizeTicker(ticker, StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    String normalizedMarket = StockRequestNormalizer.normalizeMarket(marketCode, StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    String normalizedPeriod = StockRequestNormalizer.normalizePeriod(periodCode, StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    LocalDate parsedStartDate = parseDate(startDate);
    LocalDate parsedEndDate = parseDate(endDate);
    validateDateRange(parsedStartDate, parsedEndDate);
    Long stockId = resolveStockId(normalizedTicker);

    try {
      CachedResult<KisQuoteData> quote = cachedGateway.getQuote(normalizedMarket, normalizedTicker);
      CachedResult<KisPeriodPriceData> period = cachedGateway.getPeriodPrices(
          normalizedMarket,
          normalizedTicker,
          normalizedPeriod,
          parsedStartDate,
          parsedEndDate,
          adjusted
      );

      StockQuoteResponse quoteResponse = pipelineMapper.toQuoteResponse(
          quote,
          quote.value().name()
      );
      StockPeriodPriceResponse periodResponse = pipelineMapper.toPeriodPriceResponse(
          period,
          period.value().name()
      );

      return new StockDataPipelinePreviewResponse(
          normalizedTicker,
          periodResponse.name(),
          normalizedMarket,
          stockId,
          stockId != null,
          quoteResponse,
          periodResponse,
          pipelineMapper.toMinutePreview(stockId, normalizedTicker, quote.value()),
          pipelineMapper.toAggregatePreviews(stockId, normalizedTicker, normalizedPeriod, period.value().candles())
      );
    } catch (KisApiException e) {
      log.warn(
          "Failed to build KIS storage preview. ticker={}, market={}, period={}, code={}",
          normalizedTicker,
          normalizedMarket,
          normalizedPeriod,
          e.getCode(),
          e
      );
      throw new BusinessException(StockErrorCode.STOCK_MARKET_DATA_UNAVAILABLE);
    }
  }

  private LocalDate parseDate(String value) {
    try {
      return LocalDate.parse(value, BASIC_DATE);
    } catch (DateTimeParseException e) {
      throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    }
  }

  private void validateDateRange(LocalDate startDate, LocalDate endDate) {
    if (startDate.isAfter(endDate)) {
      throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    }
  }

  private Long resolveStockId(String ticker) {
    return stockRepository.findByTicker(ticker)
        .map(stock -> stock.getId())
        .orElse(null);
  }
}
