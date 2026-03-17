package com.sallaemallae.backend.domain.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.sallaemallae.backend.domain.user.dto.response.WatchlistNewsResponse;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WatchlistServiceImplTest {

  private static final OffsetDateTime NOW = OffsetDateTime.of(2025, 3, 6, 12, 0, 0, 0, ZoneOffset.UTC);

  @Mock
  private WatchlistRepository watchlistRepository;

  @InjectMocks
  private WatchlistServiceImpl watchlistService;

  @Test
  @DisplayName("watchlist news includes related stock names")
  void getWatchlistNews_withStocks() {
    List<Object[]> rows = new ArrayList<>();
    rows.add(new Object[]{20L, "Watchlist news", "summary", "https://news.com", "SBS", NOW});

    List<Object[]> stockRows = new ArrayList<>();
    stockRows.add(new Object[]{20L, "NAVER"});

    given(watchlistRepository.findWatchlistNews(1L, 10)).willReturn(rows);
    given(watchlistRepository.findStockNamesByNewsIds(List.of(20L))).willReturn(stockRows);

    WatchlistNewsResponse result = watchlistService.getWatchlistNews(1L, 10);

    assertThat(result.news()).hasSize(1);
    assertThat(result.news().get(0).id()).isEqualTo(20L);
    assertThat(result.news().get(0).title()).isEqualTo("Watchlist news");
    assertThat(result.news().get(0).snippet()).isEqualTo("summary");
    assertThat(result.news().get(0).url()).isEqualTo("https://news.com");
    assertThat(result.news().get(0).publisher()).isEqualTo("SBS");
    assertThat(result.news().get(0).relatedStocks()).containsExactly("NAVER");
  }

  @Test
  @DisplayName("empty news skips related stock lookup")
  void getWatchlistNews_empty() {
    given(watchlistRepository.findWatchlistNews(1L, 10)).willReturn(new ArrayList<>());

    WatchlistNewsResponse result = watchlistService.getWatchlistNews(1L, 10);

    assertThat(result.news()).isEmpty();
  }

  @Test
  @DisplayName("multiple news rows are enriched in a single batch")
  void getWatchlistNews_multipleNews_batchStockLookup() {
    List<Object[]> rows = new ArrayList<>();
    rows.add(new Object[]{1L, "News A", "summary A", "https://a.com", "KBS", NOW});
    rows.add(new Object[]{2L, "News B", "summary B", "https://b.com", "MBC", NOW.minusHours(1)});

    List<Object[]> stockRows = new ArrayList<>();
    stockRows.add(new Object[]{1L, "Samsung Electronics"});
    stockRows.add(new Object[]{2L, "Kakao"});
    stockRows.add(new Object[]{2L, "NAVER"});

    given(watchlistRepository.findWatchlistNews(1L, 10)).willReturn(rows);
    given(watchlistRepository.findStockNamesByNewsIds(List.of(1L, 2L))).willReturn(stockRows);

    WatchlistNewsResponse result = watchlistService.getWatchlistNews(1L, 10);

    assertThat(result.news()).hasSize(2);
    assertThat(result.news().get(0).relatedStocks()).containsExactly("Samsung Electronics");
    assertThat(result.news().get(1).relatedStocks()).containsExactlyInAnyOrder("Kakao", "NAVER");
  }

  @Test
  @DisplayName("watchlisted stock ids are read through projection")
  void getWatchlistedStockIds_usesProjectedStockIds() {
    given(watchlistRepository.findStockIdsByUserId(1L)).willReturn(List.of(10L, 20L, 20L));

    Set<Long> result = watchlistService.getWatchlistedStockIds(1L);

    assertThat(result).containsExactlyInAnyOrder(10L, 20L);
  }
}
