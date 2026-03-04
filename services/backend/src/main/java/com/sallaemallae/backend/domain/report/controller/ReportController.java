package com.sallaemallae.backend.domain.report.controller;

import com.sallaemallae.backend.domain.report.dto.StockReportResponse;
import com.sallaemallae.backend.domain.report.service.ReportService;
import com.sallaemallae.backend.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

  private final ReportService reportService;

  @GetMapping("/{ticker}/latest")
  public ApiResponse<StockReportResponse> getLatest(@PathVariable String ticker) {
    return ApiResponse.ok(reportService.getLatestReport(ticker));
  }
}
