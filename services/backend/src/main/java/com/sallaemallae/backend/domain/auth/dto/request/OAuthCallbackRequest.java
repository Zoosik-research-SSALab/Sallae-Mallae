package com.sallaemallae.backend.domain.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record OAuthCallbackRequest(
    @NotBlank String authorizationCode,
    @NotBlank String state
) {
}
