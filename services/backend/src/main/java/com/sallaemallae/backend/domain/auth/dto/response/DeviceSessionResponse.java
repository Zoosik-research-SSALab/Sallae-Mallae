package com.sallaemallae.backend.domain.auth.dto.response;

import com.sallaemallae.backend.domain.auth.entity.DeviceSession;
import java.time.OffsetDateTime;

public record DeviceSessionResponse(
    String deviceId,
    String deviceName,
    String ipAddress,
    String trustLevel,
    OffsetDateTime lastLoginAt,
    OffsetDateTime createdAt,
    boolean isCurrent
) {

  public static DeviceSessionResponse from(DeviceSession session, String currentDeviceId) {
    return new DeviceSessionResponse(
        session.getDeviceId(),
        session.getDeviceName(),
        session.getIpAddress(),
        session.getTrustLevel().name(),
        session.getLastLoginAt(),
        session.getCreatedAt(),
        session.getDeviceId().equals(currentDeviceId)
    );
  }
}
