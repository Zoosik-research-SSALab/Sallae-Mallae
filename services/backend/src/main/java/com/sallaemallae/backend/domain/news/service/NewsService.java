package com.sallaemallae.backend.domain.news.service;

import com.sallaemallae.backend.domain.news.dto.NewsDetailResponse;
import com.sallaemallae.backend.domain.news.dto.NewsListResponse;
import com.sallaemallae.backend.domain.news.dto.TrendingKeywordsResponse;

public interface NewsService {

  NewsListResponse getNewsList(String keyword, int offset, int limit);

  NewsDetailResponse getNewsDetail(Long newsId);

  TrendingKeywordsResponse getTrendingKeywords();
}
