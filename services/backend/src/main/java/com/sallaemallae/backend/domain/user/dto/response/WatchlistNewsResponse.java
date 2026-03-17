package com.sallaemallae.backend.domain.user.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "관심종목 뉴스 응답")
public record WatchlistNewsResponse(
    @Schema(description = "관심종목 뉴스 목록")
    List<WatchlistNewsItemResponse> news) {
}
