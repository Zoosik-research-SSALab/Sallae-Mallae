package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockFinancial;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockFinancialRepository extends JpaRepository<StockFinancial, Long> {

  @Query(value = """
      SELECT *
      FROM stock_financials sf
      WHERE sf.stock_id = :stockId
      ORDER BY sf.report_year DESC,
               CASE sf.report_quarter
                   WHEN 'YEARLY' THEN 5
                   WHEN '4Q' THEN 4
                   WHEN '3Q' THEN 3
                   WHEN '2Q' THEN 2
                   WHEN '1Q' THEN 1
                   ELSE 0
               END DESC,
               sf.created_at DESC,
               sf.id DESC
      LIMIT 1
      """, nativeQuery = true)
  Optional<StockFinancial> findLatestByStockId(@Param("stockId") Long stockId);

  @Query(value = """
      SELECT *
      FROM stock_financials sf
      WHERE sf.stock_id = :stockId
        AND (
          (:type = 'YEARLY' AND sf.report_quarter = 'YEARLY')
          OR (:type = 'QUARTERLY' AND sf.report_quarter <> 'YEARLY')
        )
      ORDER BY sf.report_year DESC,
               CASE sf.report_quarter
                   WHEN '4Q' THEN 4
                   WHEN '3Q' THEN 3
                   WHEN '2Q' THEN 2
                   WHEN '1Q' THEN 1
                   ELSE 0
               END DESC,
               sf.created_at DESC,
               sf.id DESC
      """, nativeQuery = true)
  List<StockFinancial> findByStockIdAndType(@Param("stockId") Long stockId, @Param("type") String type);
}
