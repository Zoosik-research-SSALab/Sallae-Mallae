package com.sallaemallae.backend.domain.news.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import com.sallaemallae.backend.domain.news.dto.NewsDetailResponse;
import com.sallaemallae.backend.domain.news.dto.NewsListResponse;
import com.sallaemallae.backend.domain.news.dto.TrendingKeywordsResponse;
import com.sallaemallae.backend.domain.news.entity.StockNews;
import com.sallaemallae.backend.domain.news.repository.KeywordRepository;
import com.sallaemallae.backend.domain.news.repository.StockNewsRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.ZSetOperations.TypedTuple;

@ExtendWith(MockitoExtension.class)
class NewsServiceImplTest {

  @Mock
  private StockNewsRepository stockNewsRepository;

  @Mock
  private KeywordRepository keywordRepository;

  @Mock
  private StringRedisTemplate redisTemplate;

  @Mock
  private ZSetOperations<String, String> zSetOperations;

  @InjectMocks
  private NewsServiceImpl newsService;

  private static final OffsetDateTime NOW = OffsetDateTime.of(2025, 3, 6, 12, 0, 0, 0, ZoneOffset.UTC);

  // ── helpers ───────────────────────────────────────────────────────────────

  private StockNews createStockNews(long id, String title, String snippet, String publisher,
      String url, OffsetDateTime publishedAt) throws Exception {
    var constructor = StockNews.class.getDeclaredConstructor();
    constructor.setAccessible(true);
    StockNews news = constructor.newInstance();
    setField(news, "id", id);
    setField(news, "title", title);
    setField(news, "snippet", snippet);
    setField(news, "publisher", publisher);
    setField(news, "url", url);
    setField(news, "publishedAt", publishedAt);
    return news;
  }

  private void setField(Object target, String name, Object value) throws Exception {
    Field f = target.getClass().getDeclaredField(name);
    f.setAccessible(true);
    f.set(target, value);
  }

  // ── getNewsList ───────────────────────────────────────────────────────────

  @Test
  @DisplayName("키워드 없이 뉴스 목록 조회 - 관련 종목 포함")
  void getNewsList_noKeyword_withRelatedStocks() {
    List<Object[]> rows = new ArrayList<>();
    rows.add(new Object[]{1L, "뉴스1", "연합뉴스", NOW});
    rows.add(new Object[]{2L, "뉴스2", "한경", NOW.minusHours(1)});

    List<Object[]> stockRows = new ArrayList<>();
    stockRows.add(new Object[]{1L, "삼성전자"});
    stockRows.add(new Object[]{1L, "SK하이닉스"});
    stockRows.add(new Object[]{2L, "LG전자"});

    given(stockNewsRepository.findNewsWithOptionalKeyword(isNull(), anyInt(), anyInt()))
        .willReturn(rows);
    given(stockNewsRepository.findStockNamesByNewsIds(List.of(1L, 2L)))
        .willReturn(stockRows);

    NewsListResponse result = newsService.getNewsList(null, 0, 20);

    assertThat(result.news()).hasSize(2);
    assertThat(result.news().get(0).id()).isEqualTo(1L);
    assertThat(result.news().get(0).title()).isEqualTo("뉴스1");
    assertThat(result.news().get(0).relatedStock()).containsExactly("삼성전자", "SK하이닉스");
    assertThat(result.news().get(1).relatedStock()).containsExactly("LG전자");
  }

  @Test
  @DisplayName("키워드 필터로 뉴스 목록 조회")
  void getNewsList_withKeyword() {
    List<Object[]> rows = new ArrayList<>();
    rows.add(new Object[]{3L, "키워드뉴스", "MBC", NOW});

    given(stockNewsRepository.findNewsWithOptionalKeyword(eq("AI"), anyInt(), anyInt()))
        .willReturn(rows);
    given(stockNewsRepository.findStockNamesByNewsIds(List.of(3L)))
        .willReturn(new ArrayList<>());

    NewsListResponse result = newsService.getNewsList("AI", 0, 10);

    assertThat(result.news()).hasSize(1);
    assertThat(result.news().get(0).publisher()).isEqualTo("MBC");
    assertThat(result.news().get(0).relatedStock()).isEmpty();
  }

