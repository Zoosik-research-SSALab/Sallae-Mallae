package com.sallaemallae.backend.domain.stock.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "news_agent_stock_data")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StockKeywordData {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "report_date", nullable = false)
  private LocalDate reportDate;

  /** 키워드 상위 3개 + 키워드당 뉴스 3건 (JSONB) */
  @Column(name = "top_keywords", columnDefinition = "jsonb")
  private String topKeywords;

  @Column(name = "sentiment", columnDefinition = "jsonb")
  private String sentiment;

  @Column(name = "created_at")
  private OffsetDateTime createdAt;
}
