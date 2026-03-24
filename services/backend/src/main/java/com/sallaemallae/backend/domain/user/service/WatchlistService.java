package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.news.dto.NewsListResponse;
import java.time.LocalDate;
import java.util.Set;

public interface WatchlistService {

  NewsListResponse getWatchlistNews(Long userId, String keyword, LocalDate startDate, LocalDate endDate, int offset, int limit);

  Set<Long> getWatchlistedStockIds(Long userId);
}
