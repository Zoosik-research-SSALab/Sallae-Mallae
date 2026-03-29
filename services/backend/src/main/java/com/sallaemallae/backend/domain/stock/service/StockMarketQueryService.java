package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockDataPipelinePreviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockPeriodPriceResponse;
import com.sallaemallae.backend.domain.stock.dto.StockQuoteResponse;

public interface StockMarketQueryService {

  StockQuoteResponse getQuote(String ticker, String marketCode);

  StockPeriodPriceResponse getPeriodPrices(
      String ticker,
      String marketCode,
      String periodCode,
      String startDate,
      String endDate,
      boolean adjusted
  );

  StockDataPipelinePreviewResponse previewStoragePipeline(
      String ticker,
      String marketCode,
      String periodCode,
      String startDate,
      String endDate,
      boolean adjusted
  );
}
