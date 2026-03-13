package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockListResponse;

public interface StockTopListService {

  StockListResponse getTopStocks(
      String signal,
      String sector,
      String marketCap,
      String sort,
      String keyword,
      Integer offset,
      Integer limit
  );
}
