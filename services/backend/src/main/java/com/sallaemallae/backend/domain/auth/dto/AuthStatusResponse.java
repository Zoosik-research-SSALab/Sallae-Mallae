package com.sallaemallae.backend.domain.auth.dto;

public record AuthStatusResponse(boolean authenticated, Long userId, String role) {
}
