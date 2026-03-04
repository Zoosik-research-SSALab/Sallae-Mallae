package com.sallaemallae.backend.domain.report.dto;

import java.time.OffsetDateTime;

public record StockReportResponse(String ticker, String signal, Float confidence, OffsetDateTime reportTime) {
}