  @Test
  @DisplayName("뉴스 목록이 비어있으면 빈 리스트 반환")
  void getNewsList_empty_noStockQuery() {
    given(stockNewsRepository.findNewsWithOptionalKeyword(isNull(), anyInt(), anyInt()))
        .willReturn(new ArrayList<>());

    NewsListResponse result = newsService.getNewsList(null, 0, 20);

    assertThat(result.news()).isEmpty();
  }

  // ── getNewsDetail ─────────────────────────────────────────────────────────

  @Test
  @DisplayName("뉴스 상세 조회 - 관련 종목 포함 및 키워드 Redis 증가")
  void getNewsDetail_found() throws Exception {
    StockNews news = createStockNews(10L, "상세뉴스", "본문내용", "KBS", "https://example.com", NOW);

    List<Object[]> relatedStocks = new ArrayList<>();
    relatedStocks.add(new Object[]{100L, "카카오", "035720"});

    given(stockNewsRepository.findById(10L)).willReturn(Optional.of(news));
    given(stockNewsRepository.findRelatedStocksByNewsId(10L)).willReturn(relatedStocks);
    given(keywordRepository.findKeywordNamesByNewsId(10L)).willReturn(List.of("AI", "반도체"));
    given(redisTemplate.opsForZSet()).willReturn(zSetOperations);

    NewsDetailResponse result = newsService.getNewsDetail(10L);

    assertThat(result.id()).isEqualTo(10L);
    assertThat(result.title()).isEqualTo("상세뉴스");
    assertThat(result.relatedStocks()).hasSize(1);
    assertThat(result.relatedStocks().get(0).name()).isEqualTo("카카오");

    String expectedKey = "trending:keywords:" + LocalDate.now();
    verify(zSetOperations).incrementScore(expectedKey, "AI", 1);
    verify(zSetOperations).incrementScore(expectedKey, "반도체", 1);
  }

  @Test
  @DisplayName("존재하지 않는 뉴스 조회 시 BusinessException 발생")
  void getNewsDetail_notFound_throwsException() {
    given(stockNewsRepository.findById(999L)).willReturn(Optional.empty());

    assertThatThrownBy(() -> newsService.getNewsDetail(999L))
        .isInstanceOf(BusinessException.class)
        .hasMessage("뉴스 정보를 찾을 수 없습니다.");
  }

  // ── getTrendingKeywords ───────────────────────────────────────────────────

  @Test
  @DisplayName("트렌딩 키워드 조회 - Redis에서 상위 5개 rank 순서대로")
  void getTrendingKeywords_returnsRankedList() {
    Set<TypedTuple<String>> tuples = new LinkedHashSet<>();
    tuples.add(TypedTuple.of("AI", 50.0));
    tuples.add(TypedTuple.of("반도체", 40.0));
    tuples.add(TypedTuple.of("ETF", 30.0));

    String expectedKey = "trending:keywords:" + LocalDate.now();
    given(redisTemplate.opsForZSet()).willReturn(zSetOperations);
    given(zSetOperations.reverseRangeWithScores(expectedKey, 0, 4)).willReturn(tuples);

    TrendingKeywordsResponse result = newsService.getTrendingKeywords();

    assertThat(result.trending()).hasSize(3);
    assertThat(result.trending().get(0).rank()).isEqualTo(1);
    assertThat(result.trending().get(0).keyword()).isEqualTo("AI");
    assertThat(result.trending().get(1).rank()).isEqualTo(2);
    assertThat(result.trending().get(2).rank()).isEqualTo(3);
    assertThat(result.trending().get(2).keyword()).isEqualTo("ETF");
  }

  @Test
  @DisplayName("트렌딩 키워드가 없으면 빈 리스트 반환")
  void getTrendingKeywords_empty() {
    String expectedKey = "trending:keywords:" + LocalDate.now();
    given(redisTemplate.opsForZSet()).willReturn(zSetOperations);
    given(zSetOperations.reverseRangeWithScores(expectedKey, 0, 4)).willReturn(new LinkedHashSet<>());

    TrendingKeywordsResponse result = newsService.getTrendingKeywords();

    assertThat(result.trending()).isEmpty();
  }
}
