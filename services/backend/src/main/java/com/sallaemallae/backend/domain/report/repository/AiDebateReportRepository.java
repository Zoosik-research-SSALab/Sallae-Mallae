package com.sallaemallae.backend.domain.report.repository;

import com.sallaemallae.backend.domain.report.entity.AiDebateReport;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiDebateReportRepository extends JpaRepository<AiDebateReport, Long> {

  Optional<AiDebateReport> findTopByStockIdOrderByReportDateDescCreatedAtDesc(Long stockId);

  List<AiDebateReport> findByStockIdOrderByReportDateDescCreatedAtDesc(Long stockId);
}
