package com.sallaemallae.backend.domain.main.dto;

import java.util.List;

public record MainSummaryResponse(
    List<String> topStocks,
    List<String> latestSignals,
    String marketStatus
) {
}
