package com.sallaemallae.backend.domain.report.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Getter
@Entity
@Table(name = "ml_ensemble_predictions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"stock_id", "report_date", "model_version"})
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MlEnsemblePrediction {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "report_date", nullable = false)
  private LocalDate reportDate;

  @Column(name = "model_version", nullable = false, length = 20)
  private String modelVersion;

  // 0=하락, 1=상승
  @Column(name = "ensemble_result", nullable = false)
  private Integer ensembleResult;

  @Column(name = "ensemble_confidence", nullable = false)
  private Float ensembleConfidence;

  @Column(name = "signal_agreement")
  private Boolean signalAgreement;

  @Column(name = "confidence_gap")
  private Float confidenceGap;

  @Column(name = "risk_flag")
  private Boolean riskFlag;

  @Column(name = "scenario_type", length = 30)
  private String scenarioType;

  @Column(name = "scenario_label", length = 20)
  private String scenarioLabel;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
