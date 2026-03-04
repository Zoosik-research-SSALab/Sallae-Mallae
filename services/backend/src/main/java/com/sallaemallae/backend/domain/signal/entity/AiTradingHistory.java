package com.sallaemallae.backend.domain.signal.entity;

import com.sallaemallae.backend.domain.signal.enumtype.TradeType;
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
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "ai_trading_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiTradingHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "portfolio_id", nullable = false)
  private Long portfolioId;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "ml_report_id")
  private Long mlReportId;

  @Enumerated(EnumType.STRING)
  @Column(name = "trade_type", nullable = false, length = 4)
  private TradeType tradeType;

  @Column(name = "trade_weight", precision = 8, scale = 4)
  private BigDecimal tradeWeight;

  @Column(name = "trade_price_rate", precision = 12, scale = 6)
  private BigDecimal tradePriceRate;

  @Column(name = "return_rate", precision = 8, scale = 4)
  private BigDecimal returnRate;

  @Column(name = "trade_time", nullable = false)
  private OffsetDateTime tradeTime;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
