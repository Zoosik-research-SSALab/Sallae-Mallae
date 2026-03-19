package com.sallaemallae.backend.domain.storage.dto;

import jakarta.validation.constraints.NotBlank;

public record PresignedUrlRequest(
    @NotBlank String fileName,
    @NotBlank String contentType
) {
}
