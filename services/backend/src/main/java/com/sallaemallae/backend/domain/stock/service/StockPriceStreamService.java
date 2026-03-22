package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockPricesResponse;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface StockPriceStreamService {

  StockPricesResponse getLatestPrices(Long stockId, String candleType, String cursor);

  SseEmitter streamPrices(Long stockId, String candleType);
}
