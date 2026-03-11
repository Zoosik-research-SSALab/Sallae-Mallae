package com.sallaemallae.backend.domain.signal.repository;

import com.sallaemallae.backend.domain.signal.entity.AiTradingHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AiTradingHistoryRepository extends JpaRepository<AiTradingHistory, Long> {

  List<AiTradingHistory> findByPortfolioIdAndStockIdOrderByTradeTimeDesc(Long portfolioId, Long stockId);

  @Query(
      value = """
          SELECT *
          FROM ai_trading_history
          WHERE portfolio_id = :portfolioId
            AND stock_id = :stockId
          ORDER BY trade_time DESC
          LIMIT :limit OFFSET :offset
          """,
      nativeQuery = true
  )
  List<AiTradingHistory> findByPortfolioIdAndStockIdOrderByTradeTimeDesc(
      @Param("portfolioId") Long portfolioId,
      @Param("stockId") Long stockId,
      @Param("offset") int offset,
      @Param("limit") int limit
  );
}
