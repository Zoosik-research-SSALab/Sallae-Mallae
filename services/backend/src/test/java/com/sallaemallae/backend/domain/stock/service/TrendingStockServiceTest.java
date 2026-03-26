package com.sallaemallae.backend.domain.stock.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.mock;

import com.sallaemallae.backend.domain.stock.dto.TrendingStocksResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.repository.TrendingCacheRepository;
import com.sallaemallae.backend.global.sse.SseManager;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TrendingStockServiceTest {

    @Mock
    private TrendingCacheRepository trendingCacheRepository;

    @Mock
    private StockRepository stockRepository;

    @Mock
    private SseManager sseManager;

    @InjectMocks
    private TrendingStockService trendingStockService;

    @Test
    @DisplayName("Redis TOP5 종목을 순위별로 반환한다")
    void refreshTrending_returnsRankedStocks() {
        Set<String> topIds = new LinkedHashSet<>(List.of("1", "3", "2"));
        given(sseManager.hasEmitters("trending-stocks")).willReturn(true);
        given(trendingCacheRepository.getTopStockIds(5)).willReturn(topIds);

        Stock samsung = stock(1L, "삼성전자");
        Stock lg = stock(2L, "LG에너지솔루션");
        Stock hynix = stock(3L, "SK하이닉스");
        given(stockRepository.findAllByIdInAndIsActiveTrue(List.of(1L, 3L, 2L))).willReturn(List.of(samsung, hynix, lg));

        trendingStockService.refreshTrending();

        ArgumentCaptor<TrendingStocksResponse> captor = ArgumentCaptor.forClass(TrendingStocksResponse.class);
        verify(sseManager).broadcast(eq("trending-stocks"), captor.capture());

        TrendingStocksResponse response = captor.getValue();
        assertThat(response.stocks()).hasSize(3);
        assertThat(response.stocks().get(0).rank()).isEqualTo(1);
        assertThat(response.stocks().get(0).name()).isEqualTo("삼성전자");
        assertThat(response.stocks().get(1).rank()).isEqualTo(2);
        assertThat(response.stocks().get(1).name()).isEqualTo("SK하이닉스");
        assertThat(response.stocks().get(2).rank()).isEqualTo(3);
        assertThat(response.stocks().get(2).name()).isEqualTo("LG에너지솔루션");
    }

    @Test
    @DisplayName("Redis에 데이터가 없으면 빈 리스트를 broadcast한다")
    void refreshTrending_emptyRedis_broadcastsEmpty() {
        given(sseManager.hasEmitters("trending-stocks")).willReturn(true);
        given(trendingCacheRepository.getTopStockIds(5)).willReturn(Set.of());

        trendingStockService.refreshTrending();

        ArgumentCaptor<TrendingStocksResponse> captor = ArgumentCaptor.forClass(TrendingStocksResponse.class);
        verify(sseManager).broadcast(eq("trending-stocks"), captor.capture());
        assertThat(captor.getValue().stocks()).isEmpty();
    }

    @Test
    @DisplayName("incrementSearchCount는 stockId가 null이면 무시한다")
    void incrementSearchCount_nullStockId_ignored() {
        trendingStockService.incrementSearchCount(null);
        verifyNoInteractions(trendingCacheRepository);
    }

    @Test
    @DisplayName("incrementSearchCount는 Redis에 카운트를 증가시킨다")
    void incrementSearchCount_delegatesToRepository() {
        trendingStockService.incrementSearchCount(1L);
        verify(trendingCacheRepository).incrementSearchCount(1L);
    }

    @Test
    @DisplayName("존재하지 않는 종목 ID는 결과에서 제외한다")
    void refreshTrending_skipsUnknownStockIds() {
        given(sseManager.hasEmitters("trending-stocks")).willReturn(true);
        Set<String> topIds = new LinkedHashSet<>(List.of("999", "1"));
        given(trendingCacheRepository.getTopStockIds(5)).willReturn(topIds);

        Stock samsung = stock(1L, "삼성전자");
        given(stockRepository.findAllByIdInAndIsActiveTrue(List.of(999L, 1L))).willReturn(List.of(samsung));

        trendingStockService.refreshTrending();

        ArgumentCaptor<TrendingStocksResponse> captor = ArgumentCaptor.forClass(TrendingStocksResponse.class);
        verify(sseManager).broadcast(eq("trending-stocks"), captor.capture());

        assertThat(captor.getValue().stocks()).hasSize(1);
        assertThat(captor.getValue().stocks().get(0).stockId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("파싱 불가능한 ID는 무시하고 나머지만 반환한다")
    void refreshTrending_skipsInvalidIds() {
        given(sseManager.hasEmitters("trending-stocks")).willReturn(true);
        Set<String> topIds = new LinkedHashSet<>(List.of("abc", "1"));
        given(trendingCacheRepository.getTopStockIds(5)).willReturn(topIds);

        Stock samsung = stock(1L, "삼성전자");
        given(stockRepository.findAllByIdInAndIsActiveTrue(List.of(1L))).willReturn(List.of(samsung));

        trendingStockService.refreshTrending();

        ArgumentCaptor<TrendingStocksResponse> captor = ArgumentCaptor.forClass(TrendingStocksResponse.class);
        verify(sseManager).broadcast(eq("trending-stocks"), captor.capture());

        assertThat(captor.getValue().stocks()).hasSize(1);
        assertThat(captor.getValue().stocks().get(0).name()).isEqualTo("삼성전자");
    }

    private Stock stock(Long id, String name) {
        Stock stock = mock(Stock.class);
        given(stock.getId()).willReturn(id);
        given(stock.getName()).willReturn(name);
        return stock;
    }
}
