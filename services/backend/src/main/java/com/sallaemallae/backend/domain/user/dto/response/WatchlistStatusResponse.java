package com.sallaemallae.backend.domain.user.dto.response;

public record WatchlistStatusResponse(
    boolean isWatched,
    boolean isNotiEnabled
) {
}
