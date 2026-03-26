package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.news.entity.StockNews;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistNewsItemResponse;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistNewsResponse;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import com.sallaemallae.backend.global.util.OffsetBasedPageRequest;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class WatchlistServiceImpl implements WatchlistService {

  private final WatchlistRepository watchlistRepository;

  private static final ZoneId KST = ZoneId.of("Asia/Seoul");

  // 관심종목 뉴스 목록 조회 (키워드 필터, 기간 필터, 페이지네이션, 관련 종목명 포함)
  @Override
  public WatchlistNewsResponse getWatchlistNews(Long userId, String keyword, LocalDate startDate, LocalDate endDate, int offset, int limit) {
    OffsetBasedPageRequest pageable = new OffsetBasedPageRequest(offset, limit);
    boolean hasKeyword = keyword != null && !keyword.isBlank();

    OffsetDateTime startDateTime = (startDate != null)
        ? startDate.atStartOfDay(KST).toOffsetDateTime()
        : null;
    OffsetDateTime endDateTime = endDate.atTime(LocalTime.MAX).atZone(KST).toOffsetDateTime();

    List<StockNews> rows;
    long totalCount;
    if (hasKeyword) {
      rows = watchlistRepository.findWatchlistNewsByKeyword(userId, keyword, startDateTime, endDateTime, pageable);
      totalCount = watchlistRepository.countWatchlistNewsByKeyword(userId, keyword, startDateTime, endDateTime);
    } else {
      rows = watchlistRepository.findWatchlistNews(userId, startDateTime, endDateTime, pageable);
      totalCount = watchlistRepository.countWatchlistNews(userId, startDateTime, endDateTime);
    }

    List<Long> newsIds = rows.stream().map(StockNews::getId).toList();
    Map<Long, List<String>> stockMap = buildStockNameMap(newsIds);

    List<WatchlistNewsItemResponse> news = rows.stream()
        .map(sn -> new WatchlistNewsItemResponse(
            sn.getId(),
            sn.getTitle(),
            sn.getSnippet(),
            sn.getUrl(),
            sn.getPublisher(),
            sn.getPublishedAt(),
            stockMap.getOrDefault(sn.getId(), List.of())))
        .toList();

    return new WatchlistNewsResponse(totalCount, news);
  }

  @Override
  public Set<Long> getWatchlistedStockIds(Long userId) {
    if (userId == null) {
      return Set.of();
    }

    return new HashSet<>(watchlistRepository.findStockIdsByUserId(userId));
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

  // Object를 Long으로 안전 변환
  private Long toLong(Object obj) {
    if (obj instanceof Number n) return n.longValue();
    return null;
  }
}
