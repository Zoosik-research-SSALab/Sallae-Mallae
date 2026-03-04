package com.sallaemallae.backend.domain.search.dto;

import jakarta.validation.constraints.NotBlank;

public record SearchHistoryRequest(
    @NotBlank String keyword,
    Long stockId
) {
}
