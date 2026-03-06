package com.sallaemallae.backend.domain.news.controller;

import com.sallaemallae.backend.domain.news.dto.NewsDetailResponse;
import com.sallaemallae.backend.domain.news.dto.NewsListResponse;
import com.sallaemallae.backend.domain.news.dto.TrendingKeywordsResponse;
import com.sallaemallae.backend.domain.news.service.NewsService;
import com.sallaemallae.backend.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
public class NewsController {

  private final NewsService newsService;

  // FS-NEWS-001: 주식 뉴스 리스트 조회
  @GetMapping
  public ApiResponse<NewsListResponse> getNewsList(
      @RequestParam(required = false) String keyword,
      @RequestParam(defaultValue = "0") int offset,
      @RequestParam(defaultValue = "6") int limit) {
    return ApiResponse.success(newsService.getNewsList(keyword, offset, limit));
  }

  // FS-NEWS-002: 많이 찾는 뉴스 키워드 순위 (/{newsId} 보다 먼저 선언해야 라우팅 충돌 없음)
  @GetMapping("/trending")
  public ApiResponse<TrendingKeywordsResponse> getTrendingKeywords() {
    return ApiResponse.success(newsService.getTrendingKeywords());
  }

  // FS-STOCK-008: 뉴스 모달 데이터 조회
  @GetMapping("/{newsId}")
  public ApiResponse<NewsDetailResponse> getNewsDetail(@PathVariable Long newsId) {
    return ApiResponse.success(newsService.getNewsDetail(newsId));
  }
}
