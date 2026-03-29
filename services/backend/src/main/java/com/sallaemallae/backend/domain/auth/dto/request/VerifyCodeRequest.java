package com.sallaemallae.backend.domain.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyCodeRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 6, max = 6) String code,
    @NotBlank @Pattern(regexp = "^(SIGNUP|PASSWORD_RESET)$", message = "purpose는 SIGNUP 또는 PASSWORD_RESET이어야 합니다.")
    String purpose
) {
}
