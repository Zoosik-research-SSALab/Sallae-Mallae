package com.sallaemallae.backend.domain.news.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "news_keyword_map")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NewsKeywordMap {

  @EmbeddedId
  private NewsKeywordMapId id;
}
