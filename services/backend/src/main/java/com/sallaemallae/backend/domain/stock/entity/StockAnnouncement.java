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
@Table(name = "stock_announcements")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StockAnnouncement {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "announced_at", nullable = false)
  private LocalDate announcedAt;

  @Column(nullable = false, length = 255)
  private String title;

  @Column(length = 512)
  private String url;

  @Column(columnDefinition = "text")
  private String content;

  @Column(name = "target_year")
  private Integer targetYear;

  @Column(name = "has_financial_analysis", nullable = false)
  private boolean hasFinancialAnalysis;

  @Column(name = "has_operating_profit", nullable = false)
  private boolean hasOperatingProfit;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
