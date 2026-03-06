package com.sallaemallae.backend.domain.search.service;

import com.sallaemallae.backend.domain.search.dto.SearchHistoryRequest;
import com.sallaemallae.backend.domain.search.dto.SearchRecentResponse;
import com.sallaemallae.backend.domain.search.dto.SearchResponse;

public interface SearchService {

  SearchResponse search(String keyword);

  SearchRecentResponse getRecent(Long userId);

  void saveRecent(Long userId, SearchHistoryRequest request);

  void deleteRecent(Long userId, String keyword);

  void clearRecent(Long userId);
}
