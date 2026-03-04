package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.Stock;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockRepository extends JpaRepository<Stock, Long> {

  Optional<Stock> findByTicker(String ticker);
}
