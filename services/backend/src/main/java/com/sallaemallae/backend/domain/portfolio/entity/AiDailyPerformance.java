package com.sallaemallae.backend.domain.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "ai_daily_performance")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiDailyPerformance {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "portfolio_id", nullable = false)
  private Long portfolioId;

  @Column(name = "record_date", nullable = false)
  private LocalDate recordDate;

  @Column(name = "daily_return", precision = 8, scale = 4)
  private BigDecimal dailyReturn;

  @Column(name = "cumulative_return", precision = 8, scale = 4)
  private BigDecimal cumulativeReturn;

  @Column(precision = 8, scale = 4)
  private BigDecimal mdd;
}
