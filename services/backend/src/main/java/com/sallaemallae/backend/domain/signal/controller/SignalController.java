package com.sallaemallae.backend.domain.signal.controller;

import com.sallaemallae.backend.domain.signal.dto.SignalListResponse;
import com.sallaemallae.backend.domain.signal.service.SignalService;
import com.sallaemallae.backend.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "매매신호", description = "AI 매매신호 API")
@RestController
@RequestMapping("/api/signals")
@RequiredArgsConstructor
public class SignalController {

  private final SignalService signalService;

  @Operation(summary = "AI 매매신호 종목 리스트 조회", description = "최신 AI 리포트 기준 매수/매도 신호 종목 목록을 조회합니다.")
  @GetMapping
  public ApiResponse<SignalListResponse> getSignals(
      @Parameter(description = "신호 필터", example = "ALL")
      @RequestParam(defaultValue = "ALL") String filter,
      @Parameter(description = "정렬 기준", example = "LATEST")
      @RequestParam(defaultValue = "LATEST") String sort,
      @Parameter(description = "페이지 오프셋", example = "0")
      @RequestParam(defaultValue = "0") int offset,
      @Parameter(description = "페이지 크기", example = "6")
      @RequestParam(defaultValue = "6") int limit
  ) {
    return ApiResponse.success(signalService.getSignals(filter, sort, offset, limit));
  }
}
