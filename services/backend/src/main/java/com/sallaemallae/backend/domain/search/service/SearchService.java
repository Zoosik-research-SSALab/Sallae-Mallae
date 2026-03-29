package com.sallaemallae.backend.domain.search.service;

import com.sallaemallae.backend.domain.search.dto.request.SearchHistoryRequest;
import com.sallaemallae.backend.domain.search.dto.response.SearchRecentResponse;
import com.sallaemallae.backend.domain.search.dto.response.SearchResponse;

public interface SearchService {

  SearchResponse search(String keyword);

  SearchRecentResponse getRecent(Long userId);

  void saveRecent(Long userId, SearchHistoryRequest request);

  void deleteRecent(Long userId, String keyword);

  void clearRecent(Long userId);
}
