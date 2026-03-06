package com.sallaemallae.backend.domain.search.controller;

import com.sallaemallae.backend.domain.search.dto.SearchHistoryRequest;
import com.sallaemallae.backend.domain.search.dto.SearchRecentResponse;
import com.sallaemallae.backend.domain.search.dto.SearchResponse;
import com.sallaemallae.backend.domain.search.exception.SearchErrorCode;
import com.sallaemallae.backend.domain.search.service.SearchService;
import com.sallaemallae.backend.global.response.ApiResponse;
import com.sallaemallae.backend.global.exception.BusinessException;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

  private final SearchService searchService;

  @GetMapping
  public ApiResponse<SearchResponse> search(@RequestParam("q") String keyword) {
    return ApiResponse.success(searchService.search(keyword));
  }

  @GetMapping("/recent")
  public ApiResponse<SearchRecentResponse> getRecentSearches(
      @RequestHeader(name = "X-User-Id", required = false) Long userId
  ) {
    return ApiResponse.success(searchService.getRecent(resolveUserId(userId)));
  }

  @PostMapping("/recent")
  public ApiResponse<Map<String, String>> saveRecentSearch(
      @RequestHeader(name = "X-User-Id", required = false) Long userId,
      @Valid @RequestBody SearchHistoryRequest request
  ) {
    searchService.saveRecent(resolveUserId(userId), request);
    return ApiResponse.success(Map.of("message", "저장 완료"));
  }

  @DeleteMapping("/recent/{keyword}")
  public ApiResponse<Map<String, String>> deleteRecentSearch(
      @RequestHeader(name = "X-User-Id", required = false) Long userId,
      @PathVariable String keyword
  ) {
    searchService.deleteRecent(resolveUserId(userId), keyword);
    return ApiResponse.success(Map.of("message", "삭제 완료"));
  }

  @DeleteMapping("/recent")
  public ApiResponse<Map<String, String>> clearRecentSearches(
      @RequestHeader(name = "X-User-Id", required = false) Long userId
  ) {
    searchService.clearRecent(resolveUserId(userId));
    return ApiResponse.success(Map.of("message", "전체 삭제 완료"));
  }

  private Long resolveUserId(Long userId) {
    if (userId == null || userId <= 0) {
      throw new BusinessException(SearchErrorCode.SEARCH_AUTH_REQUIRED);
    }
    return userId;
  }
}
