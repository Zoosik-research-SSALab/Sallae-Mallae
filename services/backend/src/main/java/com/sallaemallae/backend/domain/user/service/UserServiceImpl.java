package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.user.dto.UserEmailOptInRequest;
import com.sallaemallae.backend.domain.user.dto.UserPasswordUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.UserProfileUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistAlertToggleRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistCreateRequest;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserServiceImpl implements UserService {

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
    return Map.of("userId", userId, "message", "password update boilerplate");
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
