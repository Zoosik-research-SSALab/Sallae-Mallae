package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockPriceMonthly;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockPriceMonthlyRepository extends JpaRepository<StockPriceMonthly, Long> {

  List<StockPriceMonthly> findByStockIdOrderByTradeMonthDesc(Long stockId, Pageable pageable);

  List<StockPriceMonthly> findByStockIdAndTradeMonthBeforeOrderByTradeMonthDesc(
      Long stockId, LocalDate tradeMonth, Pageable pageable);

  boolean existsByStockIdAndTradeMonth(Long stockId, LocalDate tradeMonth);
}
