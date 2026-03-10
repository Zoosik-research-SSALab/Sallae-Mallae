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
@Table(name = "ai_portfolio")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiPortfolio {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 50)
  private String name;

  @Column(name = "model_version", nullable = false, length = 20)
  private String modelVersion;

  @Column(name = "debate_version", length = 20)
  private String debateVersion;

  @Column(name = "cumulative_return")
  private Float cumulativeReturn;

  @Column(name = "total_trades", nullable = false)
  private int totalTrades;

  @Column(name = "winning_trades", nullable = false)
  private int winningTrades;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}
