package com.sallaemallae.backend.domain.report.entity;

import com.fasterxml.jackson.databind.JsonNode;
import com.sallaemallae.backend.domain.report.enumtype.AiSignal;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Entity
@Table(name = "ai_ml_reports", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"stock_id", "report_date", "model_version"})
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiMlReport {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "report_date", nullable = false)
  private LocalDate reportDate;

  @Column(name = "model_version", nullable = false, length = 20)
  private String modelVersion;

  @Enumerated(EnumType.STRING)
  @Column(name = "ml_signal", length = 4)
  private AiSignal mlSignal;

  @Column(name = "ml_confidence")
  private Float mlConfidence;

  @Column(name = "signal_agreement")
  private Boolean signalAgreement;

  @Column(name = "confidence_gap")
  private Float confidenceGap;

  @Column(name = "scenario_type", length = 30)
  private String scenarioType;

  @Column(name = "risk_flag")
  private Boolean riskFlag;

  // AI 서버 패킷 전체 JSON (상세 모델 결과)
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "report_data", columnDefinition = "jsonb")
  private JsonNode reportData;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
