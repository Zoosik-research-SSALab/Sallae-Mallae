package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockRealtimeMinutePipelinePreviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeMinuteSnapshotResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeSubscriptionResponse;

public interface StockRealtimeMinuteService {

  StockRealtimeSubscriptionResponse subscribe(String ticker, String marketCode);

  StockRealtimeMinuteSnapshotResponse getSnapshot(String ticker, String marketCode, int limit);

  StockRealtimeMinutePipelinePreviewResponse previewStoragePipeline(String ticker, String marketCode, int limit);
}
