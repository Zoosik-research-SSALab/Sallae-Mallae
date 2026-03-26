package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockPriceDailyRepository extends JpaRepository<StockPriceDaily, Long> {

  List<StockPriceDaily> findByStockIdOrderByTradeDateAsc(Long stockId);

  List<StockPriceDaily> findByStockIdOrderByTradeDateDesc(Long stockId, Pageable pageable);

  Optional<StockPriceDaily> findTopByStockIdOrderByTradeDateDescIdDesc(Long stockId);

  List<StockPriceDaily> findByStockIdAndTradeDateBeforeOrderByTradeDateDesc(
      Long stockId, java.time.LocalDate tradeDate, Pageable pageable);

  List<StockPriceDaily> findByStockIdAndTradeDateBetweenOrderByTradeDateDescIdDesc(
      Long stockId,
      LocalDate startDate,
      LocalDate endDate
  );

  boolean existsByStockIdAndTradeDate(Long stockId, java.time.LocalDate tradeDate);

  @Query("SELECT MAX(p.tradeDate) FROM StockPriceDaily p WHERE p.stockId = :stockId")
  java.time.LocalDate findMaxTradeDateByStockId(@Param("stockId") Long stockId);

  @Query("""
      select p
      from StockPriceDaily p
      where p.stockId in :stockIds
        and p.tradeDate = (
          select max(p2.tradeDate)
          from StockPriceDaily p2
          where p2.stockId in :stockIds
        )
      """)
  List<StockPriceDaily> findLatestByStockIdIn(@Param("stockIds") Collection<Long> stockIds);

  List<StockPriceDaily> findByTradeDateBetweenOrderByStockIdAscTradeDateAsc(
      java.time.LocalDate startDate, java.time.LocalDate endDate);

  Optional<StockPriceDaily> findTopByStockIdAndTradeDateLessThanEqualOrderByTradeDateDesc(
      Long stockId, LocalDate tradeDate);
}
