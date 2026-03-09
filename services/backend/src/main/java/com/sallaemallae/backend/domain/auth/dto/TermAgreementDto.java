package com.sallaemallae.backend.domain.auth.dto;

import jakarta.validation.constraints.NotNull;

public record TermAgreementDto(
    @NotNull Long termsId,
    @NotNull Boolean agreed
) {
}
