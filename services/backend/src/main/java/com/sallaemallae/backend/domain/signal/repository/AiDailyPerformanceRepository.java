package com.sallaemallae.backend.domain.signal.repository;

import com.sallaemallae.backend.domain.signal.entity.AiDailyPerformance;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiDailyPerformanceRepository extends JpaRepository<AiDailyPerformance, Long> {

  List<AiDailyPerformance> findByPortfolioIdOrderByRecordDateAsc(Long portfolioId);

  Optional<AiDailyPerformance> findTopByPortfolioIdOrderByRecordDateDesc(Long portfolioId);

  Optional<AiDailyPerformance> findTopByPortfolioIdAndRecordDateLessThanOrderByRecordDateDesc(
      Long portfolioId,
      java.time.LocalDate recordDate
  );
}
