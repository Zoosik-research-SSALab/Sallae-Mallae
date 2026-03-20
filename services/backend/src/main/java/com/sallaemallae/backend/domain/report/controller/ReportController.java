package com.sallaemallae.backend.domain.report.controller;

import com.sallaemallae.backend.domain.report.dto.PerformanceResponse;
import com.sallaemallae.backend.domain.report.dto.PerformanceTradesResponse;
import com.sallaemallae.backend.domain.report.dto.ReportHistoryItemResponse;
import com.sallaemallae.backend.domain.report.service.ReportService;
import com.sallaemallae.backend.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "리포트", description = "종목 리포트 API")
@RestController
@RequestMapping("/api/report")
@RequiredArgsConstructor
public class ReportController {

  private final ReportService reportService;

  @Operation(summary = "리포트 이력 조회", description = "종목별 의장 분석 및 토론 기록 이력을 페이징 조회합니다.")
  @GetMapping("/{stockId}")
  public ApiResponse<List<ReportHistoryItemResponse>> getReportHistory(
      @Parameter(description = "종목 ID", example = "1")
      @PathVariable Long stockId,
      @Parameter(description = "페이지 오프셋", example = "0")
      @RequestParam(defaultValue = "0") int offset,
      @Parameter(description = "페이지 크기", example = "30")
      @RequestParam(defaultValue = "30") int limit
  ) {
    return ApiResponse.success(reportService.getReportHistory(stockId, offset, limit));
  }

  @Operation(summary = "모의투자 성과 조회", description = "종목별 모의투자 성과 요약, 보유 정보, 가격 차트를 조회합니다.")
  @GetMapping("/{stockId}/performance")
  public ApiResponse<PerformanceResponse> getPerformance(
      @Parameter(description = "종목 ID", example = "1")
      @PathVariable Long stockId
  ) {
    return ApiResponse.success(reportService.getPerformance(stockId));
  }

  @Operation(summary = "모의투자 거래 내역 조회", description = "종목별 AI 매매 내역을 페이징 조회합니다.")
  @GetMapping("/{stockId}/performance/trades")
  public ApiResponse<PerformanceTradesResponse> getPerformanceTrades(
      @Parameter(description = "종목 ID", example = "1")
      @PathVariable Long stockId,
      @Parameter(description = "페이지 오프셋", example = "0")
      @RequestParam(defaultValue = "0") int offset,
      @Parameter(description = "페이지 크기", example = "30")
      @RequestParam(defaultValue = "30") int limit
  ) {
    return ApiResponse.success(reportService.getPerformanceTrades(stockId, offset, limit));
  }
}
