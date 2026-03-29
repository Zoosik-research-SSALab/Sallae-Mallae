package com.sallaemallae.backend.domain.search.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.sallaemallae.backend.domain.search.dto.response.SearchNewsItemResponse;
import com.sallaemallae.backend.domain.search.dto.response.SearchResponse;
import com.sallaemallae.backend.domain.search.dto.response.SearchStockItemResponse;
import com.sallaemallae.backend.domain.search.repository.SearchCacheRepository;
import com.sallaemallae.backend.domain.search.repository.SearchQueryRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.service.TrendingStockService;
import com.sallaemallae.backend.domain.storage.service.StockIconUrlResolver;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SearchServiceImplTest {

  @Mock
  private SearchQueryRepository searchQueryRepository;

  @Mock
  private SearchCacheRepository searchCacheRepository;

  @Mock
  private StockIconUrlResolver stockIconUrlResolver;

  @Mock
  private TrendingStockService trendingStockService;

  @Mock
  private StockRepository stockRepository;

  @InjectMocks
  private SearchServiceImpl searchService;

  @Test
  @DisplayName("검색어가 비어 있으면 저장소를 조회하지 않고 빈 결과를 반환한다")
  void search_returnsEmptyResultWhenKeywordIsBlank() {
    SearchResponse response = searchService.search("   ");

    assertThat(response.stocks()).isEmpty();
    assertThat(response.news()).isEmpty();
    verify(searchQueryRepository, never()).searchStocks(org.mockito.ArgumentMatchers.anyString());
    verify(searchQueryRepository, never()).searchNews(org.mockito.ArgumentMatchers.anyString());
  }

  @Test
  @DisplayName("검색어 앞뒤 공백을 제거한 뒤 종목과 뉴스를 함께 반환한다")
  void search_trimsKeywordAndReturnsStocksAndNews() {
    List<SearchStockItemResponse> stocks = List.of(
        new SearchStockItemResponse(1L, "005930", "삼성전자", "Information Technology", 70300, BigDecimal.valueOf(2.15), null)
    );
    List<SearchNewsItemResponse> news = List.of(
        new SearchNewsItemResponse(
            11L,
            "삼성전자 실적 개선",
            "연합뉴스",
            "https://example.com/news/11",
            OffsetDateTime.parse("2026-03-26T09:00:00+09:00"))
    );
    given(searchQueryRepository.searchStocks("삼성")).willReturn(stocks);
    given(searchQueryRepository.searchNews("삼성")).willReturn(news);

    SearchResponse response = searchService.search("  삼성  ");

    assertThat(response.stocks()).containsExactlyElementsOf(stocks);
    assertThat(response.news()).containsExactlyElementsOf(news);
  }
}
