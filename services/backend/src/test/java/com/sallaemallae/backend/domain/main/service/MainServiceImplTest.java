package com.sallaemallae.backend.domain.main.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import com.sallaemallae.backend.domain.main.dto.CategoryStocksResponse;
import com.sallaemallae.backend.domain.main.dto.NewSignalItemResponse;
import com.sallaemallae.backend.domain.main.dto.NewSignalsResponse;
import com.sallaemallae.backend.domain.main.dto.TopStockItemResponse;
import com.sallaemallae.backend.domain.main.dto.TopStocksResponse;
import com.sallaemallae.backend.domain.main.repository.MainCacheRepository;
import com.sallaemallae.backend.domain.main.repository.MainStockQueryRepository;
import com.sallaemallae.backend.global.sse.SseManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@ExtendWith(MockitoExtension.class)
class MainServiceImplTest {

    @Mock
    private MainStockQueryRepository queryRepository;

    @Mock
    private MainCacheRepository cacheRepository;

    @Mock
    private SseManager sseManager;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private MainServiceImpl mainService;

    // ── streamTopStocks ──

    @Nested
    @DisplayName("streamTopStocks")
    class StreamTopStocks {

        @Test
        @DisplayName("SSE emitter를 생성하고 SseManager에 등록한다")
        void registersEmitter() {
            given(cacheRepository.getTopStocks()).willReturn(Optional.empty());

            SseEmitter emitter = mainService.streamTopStocks();

            assertThat(emitter).isNotNull();
            verify(sseManager).addEmitter("top-stocks", emitter);
        }

        @Test
        @DisplayName("캐시가 있으면 초기 데이터를 전송한다")
        void sendsInitialCachedData() {
            TopStocksResponse cached = new TopStocksResponse(List.of(
                new TopStockItemResponse(1, 1L, "삼성전자", 70000, 1.5f, "BUY", 85)
            ));
            given(cacheRepository.getTopStocks()).willReturn(Optional.of(cached));

            SseEmitter emitter = mainService.streamTopStocks();

            assertThat(emitter).isNotNull();
        }
    }

    // ── streamMarketIndex ──

    @Nested
    @DisplayName("streamMarketIndex")
    class StreamMarketIndex {

        @Test
        @DisplayName("SSE emitter를 생성하고 SseManager에 등록한다")
        void registersEmitter() {
            given(cacheRepository.getMarketIndex()).willReturn(Optional.empty());

            SseEmitter emitter = mainService.streamMarketIndex();

            assertThat(emitter).isNotNull();
            verify(sseManager).addEmitter("market-index", emitter);
        }
    }

    // ── streamCategories ──

    @Nested
    @DisplayName("streamCategories")
    class StreamCategories {

        @Test
        @DisplayName("SSE emitter를 생성하고 SseManager에 등록한다")
        void registersEmitter() {
            given(cacheRepository.getCategories()).willReturn(Optional.empty());

            SseEmitter emitter = mainService.streamCategories();

            assertThat(emitter).isNotNull();
            verify(sseManager).addEmitter("categories", emitter);
        }
    }

    // ── getNewSignals ──

    @Nested
    @DisplayName("getNewSignals")
    class GetNewSignals {

        @Test
        @DisplayName("캐시에 데이터가 있으면 캐시에서 반환한다")
        void returnsCachedData() {
            NewSignalsResponse cached = new NewSignalsResponse(
                List.of(new NewSignalItemResponse(1L, "005930", "삼성전자", 90, 70000, 1.5f)),
                List.of(new NewSignalItemResponse(2L, "000660", "SK하이닉스", 80, 130000, -2.0f))
            );
            given(cacheRepository.getNewSignals()).willReturn(Optional.of(cached));

            NewSignalsResponse result = mainService.getNewSignals();

            assertThat(result.buy()).hasSize(1);
            assertThat(result.buy().get(0).name()).isEqualTo("삼성전자");
            assertThat(result.sell()).hasSize(1);
            assertThat(result.sell().get(0).name()).isEqualTo("SK하이닉스");
        }

        @Test
        @DisplayName("캐시 미스 시 DB에서 조회하여 캐시에 저장 후 반환한다")
        void cacheMiss_queriesDbAndSaves() {
            given(cacheRepository.getNewSignals()).willReturn(Optional.empty());

            List<NewSignalItemResponse> buyList = List.of(
                new NewSignalItemResponse(1L, "005930", "삼성전자", 90, 70000, 1.5f)
            );
            List<NewSignalItemResponse> sellList = List.of(
                new NewSignalItemResponse(2L, "000660", "SK하이닉스", 80, 130000, -2.0f)
            );
            given(queryRepository.getTodayBuySignals()).willReturn(buyList);
            given(queryRepository.getTodaySellSignals()).willReturn(sellList);

            NewSignalsResponse result = mainService.getNewSignals();

            assertThat(result.buy()).hasSize(1);
            assertThat(result.sell()).hasSize(1);
            verify(cacheRepository).saveNewSignals(result);
        }

