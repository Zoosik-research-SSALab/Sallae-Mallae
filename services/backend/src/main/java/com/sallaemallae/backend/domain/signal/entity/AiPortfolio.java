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
@Table(name = "ai_portfolio")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiPortfolio {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 50)
  private String name;

  @Column(name = "cumulative_return", precision = 10, scale = 4)
  private BigDecimal cumulativeReturn;

  @Column(name = "total_trades", nullable = false)
  private int totalTrades;

  @Column(name = "winning_trades", nullable = false)
  private int winningTrades;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}
