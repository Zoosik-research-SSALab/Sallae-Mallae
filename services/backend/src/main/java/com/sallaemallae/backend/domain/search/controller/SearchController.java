package com.sallaemallae.backend.domain.search.controller;

import com.sallaemallae.backend.domain.search.dto.SearchHistoryRequest;
import com.sallaemallae.backend.domain.search.dto.SearchSuggestionResponse;
import com.sallaemallae.backend.domain.search.service.SearchService;
import com.sallaemallae.backend.global.dto.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

  private final SearchService searchService;

  @GetMapping("/suggestions")
  public ApiResponse<List<SearchSuggestionResponse>> suggestions(@RequestParam String keyword) {
    return ApiResponse.ok(searchService.suggest(keyword));
  }

  @GetMapping("/trending")
  public ApiResponse<List<String>> trending() {
    return ApiResponse.ok(searchService.trending());
  }

  @PostMapping("/history")
  public ApiResponse<Map<String, String>> saveHistory(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @Valid @RequestBody SearchHistoryRequest request
  ) {
    searchService.saveHistory(userId, request);
    return ApiResponse.ok(Map.of("message", "search history boilerplate"));
  }
}
