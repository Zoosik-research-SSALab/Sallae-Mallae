package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.auth.entity.PasswordHistory;
import com.sallaemallae.backend.domain.auth.entity.User;
import com.sallaemallae.backend.domain.auth.exception.AuthErrorCode;
import com.sallaemallae.backend.domain.auth.repository.PasswordHistoryRepository;
import com.sallaemallae.backend.domain.auth.repository.UserRepository;
import com.sallaemallae.backend.domain.user.dto.UserEmailOptInRequest;
import com.sallaemallae.backend.domain.user.dto.UserPasswordUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.UserProfileUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistAlertToggleRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistCreateRequest;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.global.exception.GlobalErrorCode;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

  private final UserRepository userRepository;
  private final PasswordHistoryRepository passwordHistoryRepository;

  @Override
  @Transactional(readOnly = true)
  public List<Map<String, Object>> getWatchlist(Long userId) {
    return List.of(Map.of("userId", userId, "message", "watchlist boilerplate"));
  }

  @Override
  @Transactional(readOnly = true)
  public Map<String, Object> getWatchlistStatus(Long userId, Long stockId) {
    return Map.of("userId", userId, "stockId", stockId, "scraped", false, "alarmOn", true);
  }

  @Override
  @Transactional
  public Map<String, Object> addWatchlist(Long userId, WatchlistCreateRequest request) {
    return Map.of("userId", userId, "stockId", request.stockId(), "message", "watchlist add boilerplate");
  }

  @Override
  @Transactional
  public Map<String, Object> removeWatchlist(Long userId, Long stockId) {
    return Map.of("userId", userId, "stockId", stockId, "message", "watchlist remove boilerplate");
  }

  @Override
  @Transactional
  public Map<String, Object> toggleWatchlistAlert(Long userId, Long stockId, WatchlistAlertToggleRequest request) {
    return Map.of("userId", userId, "stockId", stockId, "alarmOn", request.alarmOn());
  }

  @Override
  @Transactional(readOnly = true)
  public List<Map<String, Object>> getWatchlistNews(Long userId) {
    return List.of(Map.of("userId", userId, "message", "watchlist news boilerplate"));
  }

  @Override
  @Transactional
  public Map<String, Object> updateProfile(Long userId, UserProfileUpdateRequest request) {
    return Map.of("userId", userId, "nickname", request.nickname(), "profileImageUrl", request.profileImageUrl());
  }

  @Override
  @Transactional
  public Map<String, Object> updatePassword(Long userId, UserPasswordUpdateRequest request) {
    // 1. 사용자 조회
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new BusinessException(GlobalErrorCode.NOT_FOUND));

    // 2. 소셜 로그인 계정 체크
    if (user.getPasswordHash() == null) {
      throw new BusinessException(AuthErrorCode.PWD_SOCIAL_ACCOUNT);
    }

    // 3. 현재 비밀번호 확인
    if (!request.currentPassword().equals(user.getPasswordHash())) {
      throw new BusinessException(AuthErrorCode.PWD_WRONG_CURRENT);
    }

    // 4. 최근 3개 비밀번호 재사용 확인
    List<PasswordHistory> recentPasswords =
        passwordHistoryRepository.findRecentByUserId(userId, 3);
    for (PasswordHistory ph : recentPasswords) {
      if (request.newPassword().equals(ph.getPasswordHash())) {
        throw new BusinessException(AuthErrorCode.PWD_RECENT_REUSE);
      }
    }

    // 5. 비밀번호 변경
    user.changePassword(request.newPassword());

    // 6. 비밀번호 이력 저장
    passwordHistoryRepository.save(
        PasswordHistory.changedByUser(userId, request.newPassword(), null)
    );

    return Map.of("message", "비밀번호가 변경되었습니다.");
  }

  @Override
  @Transactional
  public Map<String, Object> updateEmailOptIn(Long userId, UserEmailOptInRequest request) {
    return Map.of("userId", userId, "emailOptIn", request.emailOptIn());
  }

  @Override
  @Transactional
  public Map<String, Object> deleteProfile(Long userId) {
    return Map.of("userId", userId, "message", "delete profile boilerplate");
  }
}
