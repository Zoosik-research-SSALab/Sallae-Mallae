package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockBasicInfoResponse;
import com.sallaemallae.backend.domain.stock.dto.StockAnnouncementDetailResponse;
import com.sallaemallae.backend.domain.stock.dto.StockAnnouncementsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockDetailResponse;
import com.sallaemallae.backend.domain.stock.dto.StockFinancialsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockIndicatorsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockKeywordsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockOverviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockSummaryResponse;
import java.util.List;

public interface StockService {

  Long resolveStockId(String ticker);

  List<StockSummaryResponse> getAllStocks();

  StockDetailResponse getStockDetail(String ticker);

  StockBasicInfoResponse getStockBasicInfo(Long stockId);

  StockOverviewResponse getStockOverview(Long stockId);

  StockIndicatorsResponse getStockIndicators(Long stockId);

  StockFinancialsResponse getStockFinancials(Long stockId, String type);

  StockKeywordsResponse getStockKeywords(Long stockId);

  StockAnnouncementsResponse getStockAnnouncements(Long stockId, int limit, int offset);

  StockAnnouncementDetailResponse getStockAnnouncement(Long stockId, Long announcementId);
}
