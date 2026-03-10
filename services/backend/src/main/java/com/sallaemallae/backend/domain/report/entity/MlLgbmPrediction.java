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
@Table(name = "ml_lgbm_predictions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"stock_id", "report_date", "model_version"})
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MlLgbmPrediction {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "report_date", nullable = false)
  private LocalDate reportDate;

  @Column(name = "model_version", nullable = false, length = 20)
  private String modelVersion;

  // 0=하락, 1=횡보, 2=상승
  @Column(name = "predicted_class", nullable = false)
  private Integer predictedClass;

  @Column(nullable = false)
  private Float confidence;

  @Column(name = "prob_down", nullable = false)
  private Float probDown;

  @Column(name = "prob_sideways", nullable = false)
  private Float probSideways;

  @Column(name = "prob_up", nullable = false)
  private Float probUp;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
