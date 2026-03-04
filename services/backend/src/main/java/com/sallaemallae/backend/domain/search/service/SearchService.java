package com.sallaemallae.backend.domain.search.service;

import com.sallaemallae.backend.domain.search.dto.SearchHistoryRequest;
import com.sallaemallae.backend.domain.search.dto.SearchSuggestionResponse;
import java.util.List;

public interface SearchService {

  List<SearchSuggestionResponse> suggest(String keyword);

  List<String> trending();

  void saveHistory(Long userId, SearchHistoryRequest request);
}
