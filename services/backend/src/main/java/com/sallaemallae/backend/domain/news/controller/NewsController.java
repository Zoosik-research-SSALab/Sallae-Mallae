package com.sallaemallae.backend.domain.news.controller;

import com.sallaemallae.backend.domain.news.dto.NewsDetailResponse;
import com.sallaemallae.backend.domain.news.dto.NewsListResponse;
import com.sallaemallae.backend.domain.news.dto.TrendingKeywordsResponse;
import com.sallaemallae.backend.domain.news.service.NewsService;
import com.sallaemallae.backend.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "뉴스", description = "주식 뉴스 API")
@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
public class NewsController {

  private final NewsService newsService;

  /** FS-NEWS-001: 주식 뉴스 리스트 조회 */
  @Operation(summary = "뉴스 목록 조회", description = "키워드 필터 및 페이징을 적용하여 주식 뉴스 목록을 조회합니다.")
  @GetMapping
  public ApiResponse<NewsListResponse> getNewsList(
      @Parameter(description = "검색 키워드", example = "반도체")
      @RequestParam(required = false) String keyword,
      @Parameter(description = "시작일 (전체 기간이면 생략)", example = "2026-03-01")
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @Parameter(description = "종료일 (기본값: 오늘)", example = "2026-03-23")
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
      @Parameter(description = "페이지 오프셋", example = "0")
      @RequestParam(defaultValue = "0") int offset,
      @Parameter(description = "페이지 크기", example = "6")
      @RequestParam(defaultValue = "6") int limit) {
    LocalDate resolvedEndDate = (endDate != null) ? endDate : LocalDate.now();
    return ApiResponse.success(newsService.getNewsList(keyword, startDate, resolvedEndDate, offset, limit));
  }

  /** FS-NEWS-002: 많이 찾는 뉴스 키워드 순위 */
  @Operation(summary = "트렌딩 키워드 조회", description = "당일 많이 검색된 뉴스 키워드 상위 5개를 반환합니다.")
  @GetMapping("/trending")
  public ApiResponse<TrendingKeywordsResponse> getTrendingKeywords() {
    return ApiResponse.success(newsService.getTrendingKeywords());
  }

  /** FS-STOCK-008: 뉴스 모달 데이터 조회 */
  @Operation(summary = "뉴스 상세 조회", description = "뉴스 ID로 상세 정보와 관련 종목을 조회합니다.")
  @GetMapping("/{newsId}")
  public ApiResponse<NewsDetailResponse> getNewsDetail(
      @Parameter(description = "뉴스 ID", example = "1")
      @PathVariable Long newsId) {
    return ApiResponse.success(newsService.getNewsDetail(newsId));
  }
}
