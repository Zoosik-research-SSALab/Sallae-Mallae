package com.sallaemallae.backend.domain.main.dto;

import java.util.List;

public record CategoryItemResponse(
    String name,
    List<CategoryStockItemResponse> stocks
) {
}
