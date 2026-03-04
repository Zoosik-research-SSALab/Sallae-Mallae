package com.sallaemallae.backend.domain.news.controller;

import com.sallaemallae.backend.domain.news.dto.NewsItemResponse;
import com.sallaemallae.backend.domain.news.service.NewsService;
import com.sallaemallae.backend.global.dto.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class NewsController {

  private final NewsService newsService;

  @GetMapping
  public ApiResponse<List<NewsItemResponse>> getNews() {
    return ApiResponse.ok(newsService.getLatestNews());
  }
}
