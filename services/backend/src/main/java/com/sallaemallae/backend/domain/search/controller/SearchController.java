package com.sallaemallae.backend.domain.search.controller;

import com.sallaemallae.backend.domain.search.dto.request.SearchHistoryRequest;
import com.sallaemallae.backend.domain.search.dto.response.SearchRecentResponse;
import com.sallaemallae.backend.domain.search.dto.response.SearchResponse;
import com.sallaemallae.backend.global.response.ApiResponse;
import com.sallaemallae.backend.global.security.AuthenticatedUserProvider;
import com.sallaemallae.backend.domain.search.service.SearchService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

  private final SearchService searchService;
  private final AuthenticatedUserProvider authenticatedUserProvider;

  @GetMapping
  public ApiResponse<SearchResponse> search(@RequestParam("q") String keyword) {
    return ApiResponse.success(searchService.search(keyword));
  }

  @GetMapping("/recent")
  public ApiResponse<SearchRecentResponse> getRecentSearches() {
    return ApiResponse.success(searchService.getRecent(authenticatedUserProvider.getCurrentUserId()));
  }

  @PostMapping("/recent")
  public ApiResponse<Map<String, String>> saveRecentSearch(
      @Valid @RequestBody SearchHistoryRequest request
  ) {
    searchService.saveRecent(authenticatedUserProvider.getCurrentUserId(), request);
    return ApiResponse.success(Map.of("message", "저장 완료"));
  }

  @DeleteMapping("/recent/{keyword}")
  public ApiResponse<Map<String, String>> deleteRecentSearch(@PathVariable String keyword) {
    searchService.deleteRecent(authenticatedUserProvider.getCurrentUserId(), keyword);
    return ApiResponse.success(Map.of("message", "삭제 완료"));
  }

  @DeleteMapping("/recent")
  public ApiResponse<Map<String, String>> clearRecentSearches() {
    searchService.clearRecent(authenticatedUserProvider.getCurrentUserId());
    return ApiResponse.success(Map.of("message", "전체 삭제 완료"));
  }
}
