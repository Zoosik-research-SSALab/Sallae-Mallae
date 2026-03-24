package com.sallaemallae.backend.domain.news.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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

  @Mock
  private org.springframework.data.redis.core.ValueOperations<String, String> valueOperations;

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
  @DisplayName("키워드 없이 뉴스 목록 조회 - 관련 종목 포함, 전체 기간")
  void getNewsList_noKeyword_withRelatedStocks() throws Exception {
    List<StockNews> rows = List.of(
        createStockNews(1L, "뉴스1", null, "연합뉴스", null, NOW),
        createStockNews(2L, "뉴스2", null, "한경", null, NOW.minusHours(1)));

    List<Object[]> stockRows = new ArrayList<>();
    stockRows.add(new Object[]{1L, "삼성전자"});
    stockRows.add(new Object[]{1L, "SK하이닉스"});
    stockRows.add(new Object[]{2L, "LG전자"});

    String todayKey = "news:total_count:" + LocalDate.now();
    given(redisTemplate.opsForValue()).willReturn(valueOperations);
    given(valueOperations.get(todayKey)).willReturn("2");
    given(stockNewsRepository.findAllNews(isNull(), any(), any()))
        .willReturn(rows);
    given(stockNewsRepository.findStockNamesByNewsIds(List.of(1L, 2L)))
        .willReturn(stockRows);

    NewsListResponse result = newsService.getNewsList(null, null, LocalDate.now(), 0, 20);

    assertThat(result.totalCount()).isEqualTo(2L);
    assertThat(result.news()).hasSize(2);
    assertThat(result.news().get(0).id()).isEqualTo(1L);
    assertThat(result.news().get(0).title()).isEqualTo("뉴스1");
    assertThat(result.news().get(0).publishedAt()).isEqualTo(NOW);
    assertThat(result.news().get(0).relatedStocks()).containsExactly("삼성전자", "SK하이닉스");
    assertThat(result.news().get(1).relatedStocks()).containsExactly("LG전자");
  }

  @Test
  @DisplayName("키워드 필터로 뉴스 목록 조회")
  void getNewsList_withKeyword() throws Exception {
    List<StockNews> rows = List.of(
        createStockNews(3L, "키워드뉴스", null, "MBC", null, NOW));

    given(stockNewsRepository.findNewsByKeyword(eq("AI"), isNull(), any(), any()))
        .willReturn(rows);
    given(stockNewsRepository.countNewsByKeyword(eq("AI"), isNull(), any()))
        .willReturn(1L);
    given(stockNewsRepository.findStockNamesByNewsIds(List.of(3L)))
        .willReturn(new ArrayList<>());

    NewsListResponse result = newsService.getNewsList("AI", null, LocalDate.now(), 0, 10);

    assertThat(result.totalCount()).isEqualTo(1L);
    assertThat(result.news()).hasSize(1);
    assertThat(result.news().get(0).publisher()).isEqualTo("MBC");
    assertThat(result.news().get(0).relatedStocks()).isEmpty();
  }

  @Test
  @DisplayName("기간 필터 적용 뉴스 목록 조회")
  void getNewsList_withDateRange() throws Exception {
    List<StockNews> rows = List.of(
        createStockNews(4L, "기간뉴스", null, "SBS", null, NOW));

    given(stockNewsRepository.findAllNews(any(), any(), any()))
        .willReturn(rows);
    given(stockNewsRepository.countAllNews(any(), any()))
        .willReturn(1L);
    given(stockNewsRepository.findStockNamesByNewsIds(List.of(4L)))
        .willReturn(new ArrayList<>());

    LocalDate start = LocalDate.of(2025, 3, 1);
    LocalDate end = LocalDate.of(2025, 3, 6);
    NewsListResponse result = newsService.getNewsList(null, start, end, 0, 10);

    assertThat(result.totalCount()).isEqualTo(1L);
    assertThat(result.news()).hasSize(1);
    assertThat(result.news().get(0).title()).isEqualTo("기간뉴스");
  }

  @Test
  @DisplayName("뉴스 목록이 비어있으면 빈 리스트 반환")
  void getNewsList_empty_noStockQuery() {
    String todayKey = "news:total_count:" + LocalDate.now();
    given(redisTemplate.opsForValue()).willReturn(valueOperations);
    given(valueOperations.get(todayKey)).willReturn("0");
    given(stockNewsRepository.findAllNews(isNull(), any(), any()))
        .willReturn(new ArrayList<>());

    NewsListResponse result = newsService.getNewsList(null, null, LocalDate.now(), 0, 20);

    assertThat(result.totalCount()).isEqualTo(0L);
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
