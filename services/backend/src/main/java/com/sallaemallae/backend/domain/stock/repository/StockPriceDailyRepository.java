package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockPriceDailyRepository extends JpaRepository<StockPriceDaily, Long> {

  List<StockPriceDaily> findByStockIdOrderByTradeDateDesc(Long stockId, Pageable pageable);
}
