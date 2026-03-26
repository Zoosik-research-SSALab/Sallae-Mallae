package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.user.dto.response.WatchlistNewsResponse;
import java.time.LocalDate;
import java.util.Set;

public interface WatchlistService {

  WatchlistNewsResponse getWatchlistNews(Long userId, String keyword, LocalDate startDate, LocalDate endDate, int offset, int limit);

  Set<Long> getWatchlistedStockIds(Long userId);
}
