package com.sallaemallae.backend.domain.user.controller;

import com.sallaemallae.backend.domain.user.dto.response.WatchlistAddResponse;
import com.sallaemallae.backend.domain.user.dto.request.WatchlistAlertToggleRequest;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistAlertToggleResponse;
import com.sallaemallae.backend.domain.user.dto.request.WatchlistCreateRequest;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistListResponse;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistNewsResponse;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistRemoveResponse;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistStatusResponse;
import com.sallaemallae.backend.domain.user.service.UserService;
import com.sallaemallae.backend.domain.user.service.WatchlistService;
import com.sallaemallae.backend.global.response.ApiResponse;
import com.sallaemallae.backend.global.security.AuthenticatedUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import java.io.IOException;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(name = "Watchlist", description = "관심종목 API")
@RestController
@RequestMapping("/api/users/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

  private final WatchlistService watchlistService;
  private final UserService userService;
  private final AuthenticatedUserProvider authenticatedUserProvider;
  private final ObjectMapper objectMapper;

  @Operation(summary = "관심종목 목록 조회 (SSE)", description = "로그인한 사용자의 관심종목 목록을 SSE로 조회합니다.")
  @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter getWatchlist() {
    SseEmitter emitter = new SseEmitter(Duration.ofMinutes(30).toMillis());
    try {
      WatchlistListResponse data = userService.getWatchlist(getAuthenticatedUserId());
      emitter.send(SseEmitter.event()
          .name("watchlist")
          .data(objectMapper.writeValueAsString(ApiResponse.success(data)),
              MediaType.APPLICATION_JSON));
      emitter.complete();
    } catch (IOException e) {
      emitter.completeWithError(e);
    }
    return emitter;
  }

  @Operation(summary = "관심종목 등록 여부 조회", description = "특정 종목이 관심종목에 등록되어 있는지 확인합니다.")
  @GetMapping("/{stockId}")
  public ApiResponse<WatchlistStatusResponse> getWatchlistStatus(
      @Parameter(description = "종목 ID") @PathVariable Long stockId) {
    return ApiResponse.success(userService.getWatchlistStatus(getAuthenticatedUserId(), stockId));
  }

  @Operation(summary = "관심종목 추가", description = "종목을 관심종목에 추가합니다.")
  @PostMapping
  public ApiResponse<WatchlistAddResponse> addWatchlist(
      @Valid @RequestBody WatchlistCreateRequest request) {
    return ApiResponse.success(userService.addWatchlist(getAuthenticatedUserId(), request));
  }

  @Operation(summary = "관심종목 삭제", description = "종목을 관심종목에서 삭제합니다.")
  @DeleteMapping("/{stockId}")
  public ApiResponse<WatchlistRemoveResponse> removeWatchlist(
      @Parameter(description = "종목 ID") @PathVariable Long stockId) {
    return ApiResponse.success(userService.removeWatchlist(getAuthenticatedUserId(), stockId));
  }

  @Operation(summary = "관심종목 알림 토글", description = "관심종목의 알림 수신 여부를 변경합니다.")
  @PatchMapping("/{stockId}")
  public ApiResponse<WatchlistAlertToggleResponse> toggleWatchlistAlert(
      @Parameter(description = "종목 ID") @PathVariable Long stockId,
      @Valid @RequestBody WatchlistAlertToggleRequest request) {
    return ApiResponse.success(userService.toggleWatchlistAlert(getAuthenticatedUserId(), stockId, request));
  }

  @Operation(summary = "관심종목 뉴스 조회", description = "관심종목에 등록된 종목들의 최신 뉴스를 조회합니다.")
  @GetMapping("/news")
  public ApiResponse<WatchlistNewsResponse> getWatchlistNews(
      @Parameter(description = "종목당 뉴스 개수 (기본값: 3)") @RequestParam(defaultValue = "3") int limit) {
    return ApiResponse.success(watchlistService.getWatchlistNews(getAuthenticatedUserId(), limit));
  }

  private Long getAuthenticatedUserId() {
    return authenticatedUserProvider.getCurrentUserId();
  }
}
