package com.sallaemallae.backend.domain.main.dto;

import java.util.List;

public record TopStocksResponse(
    List<TopStockItemResponse> stocks
) {
}
