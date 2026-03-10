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
@Table(name = "ml_garch_predictions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"stock_id", "report_date", "model_version"})
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MlGarchPrediction {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "report_date", nullable = false)
  private LocalDate reportDate;

  @Column(name = "model_version", nullable = false, length = 20)
  private String modelVersion;

  @Column(name = "vol_1d")
  private Float vol1d;

  @Column(name = "vol_3d")
  private Float vol3d;

  @Column(name = "vol_5d")
  private Float vol5d;

  @Column(name = "volatility_level", length = 10)
  private String volatilityLevel;

  @Column(name = "risk_flag")
  private Boolean riskFlag;

  @Column(name = "percentile_vs_1y")
  private Float percentileVs1y;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
