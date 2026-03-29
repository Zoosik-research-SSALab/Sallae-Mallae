package com.sallaemallae.backend.domain.stock.dto;

import java.util.List;

public record StockRealtimeMinutePipelinePreviewResponse(
    String ticker,
    String market,
    boolean connected,
    boolean subscriptionRequested,
    boolean subscriptionAcknowledged,
    StockStoragePreviewResponse currentMinutePreview,
    List<StockStoragePreviewResponse> recentClosedMinutePreviews
) {
}
