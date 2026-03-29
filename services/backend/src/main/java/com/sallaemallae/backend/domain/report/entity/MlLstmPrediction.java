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
@Table(name = "ml_lstm_predictions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"stock_id", "report_date", "model_version"})
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MlLstmPrediction {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "report_date", nullable = false)
  private LocalDate reportDate;

  @Column(name = "model_version", nullable = false, length = 20)
  private String modelVersion;

  @Column(name = "group_id", length = 50)
  private String groupId;

  @Column(nullable = false)
  private Float prob;

  // 0=비상승, 1=상승
  @Column(nullable = false)
  private Integer pred;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
