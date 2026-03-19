package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockListResponse;
import java.util.List;

public interface StockTopListService {

  StockListResponse getTopStocks(
      Long userId,
      String signal,
      List<String> sectors,
      String marketCap,
      String sort,
      String keyword,
      Integer offset,
      Integer limit
  );
}
