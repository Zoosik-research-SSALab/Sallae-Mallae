package com.sallaemallae.backend.domain.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.sallaemallae.backend.domain.news.dto.WatchlistNewsResponse;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WatchlistServiceImplTest {

  @Mock
  private WatchlistRepository watchlistRepository;

  @InjectMocks
  private WatchlistServiceImpl watchlistService;

  private static final OffsetDateTime NOW = OffsetDateTime.of(2025, 3, 6, 12, 0, 0, 0, ZoneOffset.UTC);

  @Test
  @DisplayName("관심종목 뉴스 조회 - 관련 종목명 포함")
  void getWatchlistNews_withStocks() {
    List<Object[]> rows = new ArrayList<>();
    rows.add(new Object[]{20L, "관심뉴스", "요약", "https://news.com", "SBS", NOW});

    List<Object[]> stockRows = new ArrayList<>();
    stockRows.add(new Object[]{20L, "NAVER"});

    given(watchlistRepository.findWatchlistNews(1L, 10)).willReturn(rows);
    given(watchlistRepository.findStockNamesByNewsIds(List.of(20L))).willReturn(stockRows);

    WatchlistNewsResponse result = watchlistService.getWatchlistNews(1L, 10);

    assertThat(result.news()).hasSize(1);
    assertThat(result.news().get(0).id()).isEqualTo(20L);
    assertThat(result.news().get(0).title()).isEqualTo("관심뉴스");
    assertThat(result.news().get(0).snippet()).isEqualTo("요약");
    assertThat(result.news().get(0).url()).isEqualTo("https://news.com");
    assertThat(result.news().get(0).publisher()).isEqualTo("SBS");
    assertThat(result.news().get(0).relatedStocks()).containsExactly("NAVER");
  }

  @Test
  @DisplayName("관심종목이 없으면 빈 뉴스 목록 반환 - findStockNamesByNewsIds 미호출")
  void getWatchlistNews_empty() {
    given(watchlistRepository.findWatchlistNews(1L, 10)).willReturn(new ArrayList<>());

    WatchlistNewsResponse result = watchlistService.getWatchlistNews(1L, 10);

    assertThat(result.news()).isEmpty();
  }

  @Test
  @DisplayName("여러 뉴스에 대한 관련 종목 N+1 방지 - 단일 배치 조회")
  void getWatchlistNews_multipleNews_batchStockLookup() {
    List<Object[]> rows = new ArrayList<>();
    rows.add(new Object[]{1L, "뉴스A", "요약A", "https://a.com", "KBS", NOW});
    rows.add(new Object[]{2L, "뉴스B", "요약B", "https://b.com", "MBC", NOW.minusHours(1)});

    List<Object[]> stockRows = new ArrayList<>();
    stockRows.add(new Object[]{1L, "삼성전자"});
    stockRows.add(new Object[]{2L, "카카오"});
    stockRows.add(new Object[]{2L, "NAVER"});

    given(watchlistRepository.findWatchlistNews(1L, 10)).willReturn(rows);
    given(watchlistRepository.findStockNamesByNewsIds(List.of(1L, 2L))).willReturn(stockRows);

    WatchlistNewsResponse result = watchlistService.getWatchlistNews(1L, 10);

    assertThat(result.news()).hasSize(2);
    assertThat(result.news().get(0).relatedStocks()).containsExactly("삼성전자");
    assertThat(result.news().get(1).relatedStocks()).containsExactlyInAnyOrder("카카오", "NAVER");
  }
}
