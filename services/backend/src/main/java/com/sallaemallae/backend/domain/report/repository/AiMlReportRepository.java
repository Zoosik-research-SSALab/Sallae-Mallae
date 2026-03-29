package com.sallaemallae.backend.domain.report.repository;

import com.sallaemallae.backend.domain.report.entity.AiMlReport;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiMlReportRepository extends JpaRepository<AiMlReport, Long> {

  Optional<AiMlReport> findTopByStockIdOrderByReportDateDescCreatedAtDesc(Long stockId);
}
