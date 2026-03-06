package com.sallaemallae.backend.domain.user.controller;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sallaemallae.backend.domain.news.dto.WatchlistNewsItemResponse;
import com.sallaemallae.backend.domain.news.dto.WatchlistNewsResponse;
import com.sallaemallae.backend.domain.news.service.NewsService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(WatchlistController.class)
class WatchlistControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private NewsService newsService;

  private static final OffsetDateTime NOW = OffsetDateTime.of(2025, 3, 6, 12, 0, 0, 0, ZoneOffset.UTC);

  @Test
  @DisplayName("관심종목 뉴스 조회 - 정상 반환")
  void getWatchlistNews_returnsNews() throws Exception {
    WatchlistNewsResponse response = new WatchlistNewsResponse(List.of(
        new WatchlistNewsItemResponse(
            20L, "관심뉴스", "요약", "https://news.com", "SBS", NOW, List.of("NAVER"))
    ));
    given(newsService.getWatchlistNews(1L, 3)).willReturn(response);

    mockMvc.perform(get("/api/users/watchlist/news")
            .header("X-User-Id", "1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.news").isArray())
        .andExpect(jsonPath("$.data.news[0].id").value(20))
        .andExpect(jsonPath("$.data.news[0].title").value("관심뉴스"))
        .andExpect(jsonPath("$.data.news[0].publisher").value("SBS"))
        .andExpect(jsonPath("$.data.news[0].relatedStocks[0]").value("NAVER"));
  }

  @Test
  @DisplayName("관심종목 뉴스 없으면 빈 배열 반환")
  void getWatchlistNews_empty() throws Exception {
    given(newsService.getWatchlistNews(1L, 3)).willReturn(new WatchlistNewsResponse(List.of()));

    mockMvc.perform(get("/api/users/watchlist/news")
            .header("X-User-Id", "1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.news").isArray())
        .andExpect(jsonPath("$.data.news").isEmpty());
  }

  @Test
  @DisplayName("X-User-Id 헤더 없으면 400 응답")
  void getWatchlistNews_missingHeader_returns400() throws Exception {
    mockMvc.perform(get("/api/users/watchlist/news"))
        .andExpect(status().isBadRequest());
  }
}