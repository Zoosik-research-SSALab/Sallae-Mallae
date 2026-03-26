package com.sallaemallae.backend.domain.search.service;

import com.sallaemallae.backend.domain.search.dto.request.SearchHistoryRequest;
import com.sallaemallae.backend.domain.search.dto.response.SearchRecentResponse;
import com.sallaemallae.backend.domain.search.dto.response.SearchResponse;
import com.sallaemallae.backend.domain.search.dto.response.SearchStockItemResponse;
import com.sallaemallae.backend.domain.search.repository.SearchCacheRepository;
import com.sallaemallae.backend.domain.search.repository.SearchQueryRepository;
import com.sallaemallae.backend.domain.stock.service.TrendingStockService;
import com.sallaemallae.backend.domain.storage.service.StockIconUrlResolver;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {

  private static final int RECENT_LIMIT = 10;

  private final SearchQueryRepository searchQueryRepository;
  private final SearchCacheRepository searchCacheRepository;
  private final StockIconUrlResolver stockIconUrlResolver;
  private final TrendingStockService trendingStockService;

  @Override
  @Transactional(readOnly = true)
  public SearchResponse search(String keyword) {
    String normalizedKeyword = normalizeKeyword(keyword);
    if (normalizedKeyword.isEmpty()) {
      return new SearchResponse(List.of(), List.of());
    }
    // 검색 결과의 종목 아이콘 URL을 전체 URL로 변환
    List<SearchStockItemResponse> stocks = searchQueryRepository.searchStocks(normalizedKeyword).stream()
        .map(item -> new SearchStockItemResponse(
            item.id(),
            item.ticker(),
            item.name(),
            item.gicsSector(),
            item.currentPrice(),
            item.fluctuationRate(),
            stockIconUrlResolver.resolve(item.iconUrl())
        ))
        .toList();
    return new SearchResponse(
        stocks,
        searchQueryRepository.searchNews(normalizedKeyword)
    );
  }

  @Override
  @Transactional(readOnly = true)
  public SearchRecentResponse getRecent(Long userId) {
    return new SearchRecentResponse(searchCacheRepository.getRecent(userId, RECENT_LIMIT));
  }

  @Override
  public void saveRecent(Long userId, SearchHistoryRequest request) {
    searchCacheRepository.saveRecent(userId, normalizeKeyword(request.keyword()), request.stockId(), RECENT_LIMIT);
    // 인기 검색 종목 카운트 증가
    trendingStockService.incrementSearchCount(request.stockId());
  }

  @Override
  public void deleteRecent(Long userId, String keyword) {
    searchCacheRepository.deleteRecent(userId, normalizeKeyword(keyword));
  }

  @Override
  public void clearRecent(Long userId) {
    searchCacheRepository.clearRecent(userId);
  }

  private String normalizeKeyword(String keyword) {
    if (keyword == null) {
      return "";
    }
    return keyword.trim();
  }
}
