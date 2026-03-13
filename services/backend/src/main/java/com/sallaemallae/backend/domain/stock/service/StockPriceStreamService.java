package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockPricesResponse;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface StockPriceStreamService {

  StockPricesResponse getLatestPrices(Long stockId, String period);

  SseEmitter streamPrices(Long stockId, String period);
}
