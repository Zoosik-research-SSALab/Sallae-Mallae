package com.sallaemallae.backend.domain.signal.repository;

import com.sallaemallae.backend.domain.signal.entity.AiTradingHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiTradingHistoryRepository extends JpaRepository<AiTradingHistory, Long> {

  List<AiTradingHistory> findByPortfolioIdAndStockIdOrderByTradeTimeDesc(Long portfolioId, Long stockId);
}
