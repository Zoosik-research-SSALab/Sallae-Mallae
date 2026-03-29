package com.sallaemallae.backend.domain.auth.dto.request;

import com.sallaemallae.backend.domain.auth.dto.TermAgreementDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SignupRequest(
    @NotBlank String verificationToken,
    @NotBlank @Email String email,
    @NotBlank String password,
    @NotBlank @Size(min = 2, max = 20) String nickname,
    boolean emailOptIn,
    @NotNull @Valid List<TermAgreementDto> agreements
) {
}
