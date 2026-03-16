package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockPriceWeekly;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockPriceWeeklyRepository extends JpaRepository<StockPriceWeekly, Long> {

  List<StockPriceWeekly> findByStockIdOrderByTradeWeekDesc(Long stockId, Pageable pageable);
}
