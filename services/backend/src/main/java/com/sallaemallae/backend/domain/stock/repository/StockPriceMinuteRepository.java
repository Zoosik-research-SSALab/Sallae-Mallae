package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockPriceMinute;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockPriceMinuteRepository extends JpaRepository<StockPriceMinute, Long> {

  List<StockPriceMinute> findByStockIdOrderByTradeTimestampDesc(Long stockId, Pageable pageable);

  boolean existsByStockIdAndTradeTimestamp(Long stockId, OffsetDateTime tradeTimestamp);

  @Query("SELECT m FROM StockPriceMinute m WHERE m.tradeTimestamp >= :start AND m.tradeTimestamp < :end ORDER BY m.stockId ASC, m.tradeTimestamp ASC")
  List<StockPriceMinute> findByDateRange(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
}
