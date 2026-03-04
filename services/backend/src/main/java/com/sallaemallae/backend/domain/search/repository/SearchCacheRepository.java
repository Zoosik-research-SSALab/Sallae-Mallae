package com.sallaemallae.backend.domain.search.repository;

import java.util.List;

public interface SearchCacheRepository {

  List<String> getTrending();

  void saveHistory(Long userId, String keyword, Long stockId);
}
