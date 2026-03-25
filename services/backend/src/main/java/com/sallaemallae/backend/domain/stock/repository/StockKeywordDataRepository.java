package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockKeywordData;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 종목별 키워드+뉴스 데이터 조회 (news_agent_stock_data 테이블)
 */
public interface StockKeywordDataRepository extends JpaRepository<StockKeywordData, Long> {

  /** 해당 종목의 가장 최신 report_date 데이터 1건 조회 */
  Optional<StockKeywordData> findTopByStockIdOrderByReportDateDesc(Long stockId);
}