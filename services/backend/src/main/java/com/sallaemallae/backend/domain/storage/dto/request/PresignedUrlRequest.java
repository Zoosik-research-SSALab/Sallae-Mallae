package com.sallaemallae.backend.domain.storage.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PresignedUrlRequest(
    @JsonProperty("fileName") @NotBlank String fileName,
    @JsonProperty("contentType") @NotBlank String contentType,
    @JsonProperty("fileSize") @NotNull Long fileSize
) {
}
