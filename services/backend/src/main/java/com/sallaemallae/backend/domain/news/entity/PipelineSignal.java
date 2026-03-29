package com.sallaemallae.backend.domain.news.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "pipeline_signals")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PipelineSignal {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "signal_type", nullable = false, length = 50)
  private String signalType;

  @Column(nullable = false, length = 20)
  private String status;

  @Column(name = "retry_count", nullable = false)
  private Long retryCount;

  @Column(name = "created_at")
  private OffsetDateTime createdAt;

  @Column(name = "processed_at")
  private OffsetDateTime processedAt;
}
