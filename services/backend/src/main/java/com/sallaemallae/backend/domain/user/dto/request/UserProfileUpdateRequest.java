package com.sallaemallae.backend.domain.user.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UserProfileUpdateRequest(
    @NotBlank String nickname,
    String profileImageUrl
) {
}
