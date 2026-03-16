package com.sallaemallae.backend.domain.auth.service;

import com.sallaemallae.backend.domain.auth.dto.DeviceSessionListResponse;
import com.sallaemallae.backend.domain.auth.dto.DeviceSessionResponse;
import com.sallaemallae.backend.domain.auth.entity.DeviceSession;
import com.sallaemallae.backend.domain.auth.exception.AuthErrorCode;
import com.sallaemallae.backend.domain.auth.repository.DeviceSessionRepository;
import com.sallaemallae.backend.domain.auth.support.DeviceNameParser;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.global.security.jwt.RedisTokenService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceSessionServiceImpl implements DeviceSessionService {

  private static final int MAX_DEVICE_COUNT = 5;

  private final DeviceSessionRepository deviceSessionRepository;
  private final RedisTokenService redisTokenService;

  @Override
  @Transactional
  public void registerOrUpdateSession(Long userId, String deviceId,
      String userAgent, String ipAddress) {

    String deviceName = DeviceNameParser.parse(userAgent);

    deviceSessionRepository.findByUserIdAndDeviceId(userId, deviceId)
        .ifPresentOrElse(
            session -> session.updateOnLogin(deviceName, userAgent, ipAddress),
            () -> {
              enforceDeviceLimit(userId);
              DeviceSession newSession = DeviceSession.builder()
                  .userId(userId)
                  .deviceId(deviceId)
                  .deviceName(deviceName)
                  .deviceInfo(userAgent)
                  .ipAddress(ipAddress)
                  .build();
              deviceSessionRepository.save(newSession);
            }
        );

    log.debug("디바이스 세션 등록/갱신 완료 - userId: {}, deviceId: {}", userId, deviceId);
  }

  @Override
  @Transactional(readOnly = true)
  public DeviceSessionListResponse getSessions(Long userId, String currentDeviceId) {
    List<DeviceSessionResponse> sessions = deviceSessionRepository
        .findByUserIdOrderByLastLoginAtDesc(userId).stream()
        .map(session -> DeviceSessionResponse.from(session, currentDeviceId))
        .toList();
    return DeviceSessionListResponse.of(sessions, MAX_DEVICE_COUNT);
  }

  @Override
  @Transactional
  public void revokeSession(Long userId, String deviceId) {
    deviceSessionRepository.findByUserIdAndDeviceId(userId, deviceId)
        .orElseThrow(() -> new BusinessException(AuthErrorCode.SESSION_NOT_FOUND));
    deviceSessionRepository.deleteByUserIdAndDeviceId(userId, deviceId);
    redisTokenService.deleteRefreshToken(userId, deviceId);
    log.info("디바이스 세션 제거 완료 - userId: {}, deviceId: {}", userId, deviceId);
  }

  @Override
  @Transactional
  public void revokeAllSessions(Long userId) {
    deviceSessionRepository.deleteAllByUserId(userId);
    redisTokenService.deleteAllRefreshTokens(userId);
    log.info("전체 디바이스 세션 제거 완료 - userId: {}", userId);
  }

  /**
   * 최대 기기 수를 초과하면 우선순위가 낮은 세션부터 제거합니다.
   * 우선순위: trust_level 낮은 순 → last_login_at 오래된 순 (FIFO)
   */
  private void enforceDeviceLimit(Long userId) {
    int currentCount = deviceSessionRepository.countByUserId(userId);
    if (currentCount < MAX_DEVICE_COUNT) {
      return;
    }

    List<DeviceSession> sessions = deviceSessionRepository
        .findByUserIdOrderByEvictionPriority(userId);

    int removeCount = currentCount - MAX_DEVICE_COUNT + 1;
    for (int i = 0; i < removeCount && i < sessions.size(); i++) {
      DeviceSession target = sessions.get(i);
      deviceSessionRepository.delete(target);
      redisTokenService.deleteRefreshToken(userId, target.getDeviceId());
      log.info("기기 수 제한으로 세션 제거 - userId: {}, deviceId: {}, trustLevel: {}",
          userId, target.getDeviceId(), target.getTrustLevel());
    }
  }
}
