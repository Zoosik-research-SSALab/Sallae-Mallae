package com.sallaemallae.backend.domain.user.controller;

import com.sallaemallae.backend.domain.user.dto.WatchlistAlertToggleRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistCreateRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistNewsResponse;
import com.sallaemallae.backend.domain.user.service.UserService;
import com.sallaemallae.backend.domain.user.service.WatchlistService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

  private final WatchlistService watchlistService;
  private final UserService userService;

  @GetMapping
  public ApiResponse<List<Map<String, Object>>> getWatchlist(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId) {
    return ApiResponse.success(userService.getWatchlist(userId));
  }

  @GetMapping("/{stockId}")
  public ApiResponse<Map<String, Object>> getWatchlistStatus(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @PathVariable Long stockId) {
    return ApiResponse.success(userService.getWatchlistStatus(userId, stockId));
  }

  @PostMapping
  public ApiResponse<Map<String, Object>> addWatchlist(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @Valid @RequestBody WatchlistCreateRequest request) {
    return ApiResponse.success(userService.addWatchlist(userId, request));
  }

  @DeleteMapping("/{stockId}")
  public ApiResponse<Map<String, Object>> removeWatchlist(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @PathVariable Long stockId) {
    return ApiResponse.success(userService.removeWatchlist(userId, stockId));
  }

  @PatchMapping("/{stockId}")
  public ApiResponse<Map<String, Object>> toggleWatchlistAlert(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @PathVariable Long stockId,
      @Valid @RequestBody WatchlistAlertToggleRequest request) {
    return ApiResponse.success(userService.toggleWatchlistAlert(userId, stockId, request));
  }

  // FS-WATCH-006: 관심종목 관련 최신 뉴스 조회
  @GetMapping("/news")
  public ApiResponse<WatchlistNewsResponse> getWatchlistNews(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @RequestParam(defaultValue = "3") int limit) {
    return ApiResponse.success(watchlistService.getWatchlistNews(userId, limit));
  }
}
