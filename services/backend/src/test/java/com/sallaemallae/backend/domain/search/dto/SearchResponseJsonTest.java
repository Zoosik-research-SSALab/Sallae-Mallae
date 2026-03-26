package com.sallaemallae.backend.domain.search.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sallaemallae.backend.domain.search.dto.response.SearchNewsItemResponse;
import com.sallaemallae.backend.domain.search.dto.response.SearchResponse;
import com.sallaemallae.backend.domain.search.dto.response.SearchStockItemResponse;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SearchResponseJsonTest {

  private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

  @Test
  @DisplayName("검색 응답 JSON은 뉴스 url과 published_at 필드를 함께 직렬화한다")
  void serialize_includesNewsUrlAndPublishedAt() throws Exception {
    SearchResponse response = new SearchResponse(
        List.of(
            new SearchStockItemResponse(
                1L,
                "005930",
                "삼성전자",
                "Information Technology",
                70300,
                BigDecimal.valueOf(2.15))
        ),
        List.of(
            new SearchNewsItemResponse(
                101L,
                "삼성전자 실적 개선",
                "연합뉴스",
                "https://example.com/news/101",
                OffsetDateTime.parse("2026-03-26T09:00:00+09:00"))
        )
    );

    String json = objectMapper.writeValueAsString(response);

    assertThat(objectMapper.readTree(json).at("/news/0/url").asText())
        .isEqualTo("https://example.com/news/101");
    assertThat(objectMapper.readTree(json).at("/news/0/published_at").isMissingNode())
        .isFalse();
  }
}
