package com.sallaemallae.backend.domain.user.dto;

import jakarta.validation.constraints.NotNull;

public record WatchlistAlertToggleRequest(
    @NotNull Boolean alarmOn
) {
}
