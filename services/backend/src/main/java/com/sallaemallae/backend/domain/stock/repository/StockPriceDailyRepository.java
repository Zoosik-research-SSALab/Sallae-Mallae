package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockPriceDailyRepository extends JpaRepository<StockPriceDaily, Long> {

  List<StockPriceDaily> findByStockIdOrderByTradeDateDesc(Long stockId, Pageable pageable);

  @Query(value = """
      select distinct on (stock_id) *
      from stock_prices_daily
      where stock_id in (:stockIds)
      order by stock_id, trade_date desc
      """, nativeQuery = true)
  List<StockPriceDaily> findLatestByStockIdIn(@Param("stockIds") Collection<Long> stockIds);
}
