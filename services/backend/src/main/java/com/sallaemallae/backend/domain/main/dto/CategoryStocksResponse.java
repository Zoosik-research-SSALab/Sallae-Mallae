package com.sallaemallae.backend.domain.main.dto;

import java.util.List;

public record CategoryStocksResponse(
    List<CategoryItemResponse> categories
) {
}
