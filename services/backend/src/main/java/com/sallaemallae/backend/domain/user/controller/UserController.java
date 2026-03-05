package com.sallaemallae.backend.domain.user.controller;

import com.sallaemallae.backend.domain.user.dto.UserEmailOptInRequest;
import com.sallaemallae.backend.domain.user.dto.UserPasswordUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.UserProfileUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistAlertToggleRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistCreateRequest;
import com.sallaemallae.backend.domain.user.service.UserService;
import com.sallaemallae.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  @GetMapping("/watchlist")
  public ApiResponse<List<Map<String, Object>>> getWatchlist(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId
  ) {
    return ApiResponse.success(userService.getWatchlist(userId));
  }

  @GetMapping("/watchlist/{stockId}")
  public ApiResponse<Map<String, Object>> getWatchlistStatus(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @PathVariable Long stockId
  ) {
    return ApiResponse.success(userService.getWatchlistStatus(userId, stockId));
  }

  @PostMapping("/watchlist")
  public ApiResponse<Map<String, Object>> addWatchlist(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @Valid @RequestBody WatchlistCreateRequest request
  ) {
    return ApiResponse.success(userService.addWatchlist(userId, request));
  }

  @DeleteMapping("/watchlist/{stockId}")
  public ApiResponse<Map<String, Object>> removeWatchlist(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @PathVariable Long stockId
  ) {
    return ApiResponse.success(userService.removeWatchlist(userId, stockId));
  }

  @PatchMapping("/watchlist/{stockId}")
  public ApiResponse<Map<String, Object>> toggleWatchlistAlert(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @PathVariable Long stockId,
      @Valid @RequestBody WatchlistAlertToggleRequest request
  ) {
    return ApiResponse.success(userService.toggleWatchlistAlert(userId, stockId, request));
  }

  @GetMapping("/watchlist/news")
  public ApiResponse<List<Map<String, Object>>> watchlistNews(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId
  ) {
    return ApiResponse.success(userService.getWatchlistNews(userId));
  }

  @PatchMapping("/profile")
  public ApiResponse<Map<String, Object>> updateProfile(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @Valid @RequestBody UserProfileUpdateRequest request
  ) {
    return ApiResponse.success(userService.updateProfile(userId, request));
  }

  @PutMapping("/profile/password")
  public ApiResponse<Map<String, Object>> updatePassword(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @Valid @RequestBody UserPasswordUpdateRequest request
  ) {
    return ApiResponse.success(userService.updatePassword(userId, request));
  }

  @PatchMapping("/profile/email-opt-in")
  public ApiResponse<Map<String, Object>> updateEmailOptIn(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @Valid @RequestBody UserEmailOptInRequest request
  ) {
    return ApiResponse.success(userService.updateEmailOptIn(userId, request));
  }

  @DeleteMapping("/profile")
  public ApiResponse<Map<String, Object>> deleteProfile(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId
  ) {
    return ApiResponse.success(userService.deleteProfile(userId));
  }
}
