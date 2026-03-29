package com.sallaemallae.backend.domain.storage.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PresignedUrlRequest(
    @NotBlank String fileName,
    @NotBlank String contentType,
    @NotNull Long fileSize
) {
}
