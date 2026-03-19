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

  @Column(name = "debate_report_id")
  private Long debateReportId;

  @Column(name = "model_version", length = 20)
  private String modelVersion;

  @Enumerated(EnumType.STRING)
  @Column(name = "trade_type", nullable = false, length = 4)
  private TradeType tradeType;

  @Column(name = "trade_weight")
  private Float tradeWeight;

  @Column(name = "trade_price_rate")
  private Float tradePriceRate;

  @Column(name = "return_rate")
  private Float returnRate;

  @Column(name = "trade_time", nullable = false)
  private OffsetDateTime tradeTime;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
