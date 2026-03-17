package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.user.dto.response.WatchlistNewsResponse;
import java.util.Set;

public interface WatchlistService {

  WatchlistNewsResponse getWatchlistNews(Long userId, int limit);

  Set<Long> getWatchlistedStockIds(Long userId);
}
