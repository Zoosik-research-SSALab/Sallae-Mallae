package com.sallaemallae.backend.domain.stock.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.mock;

import com.sallaemallae.backend.domain.stock.dto.TrendingStockItemResponse;
import com.sallaemallae.backend.domain.stock.dto.TrendingStocksResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.repository.TrendingCacheRepository;
import com.sallaemallae.backend.domain.stock.repository.TrendingStockCacheRepository;
import com.sallaemallae.backend.domain.storage.service.StockIconUrlResolver;
import com.sallaemallae.backend.global.sse.SseManager;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
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
    private TrendingStockCacheRepository trendingStockCacheRepository;

    @Mock
    private StockRepository stockRepository;

    @Mock
    private StockPriceDailyRepository stockPriceDailyRepository;

    @Mock
    private StockIconUrlResolver stockIconUrlResolver;

    @Mock
    private SseManager sseManager;

    @InjectMocks
    private TrendingStockService trendingStockService;

    @Test
    @DisplayName("Redis TOP5 종목을 가격/변동률/iconUrl 포함하여 순위별로 반환한다")
    void refreshTrending_returnsRankedStocksWithPriceAndIcon() {
        given(sseManager.hasEmitters("trending-stocks")).willReturn(true);
        Set<String> topIds = new LinkedHashSet<>(List.of("1", "3"));
        given(trendingCacheRepository.getTopStockIds(5)).willReturn(topIds);

        Stock samsung = stock(1L, "삼성전자", "stock-icons/삼성전자_005930.png");
        Stock hynix = stock(3L, "SK하이닉스", "stock-icons/SK하이닉스_000660.png");
        given(stockRepository.findAllByIdInAndIsActiveTrue(List.of(1L, 3L))).willReturn(List.of(samsung, hynix));

        StockPriceDaily samsungPrice = dailyPrice(1L, 72500, 2.1f);
        StockPriceDaily hynixPrice = dailyPrice(3L, 185000, -1.5f);
        given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(1L, 3L))).willReturn(List.of(samsungPrice, hynixPrice));

        given(stockIconUrlResolver.resolve("stock-icons/삼성전자_005930.png")).willReturn("/assets/stock-icons/삼성전자_005930.png");
        given(stockIconUrlResolver.resolve("stock-icons/SK하이닉스_000660.png")).willReturn("/assets/stock-icons/SK하이닉스_000660.png");

        trendingStockService.refreshTrending();

        ArgumentCaptor<TrendingStocksResponse> captor = ArgumentCaptor.forClass(TrendingStocksResponse.class);
        verify(sseManager).broadcast(eq("trending-stocks"), captor.capture());
        verify(trendingStockCacheRepository).saveTrending(any());

        TrendingStocksResponse response = captor.getValue();
        assertThat(response.stocks()).hasSize(2);
        assertThat(response.stocks().get(0).name()).isEqualTo("삼성전자");
        assertThat(response.stocks().get(0).price()).isEqualTo(72500);
        assertThat(response.stocks().get(0).fluctuationRate()).isEqualTo(2.1f);
        assertThat(response.stocks().get(0).iconUrl()).isEqualTo("/assets/stock-icons/삼성전자_005930.png");
    }

    @Test
    @DisplayName("Redis에 데이터가 없으면 빈 리스트를 캐시 저장하고 broadcast한다")
    void refreshTrending_emptyRedis_broadcastsEmpty() {
        given(sseManager.hasEmitters("trending-stocks")).willReturn(true);
        given(trendingCacheRepository.getTopStockIds(5)).willReturn(Set.of());

        trendingStockService.refreshTrending();

        ArgumentCaptor<TrendingStocksResponse> captor = ArgumentCaptor.forClass(TrendingStocksResponse.class);
        verify(sseManager).broadcast(eq("trending-stocks"), captor.capture());
        verify(trendingStockCacheRepository).saveTrending(any());
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

        Stock samsung = stock(1L, "삼성전자", null);
        given(stockRepository.findAllByIdInAndIsActiveTrue(List.of(999L, 1L))).willReturn(List.of(samsung));
        given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(1L))).willReturn(List.of());

        trendingStockService.refreshTrending();

        ArgumentCaptor<TrendingStocksResponse> captor = ArgumentCaptor.forClass(TrendingStocksResponse.class);
        verify(sseManager).broadcast(eq("trending-stocks"), captor.capture());
        assertThat(captor.getValue().stocks()).hasSize(1);
        assertThat(captor.getValue().stocks().get(0).stockId()).isEqualTo(1L);
        assertThat(captor.getValue().stocks().get(0).price()).isNull();
    }

    @Test
    @DisplayName("파싱 불가능한 ID는 무시하고 나머지만 반환한다")
    void refreshTrending_skipsInvalidIds() {
        given(sseManager.hasEmitters("trending-stocks")).willReturn(true);
        Set<String> topIds = new LinkedHashSet<>(List.of("abc", "1"));
        given(trendingCacheRepository.getTopStockIds(5)).willReturn(topIds);

        Stock samsung = stock(1L, "삼성전자", null);
        given(stockRepository.findAllByIdInAndIsActiveTrue(List.of(1L))).willReturn(List.of(samsung));
        given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(1L))).willReturn(List.of());

        trendingStockService.refreshTrending();

        ArgumentCaptor<TrendingStocksResponse> captor = ArgumentCaptor.forClass(TrendingStocksResponse.class);
        verify(sseManager).broadcast(eq("trending-stocks"), captor.capture());
        assertThat(captor.getValue().stocks()).hasSize(1);
        assertThat(captor.getValue().stocks().get(0).name()).isEqualTo("삼성전자");
    }

    @Test
    @DisplayName("SSE 연결 시 캐시 히트하면 DB 조회 없이 즉시 전송한다")
    void streamTrending_cacheHit_sendsWithoutDbQuery() {
        TrendingStocksResponse cached = new TrendingStocksResponse(List.of(
            new TrendingStockItemResponse(1, 1L, "삼성전자", 72500, 2.1f, "/assets/stock-icons/삼성전자_005930.png")
        ));
        given(trendingStockCacheRepository.getTrending()).willReturn(Optional.of(cached));

        trendingStockService.streamTrending();

        verify(sseManager).sendToEmitter(any(), eq(cached));
        verifyNoInteractions(stockRepository);
    }

    @Test
    @DisplayName("SSE 연결 시 캐시 미스하면 DB 조회 후 캐시 저장하고 전송한다")
    void streamTrending_cacheMiss_buildsAndSavesAndSends() {
        given(trendingStockCacheRepository.getTrending()).willReturn(Optional.empty());

        Set<String> topIds = new LinkedHashSet<>(List.of("1"));
        given(trendingCacheRepository.getTopStockIds(5)).willReturn(topIds);

        Stock samsung = stock(1L, "삼성전자", "stock-icons/삼성전자_005930.png");
        given(stockRepository.findAllByIdInAndIsActiveTrue(List.of(1L))).willReturn(List.of(samsung));

        StockPriceDaily samsungPrice = dailyPrice(1L, 72500, 2.1f);
        given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(1L))).willReturn(List.of(samsungPrice));
        given(stockIconUrlResolver.resolve("stock-icons/삼성전자_005930.png")).willReturn("/assets/stock-icons/삼성전자_005930.png");

        trendingStockService.streamTrending();

        verify(trendingStockCacheRepository).saveTrending(any());
        ArgumentCaptor<TrendingStocksResponse> captor = ArgumentCaptor.forClass(TrendingStocksResponse.class);
        verify(sseManager).sendToEmitter(any(), captor.capture());

        TrendingStocksResponse sent = captor.getValue();
        assertThat(sent.stocks()).hasSize(1);
        assertThat(sent.stocks().get(0).price()).isEqualTo(72500);
        assertThat(sent.stocks().get(0).iconUrl()).isEqualTo("/assets/stock-icons/삼성전자_005930.png");
    }

    @Test
    @DisplayName("검색 카운트 증가 시 응답 캐시가 무효화된다")
    void incrementSearchCount_invalidatesCache() {
        trendingStockService.incrementSearchCount(1L);

        verify(trendingCacheRepository).incrementSearchCount(1L);
        verify(trendingStockCacheRepository).invalidate();
    }

    private Stock stock(Long id, String name, String iconUrl) {
        Stock stock = mock(Stock.class);
        given(stock.getId()).willReturn(id);
        given(stock.getName()).willReturn(name);
        given(stock.getIconUrl()).willReturn(iconUrl);
        return stock;
    }

    private StockPriceDaily dailyPrice(Long stockId, Integer closePrice, Float fluctuationRate) {
        StockPriceDaily price = mock(StockPriceDaily.class);
        given(price.getStockId()).willReturn(stockId);
        given(price.getClosePrice()).willReturn(closePrice);
        given(price.getFluctuationRate()).willReturn(fluctuationRate);
        return price;
    }
}
