package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockPriceMinute;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockPriceMinuteRepository extends JpaRepository<StockPriceMinute, Long> {

  List<StockPriceMinute> findByStockIdOrderByTradeTimestampDesc(Long stockId, Pageable pageable);

  boolean existsByStockIdAndTradeTimestamp(Long stockId, OffsetDateTime tradeTimestamp);
}
