package com.sallaemallae.backend.domain.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SendCodeRequest(
    @NotBlank @Email String email,
    @NotBlank @Pattern(regexp = "^(SIGNUP|PASSWORD_RESET)$", message = "purpose는 SIGNUP 또는 PASSWORD_RESET이어야 합니다.")
    String purpose
) {
}
