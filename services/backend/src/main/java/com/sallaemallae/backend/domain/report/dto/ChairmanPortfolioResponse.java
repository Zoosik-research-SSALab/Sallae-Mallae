package com.sallaemallae.backend.domain.report.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ChairmanPortfolioResponse(
    @Schema(description = "포트폴리오 갱신 시각")
    OffsetDateTime updatedAt,
    @Schema(description = "포트폴리오 요약 정보")
    Summary summary,
    @Schema(description = "오늘의 시그널 요약")
    SignalSummary signalSummary,
    @Schema(description = "인기 종목 AI 신호")
    List<PopularSignalItem> popularSignals,
    @Schema(description = "현재 조회 중인 탭", example = "HOLDINGS")
    String tab,
    @Schema(description = "현재 보유 종목 목록", nullable = true)
    List<HoldingItem> holdings,
    @Schema(description = "오늘 매매 내역", nullable = true)
    List<TodayTradeItem> todayTrades,
    @Schema(description = "월간 수익률 추이", nullable = true)
    List<MonthlyReturnItem> monthlyReturns,
    @Schema(description = "페이지 정보")
    PageInfo page
) {

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record Summary(
      @Schema(description = "누적 수익률", example = "42.5")
      Float cumulativeReturn,
      @Schema(description = "월간 평균 수익률", example = "2.15")
      Float hitRate,
      @Schema(description = "전일 수익률", example = "1.34", nullable = true)
      Float yesterdayReturn,
      @Schema(description = "코스피 대비 초과 수익률", example = "15.4", nullable = true)
      Float alphaVsKospi,
      @Schema(description = "현재 보유 종목 수", example = "12")
      Integer holdingCount
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record SignalSummary(
      @Schema(description = "매수 포착 종목 수", example = "15")
      Integer buyCount,
      @Schema(description = "매도 청산 종목 수", example = "8")
      Integer sellCount,
      @Schema(description = "보유 유지 종목 수", example = "124")
      Integer holdCount,
      @Schema(description = "관망/보류 종목 수", example = "53")
      Integer watchCount
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record PopularSignalItem(
      @Schema(description = "노출 순위", example = "1")
      Integer rank,
      @Schema(description = "종목 ID", example = "1")
      Long stockId,
      @Schema(description = "종목 코드", example = "005930")
      String ticker,
      @Schema(description = "종목명", example = "삼성전자")
      String name,
      @Schema(description = "현재가", example = "74300")
      Integer price,
      @Schema(description = "AI 매매신호", example = "BUY")
      String signal
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record HoldingItem(
      @Schema(description = "종목 ID", example = "1")
      Long stockId,
      @Schema(description = "종목 코드", example = "005930")
      String ticker,
      @Schema(description = "종목명", example = "삼성전자")
      String name,
      @Schema(description = "매수 단가", example = "65000", nullable = true)
      Float buyPrice,
      @Schema(description = "현재가", example = "74300", nullable = true)
      Integer currentPrice,
      @Schema(description = "보유 일수", example = "14", nullable = true)
      Integer holdingDays,
      @Schema(description = "보유 수량", example = "12", nullable = true)
      Long holdingQuantity,
      @Schema(description = "수익률", example = "14.43", nullable = true)
      Float returnRate
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record TodayTradeItem(
      @Schema(description = "종목 ID", example = "1")
      Long stockId,
      @Schema(description = "종목 코드", example = "005930")
      String ticker,
      @Schema(description = "종목명", example = "삼성전자")
      String name,
      @Schema(description = "매매 유형", example = "BUY")
      String tradeType,
      @Schema(description = "매매 시각")
      OffsetDateTime tradeTime,
      @Schema(description = "매매 단가", example = "65000", nullable = true)
      Float tradePrice,
      @Schema(description = "현재가", example = "74300", nullable = true)
      Integer currentPrice,
      @Schema(description = "보유 수량", example = "12", nullable = true)
      Long holdingQuantity,
      @Schema(description = "수익률", example = "3.21", nullable = true)
      Float returnRate
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record MonthlyReturnItem(
      @Schema(description = "기준 월", example = "2026-03")
      String month,
      @Schema(description = "월간 수익률", example = "4.31")
      Float monthlyReturn,
      @Schema(description = "월간 실현 손익 금액", example = "1823400", nullable = true)
      Long realizedProfitAmount,
      @Schema(description = "월간 매수 횟수", example = "6", nullable = true)
      Integer buyCount,
      @Schema(description = "월간 매도 횟수", example = "4", nullable = true)
      Integer sellCount,
      @Schema(description = "코스피 월간 수익률", example = "2.17", nullable = true)
      Float kospiReturn,
      @Schema(description = "초과 수익률", example = "2.14", nullable = true)
      Float alpha
  ) {
  }

  @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
  public record PageInfo(
      @Schema(description = "오프셋", example = "0")
      Integer offset,
      @Schema(description = "페이지 크기", example = "6")
      Integer limit,
      @Schema(description = "전체 개수", example = "12")
      Integer totalCount
  ) {
  }
}
