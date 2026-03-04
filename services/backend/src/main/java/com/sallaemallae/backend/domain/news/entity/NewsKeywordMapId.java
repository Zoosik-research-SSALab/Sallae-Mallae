package com.sallaemallae.backend.domain.news.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@EqualsAndHashCode
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NewsKeywordMapId implements Serializable {

  @Column(name = "news_id")
  private Long newsId;

  @Column(name = "keyword_id")
  private Long keywordId;
}
