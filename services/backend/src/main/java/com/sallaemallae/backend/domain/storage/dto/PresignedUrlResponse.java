package com.sallaemallae.backend.domain.storage.dto;

public record PresignedUrlResponse(
    String uploadUrl,
    String fileUrl
) {
}
