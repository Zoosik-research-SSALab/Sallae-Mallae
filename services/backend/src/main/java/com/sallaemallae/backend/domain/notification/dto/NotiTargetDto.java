package com.sallaemallae.backend.domain.notification.dto;

public record NotiTargetDto(Long userId, String email, boolean emailOptIn) {

}
