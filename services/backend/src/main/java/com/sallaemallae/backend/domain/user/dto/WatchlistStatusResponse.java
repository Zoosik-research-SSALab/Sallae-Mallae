package com.sallaemallae.backend.domain.user.dto;

public record WatchlistStatusResponse(
    boolean isWatched,
    boolean isNotiEnabled
) {
}
