package com.sallaemallae.backend.domain.auth.service;

import com.sallaemallae.backend.domain.auth.dto.response.DeviceSessionListResponse;

public interface DeviceSessionService {

  /**
   * 로그인 시 디바이스 세션을 등록하거나 갱신합니다.
   * 최대 기기 수를 초과하면 가장 오래된 세션을 제거합니다.
   */
  void registerOrUpdateSession(Long userId, String deviceId, String userAgent, String ipAddress);

  /**
   * 사용자의 전체 디바이스 세션 목록을 조회합니다.
   */
  DeviceSessionListResponse getSessions(Long userId, String currentDeviceId);

  /**
   * 특정 디바이스 세션을 제거합니다. (원격 로그아웃, RT도 함께 삭제)
   */
  void revokeSession(Long userId, String deviceId);

  /**
   * 사용자의 모든 디바이스 세션을 제거합니다. (RT도 함께 삭제)
   */
  void revokeAllSessions(Long userId);
}
