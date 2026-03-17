package com.sallaemallae.backend.domain.signal.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SignalListResponse(
    @Schema(description = "매수 신호 종목 수", example = "15")
    Integer buyCount,
    @Schema(description = "매도 신호 종목 수", example = "8")
    Integer sellCount,
    @Schema(description = "신호 종목 목록")
    List<SignalItemResponse> signals
) {
}
