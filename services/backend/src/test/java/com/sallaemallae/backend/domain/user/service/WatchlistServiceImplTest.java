package com.sallaemallae.backend.domain.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;

import com.sallaemallae.backend.domain.news.dto.NewsListResponse;
import com.sallaemallae.backend.domain.news.entity.StockNews;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import java.lang.reflect.Field;
import java.time.LocalDate;
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

  // ── helpers ───────────────────────────────────────────────────────────────

  private StockNews createStockNews(long id, String title, String publisher,
      OffsetDateTime publishedAt) throws Exception {
    var constructor = StockNews.class.getDeclaredConstructor();
    constructor.setAccessible(true);
    StockNews news = constructor.newInstance();
    setField(news, "id", id);
    setField(news, "title", title);
    setField(news, "publisher", publisher);
    setField(news, "publishedAt", publishedAt);
    return news;
  }

  private void setField(Object target, String name, Object value) throws Exception {
    Field f = target.getClass().getDeclaredField(name);
    f.setAccessible(true);
    f.set(target, value);
  }

  // ── getWatchlistNews ────────────────────────────────────────────────────

  @Test
  @DisplayName("관심종목 뉴스 조회 - 키워드 없음, 관련 종목 포함")
  void getWatchlistNews_noKeyword_withStocks() throws Exception {
    List<StockNews> rows = List.of(
        createStockNews(20L, "관심종목 뉴스", "SBS", NOW));

    List<Object[]> stockRows = new ArrayList<>();
    stockRows.add(new Object[]{20L, "NAVER"});

    given(watchlistRepository.findWatchlistNews(eq(1L), isNull(), any(), any()))
        .willReturn(rows);
    given(watchlistRepository.countWatchlistNews(eq(1L), isNull(), any()))
        .willReturn(1L);
    given(watchlistRepository.findStockNamesByNewsIds(List.of(20L)))
        .willReturn(stockRows);

    NewsListResponse result = watchlistService.getWatchlistNews(1L, null, null, LocalDate.now(), 0, 10);

    assertThat(result.totalCount()).isEqualTo(1L);
    assertThat(result.news()).hasSize(1);
    assertThat(result.news().get(0).id()).isEqualTo(20L);
    assertThat(result.news().get(0).title()).isEqualTo("관심종목 뉴스");
    assertThat(result.news().get(0).publisher()).isEqualTo("SBS");
    assertThat(result.news().get(0).relatedStocks()).containsExactly("NAVER");
  }

  @Test
  @DisplayName("관심종목 뉴스 조회 - 키워드 필터")
  void getWatchlistNews_withKeyword() throws Exception {
    List<StockNews> rows = List.of(
        createStockNews(30L, "AI 뉴스", "MBC", NOW));

    given(watchlistRepository.findWatchlistNewsByKeyword(eq(1L), eq("AI"), isNull(), any(), any()))
        .willReturn(rows);
    given(watchlistRepository.countWatchlistNewsByKeyword(eq(1L), eq("AI"), isNull(), any()))
        .willReturn(1L);
    given(watchlistRepository.findStockNamesByNewsIds(List.of(30L)))
        .willReturn(new ArrayList<>());

    NewsListResponse result = watchlistService.getWatchlistNews(1L, "AI", null, LocalDate.now(), 0, 10);

    assertThat(result.totalCount()).isEqualTo(1L);
    assertThat(result.news()).hasSize(1);
    assertThat(result.news().get(0).title()).isEqualTo("AI 뉴스");
  }

  @Test
  @DisplayName("관심종목 뉴스 비어있으면 빈 리스트 반환")
  void getWatchlistNews_empty() {
    given(watchlistRepository.findWatchlistNews(eq(1L), isNull(), any(), any()))
        .willReturn(new ArrayList<>());
    given(watchlistRepository.countWatchlistNews(eq(1L), isNull(), any()))
        .willReturn(0L);

    NewsListResponse result = watchlistService.getWatchlistNews(1L, null, null, LocalDate.now(), 0, 10);

    assertThat(result.totalCount()).isEqualTo(0L);
    assertThat(result.news()).isEmpty();
  }

  @Test
  @DisplayName("여러 뉴스에 종목명 일괄 매핑")
  void getWatchlistNews_multipleNews_batchStockLookup() throws Exception {
    List<StockNews> rows = List.of(
        createStockNews(1L, "뉴스 A", "KBS", NOW),
        createStockNews(2L, "뉴스 B", "MBC", NOW.minusHours(1)));

    List<Object[]> stockRows = new ArrayList<>();
    stockRows.add(new Object[]{1L, "삼성전자"});
    stockRows.add(new Object[]{2L, "카카오"});
    stockRows.add(new Object[]{2L, "NAVER"});

    given(watchlistRepository.findWatchlistNews(eq(1L), isNull(), any(), any()))
        .willReturn(rows);
    given(watchlistRepository.countWatchlistNews(eq(1L), isNull(), any()))
        .willReturn(2L);
    given(watchlistRepository.findStockNamesByNewsIds(List.of(1L, 2L)))
        .willReturn(stockRows);

    NewsListResponse result = watchlistService.getWatchlistNews(1L, null, null, LocalDate.now(), 0, 10);

    assertThat(result.news()).hasSize(2);
    assertThat(result.news().get(0).relatedStocks()).containsExactly("삼성전자");
    assertThat(result.news().get(1).relatedStocks()).containsExactlyInAnyOrder("카카오", "NAVER");
  }

  @Test
  @DisplayName("기간 필터 적용")
  void getWatchlistNews_withDateRange() throws Exception {
    List<StockNews> rows = List.of(
        createStockNews(40L, "기간뉴스", "YTN", NOW));

    given(watchlistRepository.findWatchlistNews(eq(1L), any(), any(), any()))
        .willReturn(rows);
    given(watchlistRepository.countWatchlistNews(eq(1L), any(), any()))
        .willReturn(1L);
    given(watchlistRepository.findStockNamesByNewsIds(List.of(40L)))
        .willReturn(new ArrayList<>());

    LocalDate start = LocalDate.of(2025, 3, 1);
    LocalDate end = LocalDate.of(2025, 3, 6);
    NewsListResponse result = watchlistService.getWatchlistNews(1L, null, start, end, 0, 10);

    assertThat(result.totalCount()).isEqualTo(1L);
    assertThat(result.news()).hasSize(1);
  }

  // ── getWatchlistedStockIds ──────────────────────────────────────────────

  @Test
  @DisplayName("관심종목 ID 조회 시 중복 제거")
  void getWatchlistedStockIds_usesProjectedStockIds() {
    given(watchlistRepository.findStockIdsByUserId(1L)).willReturn(List.of(10L, 20L, 20L));

    Set<Long> result = watchlistService.getWatchlistedStockIds(1L);

    assertThat(result).containsExactlyInAnyOrder(10L, 20L);
  }
}
