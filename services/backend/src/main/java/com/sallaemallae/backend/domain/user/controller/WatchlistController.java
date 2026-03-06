package com.sallaemallae.backend.domain.user.controller;

import com.sallaemallae.backend.domain.user.dto.WatchlistNewsResponse;
import com.sallaemallae.backend.domain.user.service.WatchlistService;
import com.sallaemallae.backend.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

  private final WatchlistService watchlistService;

  // FS-WATCH-006: 관심종목 관련 최신 뉴스 조회 (User Lv.1)
  // TODO: JWT 인증 구현 후 @RequestHeader("X-User-Id") -> @AuthenticationPrincipal로 교체
  @GetMapping("/news")
  public ApiResponse<WatchlistNewsResponse> getWatchlistNews(
      @RequestHeader("X-User-Id") Long userId,
      @RequestParam(defaultValue = "3") int limit) {
    return ApiResponse.success(watchlistService.getWatchlistNews(userId, limit));
  }
}
