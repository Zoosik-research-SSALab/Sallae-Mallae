package com.sallaemallae.backend.domain.main.dto;

import java.util.List;

public record NewSignalsResponse(
    List<NewSignalItemResponse> buy,
    List<NewSignalItemResponse> sell
) {
}
