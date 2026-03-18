package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockDividendYieldSnapshot;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockDividendYieldSnapshotRepository extends JpaRepository<StockDividendYieldSnapshot, Long> {

  List<StockDividendYieldSnapshot> findAllByStockIdInAndIsLatestTrue(Collection<Long> stockIds);

  List<StockDividendYieldSnapshot> findAllByStockIdInAndAsOfDateAndSource(
      Collection<Long> stockIds,
      LocalDate asOfDate,
      String source
  );
}
