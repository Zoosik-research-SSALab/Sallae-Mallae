package com.sallaemallae.backend.domain.report.entity;

import com.sallaemallae.backend.domain.report.enumtype.AiSignal;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "ai_ml_reports")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiMlReport {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "report_time", nullable = false)
  private OffsetDateTime reportTime;

  @Enumerated(EnumType.STRING)
  @Column(name = "ml_signal", nullable = false, length = 4)
  private AiSignal mlSignal;

  @Column(name = "ml_confidence", precision = 8, scale = 4)
  private BigDecimal mlConfidence;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
