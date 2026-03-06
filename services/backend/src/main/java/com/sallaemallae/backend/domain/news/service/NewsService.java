package com.sallaemallae.backend.domain.news.service;

import com.sallaemallae.backend.domain.news.dto.NewsDetailResponse;
import com.sallaemallae.backend.domain.news.dto.NewsListResponse;
import com.sallaemallae.backend.domain.news.dto.TrendingKeywordsResponse;
import com.sallaemallae.backend.domain.news.dto.WatchlistNewsResponse;

public interface NewsService {

  NewsListResponse getNewsList(String keyword, int offset, int limit);

  NewsDetailResponse getNewsDetail(Long newsId);

  TrendingKeywordsResponse getTrendingKeywords();

  WatchlistNewsResponse getWatchlistNews(Long userId, int limit);
}
