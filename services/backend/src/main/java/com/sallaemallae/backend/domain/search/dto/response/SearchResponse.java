package com.sallaemallae.backend.domain.search.dto.response;

import java.util.List;

public record SearchResponse(
    List<SearchStockItemResponse> stocks,
    List<SearchNewsItemResponse> news
) {
}
