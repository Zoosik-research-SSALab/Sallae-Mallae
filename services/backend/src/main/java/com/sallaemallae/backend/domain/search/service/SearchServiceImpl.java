package com.sallaemallae.backend.domain.search.service;

import com.sallaemallae.backend.domain.search.dto.SearchHistoryRequest;
import com.sallaemallae.backend.domain.search.dto.SearchSuggestionResponse;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SearchServiceImpl implements SearchService {

  @Override
  public List<SearchSuggestionResponse> suggest(String keyword) {
    return List.of(new SearchSuggestionResponse(keyword, "005930"));
  }

  @Override
  public List<String> trending() {
    return List.of("삼성전자", "SK하이닉스", "NAVER");
  }

  @Override
  public void saveHistory(Long userId, SearchHistoryRequest request) {
    // TODO: Redis history/trending update
  }
}
