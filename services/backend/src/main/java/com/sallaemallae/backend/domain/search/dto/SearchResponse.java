package com.sallaemallae.backend.domain.search.dto;

import java.util.List;

public record SearchResponse(
    List<SearchStockItemResponse> stocks,
    List<SearchNewsItemResponse> news
) {
}
