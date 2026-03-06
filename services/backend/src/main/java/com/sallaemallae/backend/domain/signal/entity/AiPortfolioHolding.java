package com.sallaemallae.backend.domain.signal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
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

  @Column(name = "portfolio_weight", precision = 10, scale = 4)
  private BigDecimal portfolioWeight;

  @Column(name = "return_rate", precision = 10, scale = 4)
  private BigDecimal returnRate;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}
