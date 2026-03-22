package com.sallaemallae.backend.domain.user.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record WatchlistListResponse(
    long total,
    @JsonProperty("buy_count") long buyCount,
    @JsonProperty("sell_count") long sellCount,
    @JsonProperty("up_count") long upCount,
    List<WatchlistItemResponse> watchlist
) {
}
