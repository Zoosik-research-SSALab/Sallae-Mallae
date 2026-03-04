package com.sallaemallae.backend.domain.signal.dto;

public record SignalItemResponse(Long id, String ticker, String signal, Float confidence) {
}
