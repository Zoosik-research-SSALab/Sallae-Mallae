package com.sallaemallae.backend.domain.report.service;

import com.sallaemallae.backend.domain.report.dto.ChairmanReportResponse;
import com.sallaemallae.backend.domain.report.dto.DebateResponse;
import com.sallaemallae.backend.domain.report.dto.PerformanceResponse;
import com.sallaemallae.backend.domain.report.dto.PerformanceTradesResponse;
import com.sallaemallae.backend.domain.report.dto.ReportHistoryItemResponse;
import java.util.List;

public interface ReportService {

  List<ReportHistoryItemResponse> getReportHistory(Long stockId);

  PerformanceResponse getPerformance(Long stockId);

  PerformanceTradesResponse getPerformanceTrades(Long stockId);
}
