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

  @Query("""
      select p
      from StockPriceDaily p
      where p.stockId in :stockIds
        and p.tradeDate = (
          select max(p2.tradeDate)
          from StockPriceDaily p2
          where p2.stockId = p.stockId
        )
      """)
  List<StockPriceDaily> findLatestByStockIdIn(@Param("stockIds") Collection<Long> stockIds);
}
