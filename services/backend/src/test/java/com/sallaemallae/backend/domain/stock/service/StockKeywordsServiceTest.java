package com.sallaemallae.backend.domain.stock.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.domain.stock.dto.StockKeywordsResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockKeywordData;
import com.sallaemallae.backend.domain.stock.repository.StockAnnouncementRepository;
import com.sallaemallae.backend.domain.stock.repository.StockDividendYieldSnapshotRepository;
import com.sallaemallae.backend.domain.stock.repository.StockFinancialRepository;
import com.sallaemallae.backend.domain.stock.repository.StockKeywordDataRepository;
import com.sallaemallae.backend.domain.stock.repository.StockKeywordsCacheRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StockKeywordsServiceTest {

  @Mock private StockRepository stockRepository;
  @Mock private StockPriceDailyRepository stockPriceDailyRepository;
  @Mock private StockFinancialRepository stockFinancialRepository;
  @Mock private StockAnnouncementRepository stockAnnouncementRepository;
  @Mock private StockDividendYieldSnapshotRepository stockDividendYieldSnapshotRepository;
  @Mock private StockKeywordDataRepository stockKeywordDataRepository;
  @Mock private StockKeywordsCacheRepository stockKeywordsCacheRepository;
  @Mock private com.sallaemallae.backend.domain.news.repository.KeywordRepository keywordRepository;
  @Mock private com.sallaemallae.backend.domain.stock.repository.StockNewsQueryRepository stockNewsQueryRepository;

  private StockServiceImpl stockService;

  @BeforeEach
  void setUp() {
    stockService = new StockServiceImpl(
        stockRepository,
        stockPriceDailyRepository,
        stockFinancialRepository,
        stockAnnouncementRepository,
        stockDividendYieldSnapshotRepository,
        stockKeywordDataRepository,
        stockKeywordsCacheRepository,
        keywordRepository,
        stockNewsQueryRepository,
        new ObjectMapper()
    );
  }

  private Stock createStock(Long id) {
    Stock stock = Mockito.mock(Stock.class);
    Mockito.lenient().when(stock.getId()).thenReturn(id);
    return stock;
  }

  private StockKeywordData createKeywordData(String topKeywordsJson) {
    StockKeywordData data = Mockito.mock(StockKeywordData.class);
    Mockito.lenient().when(data.getTopKeywords()).thenReturn(topKeywordsJson);
    return data;
  }

  @Test
  @DisplayName("캐시 히트 시 DB 조회 없이 캐시 데이터 반환")
  void getStockKeywords_cacheHit() {
    Long stockId = 1L;
    Stock stock = createStock(stockId);
    given(stockRepository.findByIdAndIsActiveTrue(stockId)).willReturn(Optional.of(stock));

    StockKeywordsResponse cached = new StockKeywordsResponse(
        java.util.List.of(new StockKeywordsResponse.KeywordItem(42L, "HBM", java.util.List.of()))
    );
    given(stockKeywordsCacheRepository.get(stockId)).willReturn(Optional.of(cached));

    StockKeywordsResponse result = stockService.getStockKeywords(stockId);

    assertThat(result.keywords()).hasSize(1);
    assertThat(result.keywords().get(0).name()).isEqualTo("HBM");
    verify(stockKeywordDataRepository, never()).findTopByStockIdOrderByReportDateDesc(any());
  }

  @Test
  @DisplayName("캐시 미스 시 DB 조회 후 캐시 저장 및 정상 반환")
  void getStockKeywords_cacheMiss_dbHit() {
    Long stockId = 1L;
    Stock stock = createStock(stockId);
    given(stockRepository.findByIdAndIsActiveTrue(stockId)).willReturn(Optional.of(stock));
    given(stockKeywordsCacheRepository.get(stockId)).willReturn(Optional.empty());

    String json = """
        [
          {
            "keyword_id": 42,
            "keyword": "HBM 공급망",
            "mention_count": 15,
            "news": [
              {"news_id": 101, "title": "삼성전자 HBM 양산", "publisher": "한경", "published_at": "2026-03-12T14:30:00+09:00"},
              {"news_id": 102, "title": "SK하이닉스 수주", "publisher": "매경", "published_at": "2026-03-12T10:00:00+09:00"}
            ]
          },
          {
            "keyword_id": 55,
            "keyword": "실적",
            "mention_count": 8,
            "news": [
              {"news_id": 201, "title": "1분기 실적 전망", "publisher": "조선일보", "published_at": "2026-03-11T09:00:00+09:00"}
            ]
          }
        ]
        """;
    StockKeywordData keywordData = createKeywordData(json);
    given(stockKeywordDataRepository.findTopByStockIdOrderByReportDateDesc(stockId))
        .willReturn(Optional.of(keywordData));

    StockKeywordsResponse result = stockService.getStockKeywords(stockId);

    assertThat(result.keywords()).hasSize(2);
    assertThat(result.keywords().get(0).id()).isEqualTo(42L);
    assertThat(result.keywords().get(0).name()).isEqualTo("HBM 공급망");
    assertThat(result.keywords().get(0).news()).hasSize(2);
    assertThat(result.keywords().get(0).news().get(0).title()).isEqualTo("삼성전자 HBM 양산");
    assertThat(result.keywords().get(0).news().get(0).publisher()).isEqualTo("한경");
    assertThat(result.keywords().get(1).name()).isEqualTo("실적");
    assertThat(result.keywords().get(1).news()).hasSize(1);

    verify(stockKeywordsCacheRepository).save(eq(stockId), any(StockKeywordsResponse.class));
  }

  @Test
  @DisplayName("agent_data 없을 때 live query fallback으로 조회")
  void getStockKeywords_noAgentData_fallbackToLiveQuery() {
    Long stockId = 1L;
    Stock stock = createStock(stockId);
    given(stockRepository.findByIdAndIsActiveTrue(stockId)).willReturn(Optional.of(stock));
    given(stockKeywordsCacheRepository.get(stockId)).willReturn(Optional.empty());
    given(stockKeywordDataRepository.findTopByStockIdOrderByReportDateDesc(stockId))
        .willReturn(Optional.empty());

    // fallback live query mock
    var kwProjection = Mockito.mock(com.sallaemallae.backend.domain.news.repository.KeywordRepository.KeywordSummaryProjection.class);
    Mockito.lenient().when(kwProjection.getId()).thenReturn(10L);
    Mockito.lenient().when(kwProjection.getName()).thenReturn("반도체");
    given(keywordRepository.findTopKeywordsByStockId(stockId, 3)).willReturn(java.util.List.of(kwProjection));

    var newsProjection = Mockito.mock(com.sallaemallae.backend.domain.stock.repository.StockNewsQueryRepository.StockNewsSummaryProjection.class);
    Mockito.lenient().when(newsProjection.getId()).thenReturn(501L);
    Mockito.lenient().when(newsProjection.getTitle()).thenReturn("반도체 뉴스");
    Mockito.lenient().when(newsProjection.getPublisher()).thenReturn("매경");
    Mockito.lenient().when(newsProjection.getPublishedAt()).thenReturn(java.time.OffsetDateTime.now());
    given(stockNewsQueryRepository.findLatestNewsByStockIdAndKeywordIds(eq(stockId), any(), eq(3)))
        .willReturn(java.util.List.of(newsProjection));

    StockKeywordsResponse result = stockService.getStockKeywords(stockId);

    assertThat(result.keywords()).hasSize(1);
    assertThat(result.keywords().get(0).name()).isEqualTo("반도체");
    assertThat(result.keywords().get(0).news()).hasSize(1);
    assertThat(result.keywords().get(0).news().get(0).title()).isEqualTo("반도체 뉴스");
    verify(keywordRepository).findTopKeywordsByStockId(stockId, 3);
  }

  @Test
  @DisplayName("agent_data JSONB 파싱 실패 시 live query fallback으로 조회")
  void getStockKeywords_jsonParseFail_fallbackToLiveQuery() {
    Long stockId = 1L;
    Stock stock = createStock(stockId);
    given(stockRepository.findByIdAndIsActiveTrue(stockId)).willReturn(Optional.of(stock));
    given(stockKeywordsCacheRepository.get(stockId)).willReturn(Optional.empty());

    StockKeywordData brokenData = createKeywordData("{invalid json!!}");
    given(stockKeywordDataRepository.findTopByStockIdOrderByReportDateDesc(stockId))
        .willReturn(Optional.of(brokenData));

    // fallback
    given(keywordRepository.findTopKeywordsByStockId(stockId, 3)).willReturn(java.util.List.of());

    StockKeywordsResponse result = stockService.getStockKeywords(stockId);

    assertThat(result.keywords()).isEmpty();
    verify(keywordRepository).findTopKeywordsByStockId(stockId, 3);
  }

  @Test
  @DisplayName("agent_data도 없고 live query도 빈 결과일 때 빈 응답 반환")
  void getStockKeywords_noDataAtAll() {
    Long stockId = 1L;
    Stock stock = createStock(stockId);
    given(stockRepository.findByIdAndIsActiveTrue(stockId)).willReturn(Optional.of(stock));
    given(stockKeywordsCacheRepository.get(stockId)).willReturn(Optional.empty());
    given(stockKeywordDataRepository.findTopByStockIdOrderByReportDateDesc(stockId))
        .willReturn(Optional.empty());
    given(keywordRepository.findTopKeywordsByStockId(stockId, 3)).willReturn(java.util.List.of());

    StockKeywordsResponse result = stockService.getStockKeywords(stockId);

    assertThat(result.keywords()).isEmpty();
  }

  @Test
  @DisplayName("존재하지 않는 종목 조회 시 예외 발생")
  void getStockKeywords_stockNotFound() {
    Long stockId = 999L;
    given(stockRepository.findByIdAndIsActiveTrue(stockId)).willReturn(Optional.empty());

    org.assertj.core.api.Assertions.assertThatThrownBy(() -> stockService.getStockKeywords(stockId))
        .isInstanceOf(com.sallaemallae.backend.global.exception.BusinessException.class);
  }
}
