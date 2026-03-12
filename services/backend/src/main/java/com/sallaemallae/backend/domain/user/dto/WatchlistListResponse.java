package com.sallaemallae.backend.domain.user.dto;

import java.util.List;

public record WatchlistListResponse(
    long total,
    List<WatchlistItemResponse> watchlist
) {
}
