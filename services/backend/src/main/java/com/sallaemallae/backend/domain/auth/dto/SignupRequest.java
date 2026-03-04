package com.sallaemallae.backend.domain.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
    @Email String email,
    @NotBlank @Size(max = 20) String nickname,
    @NotBlank @Size(min = 8) String password,
    boolean emailOptIn
) {
}
