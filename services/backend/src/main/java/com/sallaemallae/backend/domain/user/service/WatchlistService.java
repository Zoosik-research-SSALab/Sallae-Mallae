package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.user.dto.WatchlistNewsResponse;

public interface WatchlistService {

  WatchlistNewsResponse getWatchlistNews(Long userId, int limit);
}
