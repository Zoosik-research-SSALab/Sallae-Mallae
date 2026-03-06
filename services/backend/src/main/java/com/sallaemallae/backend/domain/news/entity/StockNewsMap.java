package com.sallaemallae.backend.domain.news.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "stock_news_map")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StockNewsMap {

  @EmbeddedId
  private StockNewsMapId id;

  @Column(name = "sentiment_score", precision = 5, scale = 4)
  private BigDecimal sentimentScore;

  @Column(name = "sentiment_label", length = 20)
  private String sentimentLabel;
}
