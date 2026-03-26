package com.sallaemallae.backend.domain.stock.dto;

import java.util.List;

public record TrendingStocksResponse(
    List<TrendingStockItemResponse> stocks
) {
}
