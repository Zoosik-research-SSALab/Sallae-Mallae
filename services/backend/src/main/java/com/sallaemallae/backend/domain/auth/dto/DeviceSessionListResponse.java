package com.sallaemallae.backend.domain.auth.dto;

import java.util.List;

public record DeviceSessionListResponse(
    List<DeviceSessionResponse> sessions,
    int maxDevices,
    int currentCount
) {

  public static DeviceSessionListResponse of(List<DeviceSessionResponse> sessions, int maxDevices) {
    return new DeviceSessionListResponse(sessions, maxDevices, sessions.size());
  }
}
