package com.sallaemallae.backend.domain.search.service;

import com.sallaemallae.backend.domain.search.dto.SearchHistoryRequest;
import com.sallaemallae.backend.domain.search.dto.SearchRecentResponse;
import com.sallaemallae.backend.domain.search.dto.SearchResponse;
import com.sallaemallae.backend.domain.search.repository.SearchCacheRepository;
import com.sallaemallae.backend.domain.search.repository.SearchQueryRepository;
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

  @Override
  @Transactional(readOnly = true)
  public SearchResponse search(String keyword) {
    String normalizedKeyword = normalizeKeyword(keyword);
    if (normalizedKeyword.isEmpty()) {
      return new SearchResponse(List.of(), List.of());
    }
    return new SearchResponse(
        searchQueryRepository.searchStocks(normalizedKeyword),
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
