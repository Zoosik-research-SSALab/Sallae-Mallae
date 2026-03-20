package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockPriceYearly;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockPriceYearlyRepository extends JpaRepository<StockPriceYearly, Long> {

  List<StockPriceYearly> findByStockIdOrderByTradeYearDesc(Long stockId, Pageable pageable);

  List<StockPriceYearly> findByStockIdAndTradeYearLessThanOrderByTradeYearDesc(
      Long stockId, Integer tradeYear, Pageable pageable);
}
