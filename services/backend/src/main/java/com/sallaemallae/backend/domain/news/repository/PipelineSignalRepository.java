package com.sallaemallae.backend.domain.news.repository;

import com.sallaemallae.backend.domain.news.entity.PipelineSignal;
import java.time.OffsetDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PipelineSignalRepository extends JpaRepository<PipelineSignal, Long> {

  // 지정 시각 이후의 완료된 뉴스 파이프라인 신호 존재 여부 확인
  @Query("""
      SELECT COUNT(ps) > 0 FROM PipelineSignal ps
      WHERE ps.signalType = 'NEWS_PIPELINE_DONE'
        AND ps.status = 'DONE'
        AND ps.createdAt >= :since
      """)
  boolean existsDoneSignalSince(@Param("since") OffsetDateTime since);
}
