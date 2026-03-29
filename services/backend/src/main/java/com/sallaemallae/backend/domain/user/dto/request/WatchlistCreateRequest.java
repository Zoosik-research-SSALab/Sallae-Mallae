package com.sallaemallae.backend.domain.user.dto.request;

import jakarta.validation.constraints.NotNull;

public record WatchlistCreateRequest(
    @NotNull Long stockId
) {
}
