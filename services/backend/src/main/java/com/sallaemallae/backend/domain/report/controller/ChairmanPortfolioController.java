package com.sallaemallae.backend.domain.report.controller;

import com.sallaemallae.backend.domain.report.dto.ChairmanHallOfFameResponse;
import com.sallaemallae.backend.domain.report.dto.ChairmanPortfolioResponse;
import com.sallaemallae.backend.domain.report.service.ChairmanPortfolioService;
import com.sallaemallae.backend.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "리포트", description = "의장 포트폴리오 API")
@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class ChairmanPortfolioController {

  private final ChairmanPortfolioService chairmanPortfolioService;

  @Operation(summary = "의장 포트폴리오 메인 조회", description = "의장 포트폴리오 요약과 탭별 데이터를 조회합니다.")
  @GetMapping("/chairman")
  public ApiResponse<ChairmanPortfolioResponse> getChairmanPortfolio(
      @Parameter(description = "조회 탭", example = "HOLDINGS")
      @RequestParam(defaultValue = "HOLDINGS") String tab,
      @Parameter(description = "페이지 오프셋", example = "0")
      @RequestParam(defaultValue = "0") int offset,
      @Parameter(description = "페이지 크기", example = "6")
      @RequestParam(defaultValue = "6") int limit
  ) {
    return ApiResponse.success(chairmanPortfolioService.getChairmanPortfolio(tab, offset, limit));
  }

  @Operation(summary = "의장 포트폴리오 명예의 전당 조회", description = "종목 기준 적중률/수익률 랭킹 지표를 조회합니다.")
  @GetMapping("/chairman/hall-of-fame")
  public ApiResponse<ChairmanHallOfFameResponse> getChairmanHallOfFame() {
    return ApiResponse.success(chairmanPortfolioService.getChairmanHallOfFame());
  }
}
