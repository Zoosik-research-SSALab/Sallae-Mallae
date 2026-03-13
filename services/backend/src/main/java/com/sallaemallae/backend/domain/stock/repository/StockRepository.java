package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.Stock;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockRepository extends JpaRepository<Stock, Long> {

  List<Stock> findAllByIsActiveTrueOrderByNameAsc();

  Optional<Stock> findByTicker(String ticker);

  Optional<Stock> findByTickerAndIsActiveTrue(String ticker);

  Optional<Stock> findByIdAndIsActiveTrue(Long id);

  List<Stock> findAllByTickerInAndIsActiveTrue(Collection<String> tickers);
}
