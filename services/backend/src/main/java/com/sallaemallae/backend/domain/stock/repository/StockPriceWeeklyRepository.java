package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockPriceWeekly;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockPriceWeeklyRepository extends JpaRepository<StockPriceWeekly, Long> {

  List<StockPriceWeekly> findByStockIdOrderByTradeWeekDesc(Long stockId, Pageable pageable);

  List<StockPriceWeekly> findByStockIdAndTradeWeekBeforeOrderByTradeWeekDesc(
      Long stockId, LocalDate tradeWeek, Pageable pageable);

  @Query("SELECT MAX(p.tradeWeek) FROM StockPriceWeekly p WHERE p.stockId = :stockId")
  LocalDate findMaxTradeWeekByStockId(@Param("stockId") Long stockId);
}
