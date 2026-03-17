package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.user.dto.request.UserEmailOptInRequest;
import com.sallaemallae.backend.domain.user.dto.request.UserPasswordUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.request.UserProfileUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistAddResponse;
import com.sallaemallae.backend.domain.user.dto.request.WatchlistAlertToggleRequest;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistAlertToggleResponse;
import com.sallaemallae.backend.domain.user.dto.request.WatchlistCreateRequest;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistListResponse;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistRemoveResponse;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistStatusResponse;
import java.util.List;
import java.util.Map;

public interface UserService {

  WatchlistListResponse getWatchlist(Long userId);

  WatchlistStatusResponse getWatchlistStatus(Long userId, Long stockId);

  WatchlistAddResponse addWatchlist(Long userId, WatchlistCreateRequest request);

  WatchlistRemoveResponse removeWatchlist(Long userId, Long stockId);

  WatchlistAlertToggleResponse toggleWatchlistAlert(Long userId, Long stockId, WatchlistAlertToggleRequest request);

  List<Map<String, Object>> getWatchlistNews(Long userId);

  Map<String, Object> updateProfile(Long userId, UserProfileUpdateRequest request);

  Map<String, Object> updatePassword(Long userId, UserPasswordUpdateRequest request);

  Map<String, Object> updateEmailOptIn(Long userId, UserEmailOptInRequest request);

  Map<String, Object> deleteProfile(Long userId);
}
