package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.user.dto.WatchlistNewsItemResponse;
import com.sallaemallae.backend.domain.user.dto.WatchlistNewsResponse;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.LinkedHashSet;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class WatchlistServiceImpl implements WatchlistService {

  private final WatchlistRepository watchlistRepository;

  // 사용자 관심종목에 연결된 최신 뉴스 조회 (관련 종목명 포함)
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

  @Override
  public Set<Long> getWatchlistedStockIds(Long userId) {
    if (userId == null) {
      return Set.of();
    }

    return new LinkedHashSet<>(watchlistRepository.findStockIdsByUserId(userId));
  }

  // 뉴스 ID 목록으로 관련 종목명을 일괄 조회하여 Map으로 반환 (N+1 방지)
  private Map<Long, List<String>> buildStockNameMap(List<Long> newsIds) {
    Map<Long, List<String>> stockMap = new HashMap<>();
    if (newsIds.isEmpty()) {
      return stockMap;
    }
    watchlistRepository.findStockNamesByNewsIds(newsIds).forEach(r ->
        stockMap.computeIfAbsent(toLong(r[0]), k -> new ArrayList<>()).add((String) r[1]));
    return stockMap;
  }

  // native query 결과의 Object를 Long으로 안전 변환
  private Long toLong(Object obj) {
    if (obj instanceof Number n) return n.longValue();
    return null;
  }

  // native query 결과의 Object를 OffsetDateTime으로 안전 변환 (Timestamp 호환)
  private OffsetDateTime toOffsetDateTime(Object obj) {
    if (obj instanceof OffsetDateTime odt) return odt;
    if (obj instanceof java.sql.Timestamp ts) return ts.toInstant().atOffset(ZoneOffset.UTC);
    return null;
  }
}
