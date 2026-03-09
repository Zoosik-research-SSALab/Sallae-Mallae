package com.sallaemallae.backend.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record OAuthCallbackRequest(
    @NotBlank String authorizationCode,
    @NotBlank String redirectUri,
    @NotBlank String state
) {
}
