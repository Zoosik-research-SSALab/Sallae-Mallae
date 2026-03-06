package com.sallaemallae.backend.domain.news.dto;

import java.util.List;

public record TrendingKeywordsResponse(List<TrendingItem> trending) {

  public record TrendingItem(int rank, String keyword) {
  }
}
