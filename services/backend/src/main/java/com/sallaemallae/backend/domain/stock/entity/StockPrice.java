package com.sallaemallae.backend.domain.stock.entity;

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
@Table(name = "stock_prices")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StockPrice {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "trade_timestamp", nullable = false)
  private OffsetDateTime tradeTimestamp;

  @Column(name = "open_price")
  private Integer openPrice;

  @Column(name = "high_price")
  private Integer highPrice;

  @Column(name = "low_price")
  private Integer lowPrice;

  @Column(name = "close_price", nullable = false)
  private Integer closePrice;

  @Column
  private Long volume;

  @Column(name = "fluctuation_rate", precision = 10, scale = 4)
  private BigDecimal fluctuationRate;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
