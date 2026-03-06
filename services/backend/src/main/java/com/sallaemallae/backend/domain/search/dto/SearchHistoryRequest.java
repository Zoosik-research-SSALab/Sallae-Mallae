package com.sallaemallae.backend.domain.search.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SearchHistoryRequest(
    @NotBlank String keyword,
    @NotNull @JsonProperty("stock_id") Long stockId
) {
}
