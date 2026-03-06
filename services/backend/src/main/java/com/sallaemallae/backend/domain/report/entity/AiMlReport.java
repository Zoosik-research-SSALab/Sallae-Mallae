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
import java.util.Map;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
  @Column(name = "ml_signal", length = 4)
  private AiSignal mlSignal;

  @Column(name = "ml_confidence", precision = 10, scale = 4)
  private BigDecimal mlConfidence;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "model_versions", columnDefinition = "jsonb")
  private Map<String, Object> modelVersions;

  @Column(name = "lgbm_up_prob")
  private Float lgbmUpProb;

  @Column(name = "lgbm_sideways_prob")
  private Float lgbmSidewaysProb;

  @Column(name = "lgbm_down_prob")
  private Float lgbmDownProb;

  @Column(name = "lgbm_predicted_class", length = 10)
  private String lgbmPredictedClass;

  @Column(name = "lgbm_confidence")
  private Float lgbmConfidence;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "lgbm_key_features", columnDefinition = "jsonb")
  private Map<String, Object> lgbmKeyFeatures;

  @Column(name = "lstm_pattern_score")
  private Float lstmPatternScore;

  @Column(name = "lstm_detected_pattern", length = 100)
  private String lstmDetectedPattern;

  @Column(name = "lstm_sequence_confidence")
  private Float lstmSequenceConfidence;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "lstm_history_match", columnDefinition = "jsonb")
  private Map<String, Object> lstmHistoryMatch;

  @Column(name = "garch_vol_1d")
  private Float garchVol1d;

  @Column(name = "garch_vol_3d")
  private Float garchVol3d;

  @Column(name = "garch_vol_5d")
  private Float garchVol5d;

  @Column(name = "garch_vol_level", length = 20)
  private String garchVolLevel;

  @Column(name = "garch_risk_flag")
  private Boolean garchRiskFlag;

  @Column(name = "garch_percentile")
  private Integer garchPercentile;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
