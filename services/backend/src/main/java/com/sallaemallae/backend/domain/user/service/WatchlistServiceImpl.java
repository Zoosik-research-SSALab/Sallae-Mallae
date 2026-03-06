package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.news.dto.WatchlistNewsItemResponse;
import com.sallaemallae.backend.domain.news.dto.WatchlistNewsResponse;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class WatchlistServiceImpl implements WatchlistService {

  private final WatchlistRepository watchlistRepository;

  @Override
  public WatchlistNewsResponse getWatchlistNews(Long userId, int limit) {
    List<Object[]> rows = watchlistRepository.findWatchlistNews(userId, limit);
    List<Long> newsIds = rows.stream().map(r -> toLong(r[0])).toList();
    Map<Long, List<String>> stockMap = buildStockNameMap(newsIds);

    List<WatchlistNewsItemResponse> news = rows.stream()
        .map(r -> new WatchlistNewsItemResponse(
            toLong(r[0]),
            (String) r[1],
            (String) r[2],
            (String) r[3],
            (String) r[4],
            toOffsetDateTime(r[5]),
            stockMap.getOrDefault(toLong(r[0]), List.of())))
        .toList();

    return new WatchlistNewsResponse(news);
  }

  private Map<Long, List<String>> buildStockNameMap(List<Long> newsIds) {
    Map<Long, List<String>> stockMap = new HashMap<>();
    if (newsIds.isEmpty()) {
      return stockMap;
    }
    watchlistRepository.findStockNamesByNewsIds(newsIds).forEach(r ->
        stockMap.computeIfAbsent(toLong(r[0]), k -> new ArrayList<>()).add((String) r[1]));
    return stockMap;
  }

  private Long toLong(Object obj) {
    if (obj instanceof Number n) return n.longValue();
    return null;
  }

  private OffsetDateTime toOffsetDateTime(Object obj) {
    if (obj instanceof OffsetDateTime odt) return odt;
    if (obj instanceof java.sql.Timestamp ts) return ts.toInstant().atOffset(ZoneOffset.UTC);
    return null;
  }
}
