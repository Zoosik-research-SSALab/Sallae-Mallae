package com.sallaemallae.backend.domain.signal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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

  @Column(name = "model_version", nullable = false, length = 20)
  private String modelVersion;

  @Column(name = "record_date", nullable = false)
  private LocalDate recordDate;

  @Column(name = "daily_return")
  private Float dailyReturn;

  @Column(name = "cumulative_return")
  private Float cumulativeReturn;

  @Column(name = "cash_balance", nullable = false)
  private Long cashBalance;

  @Column(name = "invested_amount", nullable = false)
  private Long investedAmount;

  @Column(name = "market_value", nullable = false)
  private Long marketValue;

  @Column(name = "realized_profit", nullable = false)
  private Long realizedProfit;

  @Column(name = "unrealized_profit", nullable = false)
  private Long unrealizedProfit;

  @Column(name = "total_asset_value", nullable = false)
  private Long totalAssetValue;

  @Column(name = "holding_count", nullable = false)
  private Integer holdingCount;

  @Column
  private Float mdd;
}
