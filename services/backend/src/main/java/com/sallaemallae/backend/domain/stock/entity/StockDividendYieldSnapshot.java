package com.sallaemallae.backend.domain.stock.entity;

import com.sallaemallae.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "stock_dividend_yield_snapshots")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StockDividendYieldSnapshot extends BaseTimeEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Column(name = "as_of_date", nullable = false)
  private LocalDate asOfDate;

  @Column(name = "record_date")
  private LocalDate recordDate;

  @Column(name = "cash_dividend_yield", precision = 10, scale = 4)
  private BigDecimal cashDividendYield;

  @Column(name = "stock_dividend_yield", precision = 10, scale = 4)
  private BigDecimal stockDividendYield;

  @Column(name = "dividend_kind", length = 30)
  private String dividendKind;

  @Column(name = "source", nullable = false, length = 40)
  private String source;

  @Column(name = "source_window_from", nullable = false)
  private LocalDate sourceWindowFrom;

  @Column(name = "source_window_to", nullable = false)
  private LocalDate sourceWindowTo;

  @Column(name = "fetched_at", nullable = false)
  private OffsetDateTime fetchedAt;

  @Column(name = "is_latest", nullable = false)
  private boolean isLatest;

  private StockDividendYieldSnapshot(
      Long stockId,
      LocalDate asOfDate,
      LocalDate recordDate,
      Float cashDividendYield,
      Float stockDividendYield,
      String dividendKind,
      String source,
      LocalDate sourceWindowFrom,
      LocalDate sourceWindowTo,
      OffsetDateTime fetchedAt,
      boolean isLatest
  ) {
    this.stockId = stockId;
    this.asOfDate = asOfDate;
    this.recordDate = recordDate;
    this.cashDividendYield = toDecimal(cashDividendYield);
    this.stockDividendYield = toDecimal(stockDividendYield);
    this.dividendKind = dividendKind;
    this.source = source;
    this.sourceWindowFrom = sourceWindowFrom;
    this.sourceWindowTo = sourceWindowTo;
    this.fetchedAt = fetchedAt;
    this.isLatest = isLatest;
  }

  public static StockDividendYieldSnapshot create(
      Long stockId,
      LocalDate asOfDate,
      LocalDate recordDate,
      Float cashDividendYield,
      Float stockDividendYield,
      String dividendKind,
      String source,
      LocalDate sourceWindowFrom,
      LocalDate sourceWindowTo,
      OffsetDateTime fetchedAt,
      boolean isLatest
  ) {
    return new StockDividendYieldSnapshot(
        stockId,
        asOfDate,
        recordDate,
        cashDividendYield,
        stockDividendYield,
        dividendKind,
        source,
        sourceWindowFrom,
        sourceWindowTo,
        fetchedAt,
        isLatest
    );
  }

  public void applySnapshot(
      LocalDate recordDate,
      Float cashDividendYield,
      Float stockDividendYield,
      String dividendKind,
      LocalDate sourceWindowFrom,
      LocalDate sourceWindowTo,
      OffsetDateTime fetchedAt,
      boolean isLatest
  ) {
    this.recordDate = recordDate;
    this.cashDividendYield = toDecimal(cashDividendYield);
    this.stockDividendYield = toDecimal(stockDividendYield);
    this.dividendKind = dividendKind;
    this.sourceWindowFrom = sourceWindowFrom;
    this.sourceWindowTo = sourceWindowTo;
    this.fetchedAt = fetchedAt;
    this.isLatest = isLatest;
  }

  public void markNotLatest() {
    this.isLatest = false;
  }

  public Float cashDividendYieldValue() {
    return cashDividendYield == null ? null : cashDividendYield.floatValue();
  }

  private static BigDecimal toDecimal(Float value) {
    return value == null ? null : BigDecimal.valueOf(value.doubleValue());
  }
}
