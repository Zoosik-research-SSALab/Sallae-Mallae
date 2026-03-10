package com.sallaemallae.backend.domain.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PasswordResetConfirmRequest(
    @NotBlank String verificationToken,
    @NotBlank @Email String email,
    @NotBlank String newPassword
) {
}
