package com.sallaemallae.backend.domain.signal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "ai_portfolio_holdings")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiPortfolioHolding {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "portfolio_id", nullable = false)
  private Long portfolioId;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "model_version", nullable = false, length = 20)
  private String modelVersion;

  @Column(name = "portfolio_weight")
  private Float portfolioWeight;

  @Column(name = "return_rate")
  private Float returnRate;

  @Column(name = "buy_date")
  private OffsetDateTime buyDate;

  @Column(name = "avg_buy_price")
  private Integer avgBuyPrice;

  @Column(name = "current_price")
  private Integer currentPrice;

  @Column(name = "holding_quantity")
  private Long holdingQuantity;

  @Column(name = "investment_amount")
  private Long investmentAmount;

  @Column(name = "market_value")
  private Long marketValue;

  @Column(name = "evaluation_profit")
  private Long evaluationProfit;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}
