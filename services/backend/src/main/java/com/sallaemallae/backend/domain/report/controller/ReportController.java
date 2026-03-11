package com.sallaemallae.backend.domain.report.controller;

import com.sallaemallae.backend.domain.report.dto.PerformanceResponse;
import com.sallaemallae.backend.domain.report.dto.PerformanceTradesResponse;
import com.sallaemallae.backend.domain.report.dto.ReportHistoryItemResponse;
import com.sallaemallae.backend.domain.report.service.ReportService;
import com.sallaemallae.backend.global.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/report")
@RequiredArgsConstructor
public class ReportController {

  private final ReportService reportService;

  @GetMapping("/{stockId}")
  public ApiResponse<List<ReportHistoryItemResponse>> getReportHistory(@PathVariable Long stockId) {
    return ApiResponse.success(reportService.getReportHistory(stockId));
  }

  @GetMapping("/{stockId}/performance")
  public ApiResponse<PerformanceResponse> getPerformance(@PathVariable Long stockId) {
    return ApiResponse.success(reportService.getPerformance(stockId));
  }

  @GetMapping("/{stockId}/performance/trades")
  public ApiResponse<PerformanceTradesResponse> getPerformanceTrades(@PathVariable Long stockId) {
    return ApiResponse.success(reportService.getPerformanceTrades(stockId));
  }
}
