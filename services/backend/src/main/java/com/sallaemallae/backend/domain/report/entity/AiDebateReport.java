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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

  @Column(name = "debate_version", length = 20)
  private String debateVersion;

  @Enumerated(EnumType.STRING)
  @Column(name = "chairman_signal", length = 4)
  private AiSignal chairmanSignal;

  @Column(name = "debate_confidence")
  private Float debateConfidence;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "debate_summary", columnDefinition = "jsonb")
  private JsonNode debateSummary;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "final_stances", columnDefinition = "jsonb")
  private JsonNode finalStances;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "debate_full_log", columnDefinition = "jsonb")
  private JsonNode debateFullLog;

  @Column(name = "chairman_report", columnDefinition = "text")
  private String chairmanReport;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
