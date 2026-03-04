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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "ai_debate_reports")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiDebateReport {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "report_date", nullable = false)
  private LocalDate reportDate;

  @Enumerated(EnumType.STRING)
  @Column(name = "debate_signal", nullable = false, length = 4)
  private AiSignal debateSignal;

  @Column(name = "debate_confidence", precision = 8, scale = 4)
  private BigDecimal debateConfidence;

  @Column(name = "chairman_report", columnDefinition = "text")
  private String chairmanReport;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