        @Test
        @DisplayName("매수/매도 신호가 없으면 빈 리스트를 반환한다")
        void noSignals_returnsEmpty() {
            given(cacheRepository.getNewSignals()).willReturn(Optional.empty());
            given(queryRepository.getTodayBuySignals()).willReturn(new ArrayList<>());
            given(queryRepository.getTodaySellSignals()).willReturn(new ArrayList<>());

            NewSignalsResponse result = mainService.getNewSignals();

            assertThat(result.buy()).isEmpty();
            assertThat(result.sell()).isEmpty();
        }
    }

    // ── refreshTopStocks ──

    @Nested
    @DisplayName("refreshTopStocks")
    class RefreshTopStocks {

        @Test
        @DisplayName("DB에서 조회 → 캐시 저장 → SSE broadcast")
        void refreshesAndBroadcasts() {
            List<TopStockItemResponse> items = List.of(
                new TopStockItemResponse(1, 1L, "삼성전자", 70000, 1.5f, "BUY", 85),
                new TopStockItemResponse(2, 2L, "SK하이닉스", 130000, -0.5f, "SELL", 70)
            );
            given(queryRepository.getTopTenStocksToday()).willReturn(items);

            mainService.refreshTopStocks();

            TopStocksResponse expected = new TopStocksResponse(items);
            verify(cacheRepository).saveTopStocks(expected);
            verify(sseManager).broadcast("top-stocks", expected);
        }

        @Test
        @DisplayName("빈 결과도 정상 처리한다")
        void emptyResult_stillBroadcasts() {
            given(queryRepository.getTopTenStocksToday()).willReturn(new ArrayList<>());

            mainService.refreshTopStocks();

            TopStocksResponse expected = new TopStocksResponse(List.of());
            verify(cacheRepository).saveTopStocks(expected);
            verify(sseManager).broadcast("top-stocks", expected);
        }
    }

    // ── refreshCategories ──

    @Nested
    @DisplayName("refreshCategories")
    class RefreshCategories {

        @Test
        @DisplayName("카테고리별 등락률 절대값 상위 2개씩 그룹핑하여 broadcast")
        void groupsAndBroadcasts() {
            List<Object[]> raw = new ArrayList<>();
            raw.add(new Object[]{"반도체", "삼성전자", 70000, 3.0f});
            raw.add(new Object[]{"반도체", "SK하이닉스", 130000, -5.0f});
            raw.add(new Object[]{"반도체", "마이크론", 90000, 1.0f});
            raw.add(new Object[]{"자동차", "현대차", 200000, 2.5f});

            given(queryRepository.getCategoryStocksRaw()).willReturn(raw);

            mainService.refreshCategories();

            verify(cacheRepository).saveCategories(org.mockito.ArgumentMatchers.argThat(response -> {
                // 반도체 카테고리: |fluctuation_rate| 상위 2개 = SK하이닉스(5.0), 삼성전자(3.0)
                var semi = response.categories().stream()
                    .filter(c -> c.name().equals("반도체")).findFirst().orElse(null);
                if (semi == null || semi.stocks().size() != 2) return false;

                // 자동차 카테고리: 1개만 있으므로 1개
                var auto = response.categories().stream()
                    .filter(c -> c.name().equals("자동차")).findFirst().orElse(null);
                return auto != null && auto.stocks().size() == 1;
            }));
            verify(sseManager).broadcast(
                org.mockito.ArgumentMatchers.eq("categories"),
                org.mockito.ArgumentMatchers.any(CategoryStocksResponse.class)
            );
        }
    }

    // ── refreshNewSignals ──

    @Nested
    @DisplayName("refreshNewSignals")
    class RefreshNewSignals {

        @Test
        @DisplayName("매수/매도 신호를 갱신하여 캐시에 저장한다 (SSE broadcast 없음)")
        void refreshesCacheOnly() {
            List<NewSignalItemResponse> buy = List.of(
                new NewSignalItemResponse(1L, "005930", "삼성전자", 90, 70000, 1.5f)
            );
            given(queryRepository.getTodayBuySignals()).willReturn(buy);
            given(queryRepository.getTodaySellSignals()).willReturn(new ArrayList<>());

            mainService.refreshNewSignals();

            verify(cacheRepository).saveNewSignals(org.mockito.ArgumentMatchers.argThat(response ->
                response.buy().size() == 1 && response.sell().isEmpty()
            ));
        }
    }
}
