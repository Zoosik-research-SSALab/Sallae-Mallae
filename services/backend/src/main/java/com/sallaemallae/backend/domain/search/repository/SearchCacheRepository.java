package com.sallaemallae.backend.domain.search.repository;

import com.sallaemallae.backend.domain.search.dto.response.SearchRecentItemResponse;
import java.util.List;

public interface SearchCacheRepository {

  List<SearchRecentItemResponse> getRecent(Long userId, int limit);

  void saveRecent(Long userId, String keyword, Long stockId, int limit);

  void deleteRecent(Long userId, String keyword);

  void clearRecent(Long userId);
}
