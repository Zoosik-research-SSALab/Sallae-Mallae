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
@Table(name = "stock_financials")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StockFinancial {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "report_year", nullable = false)
  private Integer reportYear;

  @Column(name = "report_quarter", nullable = false, length = 10)
  private String reportQuarter;

  @Column(name = "revenue")
  private Long revenue;

  @Column(name = "operating_profit")
  private Long operatingProfit;

  @Column(name = "net_income")
  private Long netIncome;

  @Column(precision = 12, scale = 4)
  private BigDecimal per;

  @Column(precision = 12, scale = 4)
  private BigDecimal pbr;

  @Column(precision = 12, scale = 4)
  private BigDecimal roe;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
