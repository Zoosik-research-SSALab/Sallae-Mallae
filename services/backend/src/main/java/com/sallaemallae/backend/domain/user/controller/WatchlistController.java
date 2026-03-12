package com.sallaemallae.backend.domain.user.controller;

import com.sallaemallae.backend.domain.user.dto.WatchlistAddResponse;
import com.sallaemallae.backend.domain.user.dto.WatchlistAlertToggleRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistCreateRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistNewsResponse;
import com.sallaemallae.backend.domain.user.dto.WatchlistRemoveResponse;
import com.sallaemallae.backend.domain.user.service.UserService;
import com.sallaemallae.backend.domain.user.service.WatchlistService;
import com.sallaemallae.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
  public ApiResponse<List<Map<String, Object>>> getWatchlist() {
    return ApiResponse.success(userService.getWatchlist(getAuthenticatedUserId()));
  }

  @GetMapping("/{stockId}")
  public ApiResponse<Map<String, Object>> getWatchlistStatus(
      @PathVariable Long stockId) {
    return ApiResponse.success(userService.getWatchlistStatus(getAuthenticatedUserId(), stockId));
  }

  @PostMapping
  public ApiResponse<WatchlistAddResponse> addWatchlist(
      @Valid @RequestBody WatchlistCreateRequest request) {
    return ApiResponse.success(userService.addWatchlist(getAuthenticatedUserId(), request));
  }

  @DeleteMapping("/{stockId}")
  public ApiResponse<WatchlistRemoveResponse> removeWatchlist(
      @PathVariable Long stockId) {
    return ApiResponse.success(userService.removeWatchlist(getAuthenticatedUserId(), stockId));
  }

  @PatchMapping("/{stockId}")
  public ApiResponse<Map<String, Object>> toggleWatchlistAlert(
      @PathVariable Long stockId,
      @Valid @RequestBody WatchlistAlertToggleRequest request) {
    return ApiResponse.success(userService.toggleWatchlistAlert(getAuthenticatedUserId(), stockId, request));
  }

  // FS-WATCH-006: 관심종목 관련 최신 뉴스 조회
  @GetMapping("/news")
  public ApiResponse<WatchlistNewsResponse> getWatchlistNews(
      @RequestParam(defaultValue = "3") int limit) {
    return ApiResponse.success(watchlistService.getWatchlistNews(getAuthenticatedUserId(), limit));
  }

  private Long getAuthenticatedUserId() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    return (Long) authentication.getPrincipal();
  }
}
