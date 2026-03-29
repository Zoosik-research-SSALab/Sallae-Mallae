package com.sallaemallae.backend.domain.stock.dto;

import java.util.List;

public record StockDataPipelinePreviewResponse(
    String ticker,
    String name,
    String market,
    Long resolvedStockId,
    boolean stockMapped,
    StockQuoteResponse quote,
    StockPeriodPriceResponse periodPrices,
    StockStoragePreviewResponse minutePreview,
    List<StockStoragePreviewResponse> aggregatePreviews
) {
}
