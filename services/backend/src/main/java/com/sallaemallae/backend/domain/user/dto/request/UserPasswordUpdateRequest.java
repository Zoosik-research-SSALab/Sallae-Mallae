package com.sallaemallae.backend.domain.user.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UserPasswordUpdateRequest(
    @NotBlank String currentPassword,
    @NotBlank String newPassword
) {
}
