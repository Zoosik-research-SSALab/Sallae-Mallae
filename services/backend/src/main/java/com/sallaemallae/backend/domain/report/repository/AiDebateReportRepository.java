package com.sallaemallae.backend.domain.report.repository;

import com.sallaemallae.backend.domain.report.entity.AiDebateReport;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AiDebateReportRepository extends JpaRepository<AiDebateReport, Long> {

  Optional<AiDebateReport> findTopByStockIdOrderByReportDateDescCreatedAtDesc(Long stockId);

  @Query(
      value = """
          SELECT *
          FROM ai_debate_reports
          WHERE stock_id = :stockId
          ORDER BY report_date DESC, created_at DESC
          LIMIT :limit OFFSET :offset
          """,
      nativeQuery = true
  )
  List<AiDebateReport> findByStockIdOrderByReportDateDescCreatedAtDesc(
      @Param("stockId") Long stockId,
      @Param("offset") int offset,
      @Param("limit") int limit
  );
}
