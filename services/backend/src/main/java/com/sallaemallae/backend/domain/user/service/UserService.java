package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.user.dto.UserEmailOptInRequest;
import com.sallaemallae.backend.domain.user.dto.UserPasswordUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.UserProfileUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistAddResponse;
import com.sallaemallae.backend.domain.user.dto.WatchlistAlertToggleRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistCreateRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistRemoveResponse;
import java.util.List;
import java.util.Map;

public interface UserService {

  List<Map<String, Object>> getWatchlist(Long userId);

  Map<String, Object> getWatchlistStatus(Long userId, Long stockId);

  WatchlistAddResponse addWatchlist(Long userId, WatchlistCreateRequest request);

  WatchlistRemoveResponse removeWatchlist(Long userId, Long stockId);

  Map<String, Object> toggleWatchlistAlert(Long userId, Long stockId, WatchlistAlertToggleRequest request);

  List<Map<String, Object>> getWatchlistNews(Long userId);

  Map<String, Object> updateProfile(Long userId, UserProfileUpdateRequest request);

  Map<String, Object> updatePassword(Long userId, UserPasswordUpdateRequest request);

  Map<String, Object> updateEmailOptIn(Long userId, UserEmailOptInRequest request);

  Map<String, Object> deleteProfile(Long userId);
}
