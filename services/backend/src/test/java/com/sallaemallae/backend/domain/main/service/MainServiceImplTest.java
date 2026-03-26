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
import com.sallaemallae.backend.domain.news.repository.PipelineSignalRepository;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import com.sallaemallae.backend.global.sse.SseManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
    private WatchlistRepository watchlistRepository;

    @Mock
    private PipelineSignalRepository pipelineSignalRepository;

    @Mock
    private SseManager sseManager;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private MainServiceImpl mainService;

    // ── getTopStocks ──

    @Nested
    @DisplayName("getTopStocks")
    class GetTopStocks {

        @Test
        @DisplayName("캐시 미스 시 DB 조회 후 캐시에 저장한다")
        void cacheMiss_queriesDbAndSaves() {
            given(cacheRepository.getTopStocks()).willReturn(Optional.empty());
            List<TopStockItemResponse> items = List.of(
                new TopStockItemResponse(1, 1L, "삼성전자", 70000, 1.5f, "BUY", 85, false)
            );
            given(queryRepository.getTopTenStocksToday()).willReturn(items);

            TopStocksResponse result = mainService.getTopStocks(null);

            assertThat(result.stocks()).hasSize(1);
            assertThat(result.stocks().get(0).name()).isEqualTo("삼성전자");
            verify(cacheRepository).saveTopStocks(org.mockito.ArgumentMatchers.argThat(response ->
                response.stocks().size() == 1
                    && response.stocks().get(0).name().equals("삼성전자")
            ));
        }

        @Test
        @DisplayName("캐시가 있으면 캐시에서 반환한다")
        void returnsCachedData() {
            TopStocksResponse cached = new TopStocksResponse(List.of(
                new TopStockItemResponse(1, 1L, "삼성전자", 70000, 1.5f, "BUY", 85, false)
            ));
            given(cacheRepository.getTopStocks()).willReturn(Optional.of(cached));

            TopStocksResponse result = mainService.getTopStocks(null);

            assertThat(result.stocks()).hasSize(1);
            assertThat(result.stocks().get(0).name()).isEqualTo("삼성전자");
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

        @Test
        @DisplayName("캐시 미스 시 DB 조회 후 캐시에 저장한다")
        void cacheMiss_queriesDbAndSaves() {
            given(cacheRepository.getCategories()).willReturn(Optional.empty());
            List<Object[]> raw = new ArrayList<>();
            raw.add(new Object[]{"반도체", "삼성전자", 70000, 3.0f});
            given(queryRepository.getCategoryStocksRaw()).willReturn(raw);

            SseEmitter emitter = mainService.streamCategories();

            assertThat(emitter).isNotNull();
            verify(cacheRepository).saveCategories(org.mockito.ArgumentMatchers.argThat(response ->
                response.categories().size() == 1
                    && response.categories().get(0).name().equals("반도체")
            ));
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
                List.of(new NewSignalItemResponse(1L, "005930", "삼성전자", 90, 70000, 1.5f, false)),
                List.of(new NewSignalItemResponse(2L, "000660", "SK하이닉스", 80, 130000, -2.0f, false))
            );
            given(cacheRepository.getNewSignals()).willReturn(Optional.of(cached));

            NewSignalsResponse result = mainService.getNewSignals(null);

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
                new NewSignalItemResponse(1L, "005930", "삼성전자", 90, 70000, 1.5f, false)
            );
            List<NewSignalItemResponse> sellList = List.of(
                new NewSignalItemResponse(2L, "000660", "SK하이닉스", 80, 130000, -2.0f, false)
            );
            given(queryRepository.getTodayBuySignals()).willReturn(buyList);
            given(queryRepository.getTodaySellSignals()).willReturn(sellList);

            NewSignalsResponse result = mainService.getNewSignals(null);

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

            NewSignalsResponse result = mainService.getNewSignals(null);

            assertThat(result.buy()).isEmpty();
            assertThat(result.sell()).isEmpty();
        }
    }

    // ── getTopStocks 관심종목 매핑 ──

    @Nested
    @DisplayName("getTopStocks 관심종목 매핑")
    class GetTopStocksWatchlist {

        @Test
        @DisplayName("로그인 유저의 관심종목에 isWatchlisted=true가 매핑된다")
        void mapsWatchlistedStocks() {
            TopStocksResponse cached = new TopStocksResponse(List.of(
                new TopStockItemResponse(1, 1L, "삼성전자", 70000, 1.5f, "BUY", 85, false),
                new TopStockItemResponse(2, 2L, "SK하이닉스", 130000, -0.5f, "SELL", 70, false)
            ));
            given(cacheRepository.getTopStocks()).willReturn(Optional.of(cached));
            given(watchlistRepository.findStockIdsByUserId(100L)).willReturn(List.of(1L));

            TopStocksResponse result = mainService.getTopStocks(100L);

            assertThat(result.stocks().get(0).isWatchlisted()).isTrue();
            assertThat(result.stocks().get(1).isWatchlisted()).isFalse();
        }

        @Test
        @DisplayName("비로그인 유저는 모두 isWatchlisted=false")
        void nonLoginUser_allFalse() {
            TopStocksResponse cached = new TopStocksResponse(List.of(
                new TopStockItemResponse(1, 1L, "삼성전자", 70000, 1.5f, "BUY", 85, false)
            ));
            given(cacheRepository.getTopStocks()).willReturn(Optional.of(cached));

            TopStocksResponse result = mainService.getTopStocks(null);

            assertThat(result.stocks().get(0).isWatchlisted()).isFalse();
        }
    }

    // ── getNewSignals 관심종목 매핑 ──

    @Nested
    @DisplayName("getNewSignals 관심종목 매핑")
    class GetNewSignalsWatchlist {

        @Test
        @DisplayName("로그인 유저의 관심종목에 isWatchlisted=true가 매핑된다")
        void mapsWatchlistedSignals() {
            NewSignalsResponse cached = new NewSignalsResponse(
                List.of(new NewSignalItemResponse(1L, "005930", "삼성전자", 90, 70000, 1.5f, false)),
                List.of(new NewSignalItemResponse(2L, "000660", "SK하이닉스", 80, 130000, -2.0f, false))
            );
            given(cacheRepository.getNewSignals()).willReturn(Optional.of(cached));
            given(watchlistRepository.findStockIdsByUserId(100L)).willReturn(List.of(2L));

            NewSignalsResponse result = mainService.getNewSignals(100L);

            assertThat(result.buy().get(0).isWatchlisted()).isFalse();
            assertThat(result.sell().get(0).isWatchlisted()).isTrue();
        }
    }

    // ── refreshCategories ──

    @Nested
    @DisplayName("refreshCategories")
    class RefreshCategories {

        @Test
        @DisplayName("빈 데이터도 정상 처리한다")
        void emptyResult_stillBroadcasts() {
            given(queryRepository.getCategoryStocksRaw()).willReturn(new ArrayList<>());

            mainService.refreshCategories();

            verify(cacheRepository).saveCategories(org.mockito.ArgumentMatchers.argThat(response ->
                response.categories().isEmpty()
            ));
            verify(sseManager).broadcast(
                org.mockito.ArgumentMatchers.eq("categories"),
                org.mockito.ArgumentMatchers.any(CategoryStocksResponse.class)
            );
        }

        @Test
        @DisplayName("동일 등락률 절대값인 종목도 안정적으로 2개를 선택한다")
        void sameFluctuationRate_selectsTwo() {
            List<Object[]> raw = new ArrayList<>();
            raw.add(new Object[]{"반도체", "A종목", 70000, 3.0f});
            raw.add(new Object[]{"반도체", "B종목", 80000, 3.0f});
            raw.add(new Object[]{"반도체", "C종목", 90000, 3.0f});

            given(queryRepository.getCategoryStocksRaw()).willReturn(raw);

            mainService.refreshCategories();

            verify(cacheRepository).saveCategories(org.mockito.ArgumentMatchers.argThat(response -> {
                var semi = response.categories().stream()
                    .filter(c -> c.name().equals("반도체")).findFirst().orElse(null);
                return semi != null && semi.stocks().size() == 2;
            }));
        }

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

}
