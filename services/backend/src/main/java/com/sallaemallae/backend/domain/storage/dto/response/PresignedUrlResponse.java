package com.sallaemallae.backend.domain.storage.dto.response;

public record PresignedUrlResponse(
    String uploadUrl,
    String fileUrl
) {
}
