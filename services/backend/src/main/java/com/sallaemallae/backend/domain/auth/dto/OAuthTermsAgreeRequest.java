package com.sallaemallae.backend.domain.auth.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record OAuthTermsAgreeRequest(
    @NotBlank String tempToken,
    @NotBlank String nickname,
    boolean emailOptIn,
    @NotNull @Valid List<TermAgreementDto> agreements
) {
}
