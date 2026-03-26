package com.sallaemallae.backend.domain.main.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.domain.main.dto.CategoryItemResponse;
import com.sallaemallae.backend.domain.main.dto.CategoryStockItemResponse;
import com.sallaemallae.backend.domain.main.dto.CategoryStocksResponse;
import com.sallaemallae.backend.domain.main.dto.MarketIndexItemResponse;
import com.sallaemallae.backend.domain.main.dto.MarketIndexResponse;
import com.sallaemallae.backend.domain.main.dto.NewSignalItemResponse;
import com.sallaemallae.backend.domain.main.dto.NewSignalsResponse;
import com.sallaemallae.backend.domain.main.dto.TopStockItemResponse;
import com.sallaemallae.backend.domain.main.dto.TopStocksResponse;
import com.sallaemallae.backend.domain.main.repository.MainCacheRepository;
import com.sallaemallae.backend.domain.main.repository.MainStockQueryRepository;
import com.sallaemallae.backend.domain.news.repository.PipelineSignalRepository;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import com.sallaemallae.backend.global.sse.SseManager;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.concurrent.atomic.AtomicReference;
import java.time.format.DateTimeFormatter;
import java.util.AbstractMap;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.lang.Nullable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@Service
public class MainServiceImpl implements MainService {

    private static final String CHANNEL_MARKET_INDEX = "market-index";
    private static final String CHANNEL_CATEGORIES = "categories";

    private final MainStockQueryRepository queryRepository;
    private final MainCacheRepository cacheRepository;
    private final WatchlistRepository watchlistRepository;
    private final PipelineSignalRepository pipelineSignalRepository;
    private final SseManager sseManager;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    private final String naverKospiUrl;
    private final String naverKosdaqUrl;
    private final String naverFxUrl;

    /** 마지막 PORTFOLIO_DONE 신호 처리 시각 (재기동 시 당일 00:00 초기화) */
    private final AtomicReference<OffsetDateTime> lastPortfolioDoneAt =
        new AtomicReference<>(LocalDate.now(ZoneId.of("Asia/Seoul"))
            .atStartOfDay(ZoneId.of("Asia/Seoul")).toOffsetDateTime());

    public MainServiceImpl(
        MainStockQueryRepository queryRepository,
        MainCacheRepository cacheRepository,
        WatchlistRepository watchlistRepository,
        PipelineSignalRepository pipelineSignalRepository,
        SseManager sseManager,
        ObjectMapper objectMapper,
        @Value("${main.naver.kospi-url:}") String naverKospiUrl,
        @Value("${main.naver.kosdaq-url:}") String naverKosdaqUrl,
        @Value("${main.naver.fx-url:}") String naverFxUrl
    ) {
        this.queryRepository = queryRepository;
        this.cacheRepository = cacheRepository;
        this.watchlistRepository = watchlistRepository;
        this.pipelineSignalRepository = pipelineSignalRepository;
        this.sseManager = sseManager;
        this.objectMapper = objectMapper;
        this.naverKospiUrl = defaultString(naverKospiUrl);
        this.naverKosdaqUrl = defaultString(naverKosdaqUrl);
        this.naverFxUrl = defaultString(naverFxUrl);

        // 외부 API 호출 시 연결 5초, 읽기 5초 timeout 설정
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder()
            .requestFactory(requestFactory)
            .build();
    }

    // ── REST GET 메서드 ──

    /** 추천 종목 TOP10 조회 (캐시 우선, 미스 시 DB 조회 후 관심종목 여부 매핑) */
    @Override
    @Transactional(readOnly = true)
    public TopStocksResponse getTopStocks(Long userId) {
        TopStocksResponse data = cacheRepository.getTopStocks()
            .orElseGet(() -> {
                List<TopStockItemResponse> items = queryRepository.getTopTenStocksToday();
                TopStocksResponse fresh = new TopStocksResponse(items);
                cacheRepository.saveTopStocks(fresh);
                return fresh;
            });
        return applyWatchlistToTopStocks(data, userId);
    }

    /** 시장 지수 SSE 스트림 등록 및 현재 캐시 즉시 전송 (캐시 미스 시 기본값 전송) */
    @Override
    public SseEmitter streamMarketIndex() {
        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);
        emitter.onCompletion(() -> sseManager.removeEmitter(CHANNEL_MARKET_INDEX, emitter));
        emitter.onTimeout(() -> sseManager.removeEmitter(CHANNEL_MARKET_INDEX, emitter));
        emitter.onError(ex -> sseManager.removeEmitter(CHANNEL_MARKET_INDEX, emitter));
        sseManager.addEmitter(CHANNEL_MARKET_INDEX, emitter);
        MarketIndexResponse data = cacheRepository.getMarketIndex()
            .orElseGet(() -> {
                MarketIndexResponse fresh = fetchMarketIndex();
                if (fresh != null) {
                    cacheRepository.saveMarketIndex(fresh);
                    return fresh;
                }
                return defaultMarketIndex();
            });
        sendInitial(emitter, data);
        return emitter;
    }

    /** 카테고리별 종목 SSE 스트림 등록 및 현재 캐시 즉시 전송 (캐시 미스 시 DB 조회) */
    @Override
    public SseEmitter streamCategories() {
        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);
        emitter.onCompletion(() -> sseManager.removeEmitter(CHANNEL_CATEGORIES, emitter));
        emitter.onTimeout(() -> sseManager.removeEmitter(CHANNEL_CATEGORIES, emitter));
        emitter.onError(ex -> sseManager.removeEmitter(CHANNEL_CATEGORIES, emitter));
        sseManager.addEmitter(CHANNEL_CATEGORIES, emitter);
        CategoryStocksResponse data = cacheRepository.getCategories()
            .orElseGet(() -> {
                CategoryStocksResponse fresh = buildCategories();
                cacheRepository.saveCategories(fresh);
                return fresh;
            });
        sendInitial(emitter, data);
        return emitter;
    }

    /** 당일 매수/매도 상위 3종목 조회 (캐시 우선, 미스 시 DB 조회 후 관심종목 여부 매핑) */
    @Override
    @Transactional(readOnly = true)
    public NewSignalsResponse getNewSignals(Long userId) {
        NewSignalsResponse data = cacheRepository.getNewSignals()
            .orElseGet(() -> {
                NewSignalsResponse fresh = buildNewSignals();
                cacheRepository.saveNewSignals(fresh);
                return fresh;
            });
        return applyWatchlistToNewSignals(data, userId);
    }

    // ── @Scheduled 갱신 메서드 ──

    /**
     * PORTFOLIO_DONE 신호 감지 시 추천 종목 TOP10 + 매수/매도 신호 일괄 갱신.
     * 18:00~익일 09:00 사이 5분마다 폴링하며, 신호 감지 시 1회 갱신 후 다음 날까지 휴면.
     */
    @Scheduled(fixedRate = 300_000, initialDelay = 5_000)
    public void refreshOnPortfolioDone() {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        LocalTime currentTime = now.toLocalTime();

        // 오전 9시 ~ 오후 6시 사이에는 폴링하지 않음
        if (!currentTime.isBefore(LocalTime.of(9, 0)) && currentTime.isBefore(LocalTime.of(18, 0))) {
            return;
        }

        OffsetDateTime since = lastPortfolioDoneAt.get();
        boolean hasSignal = pipelineSignalRepository.existsPortfolioDoneSignalSince(since);

        if (!hasSignal) {
            return;
        }

        try {
            // 추천 종목 TOP10 갱신
            List<TopStockItemResponse> items = queryRepository.getTopTenStocksToday();
            TopStocksResponse topStocksData = new TopStocksResponse(items);
            cacheRepository.saveTopStocks(topStocksData);
            log.info("PORTFOLIO_DONE 감지 → 추천 종목 TOP10 갱신 완료: {}건", items.size());

            // 매수/매도 신호 갱신
            NewSignalsResponse signalsData = buildNewSignals();
            cacheRepository.saveNewSignals(signalsData);
            log.info("PORTFOLIO_DONE 감지 → 매수/매도 신호 갱신 완료");

            lastPortfolioDoneAt.set(now.toOffsetDateTime());
        } catch (Exception e) {
            log.error("PORTFOLIO_DONE 신호 처리 실패", e);
        }
    }

    /**
     * 장중 1분마다 추천 종목/매수매도 신호의 가격·변동률을 분봉 기반으로 갱신.
     * 주의: refreshOnPortfolioDone과 시간대가 겹치지 않는 전제 (장중 08:50~15:40 vs 18:00~09:00)
     */
    @Scheduled(fixedRate = 60_000, initialDelay = 10_000)
    public void refreshPrices() {
        if (!isMarketOpen()) {
            return;
        }
        try {
            // 추천 종목 TOP10 가격 갱신
            cacheRepository.getTopStocks().ifPresent(cached -> {
                List<Long> stockIds = cached.stocks().stream()
                    .map(TopStockItemResponse::stockId).toList();
                Map<Long, float[]> prices = queryRepository.getLatestPrices(stockIds);
                if (prices.isEmpty()) {
                    return;
                }
                List<TopStockItemResponse> updated = cached.stocks().stream()
                    .map(item -> {
                        float[] pf = prices.get(item.stockId());
                        if (pf == null) {
                            return item;
                        }
                        return new TopStockItemResponse(
                            item.rank(), item.stockId(), item.name(),
                            (int) pf[0], pf[1],
                            item.signal(), item.confidence(), item.isWatchlisted()
                        );
                    }).toList();
                cacheRepository.saveTopStocks(new TopStocksResponse(updated));
            });

            // 매수/매도 신호 가격 갱신
            cacheRepository.getNewSignals().ifPresent(cached -> {
                List<Long> buyIds = cached.buy().stream()
                    .map(NewSignalItemResponse::stockId).toList();
                List<Long> sellIds = cached.sell().stream()
                    .map(NewSignalItemResponse::stockId).toList();
                List<Long> allIds = new ArrayList<>(buyIds);
                allIds.addAll(sellIds);
                Map<Long, float[]> prices = queryRepository.getLatestPrices(allIds);
                if (prices.isEmpty()) {
                    return;
                }
                List<NewSignalItemResponse> updatedBuy = mapSignalPrices(cached.buy(), prices);
                List<NewSignalItemResponse> updatedSell = mapSignalPrices(cached.sell(), prices);
                cacheRepository.saveNewSignals(new NewSignalsResponse(updatedBuy, updatedSell));
            });

            log.debug("장중 가격 갱신 완료");
        } catch (Exception e) {
            log.error("장중 가격 갱신 실패", e);
        }
    }

    /** 매수/매도 신호 항목에 최신 가격 매핑 */
    private List<NewSignalItemResponse> mapSignalPrices(
            List<NewSignalItemResponse> items, Map<Long, float[]> prices) {
        return items.stream()
            .map(item -> {
                float[] pf = prices.get(item.stockId());
                if (pf == null) {
                    return item;
                }
                return new NewSignalItemResponse(
                    item.stockId(), item.ticker(), item.name(),
                    item.confidence(), (int) pf[0], pf[1],
                    item.isWatchlisted()
                );
            }).toList();
    }

    /** 카테고리별 등락률 대표 종목 갱신 → Redis 저장 → SSE broadcast */
    @Scheduled(fixedRate = 60_000, initialDelay = 10_000)
    public void refreshCategories() {
        try {
            CategoryStocksResponse data = buildCategories();
            cacheRepository.saveCategories(data);
            sseManager.broadcast(CHANNEL_CATEGORIES, data);
            log.debug("카테고리별 종목 갱신 완료");
        } catch (Exception e) {
            log.error("카테고리별 종목 갱신 실패", e);
        }
    }

    /** 코스피/코스닥/환율 지수 갱신 → Redis 저장 → SSE broadcast (장 시간에만 호출, 실패 시 이전 캐시 유지) */
    @Scheduled(fixedRate = 60_000, initialDelay = 15_000)
    public void refreshMarketIndex() {
        if (!isMarketOpen()) {
            return;
        }
        try {
            MarketIndexResponse data = fetchMarketIndex();
            if (data == null) {
                return;
            }
            cacheRepository.saveMarketIndex(data);
            sseManager.broadcast(CHANNEL_MARKET_INDEX, data);
            log.debug("시장 지수 갱신 완료");
        } catch (Exception e) {
            log.error("시장 지수 갱신 실패", e);
        }
    }

    /** KST 기준 장 운영 시간(08:50~15:40) 여부 확인 (여유 10분 포함) */
    private boolean isMarketOpen() {
        LocalTime now = LocalTime.now(ZoneId.of("Asia/Seoul"));
        return !now.isBefore(LocalTime.of(8, 50)) && !now.isAfter(LocalTime.of(15, 40));
    }


    // ── private: 데이터 조립 ──

    private NewSignalsResponse buildNewSignals() {
        List<NewSignalItemResponse> buy = queryRepository.getTodayBuySignals();
        List<NewSignalItemResponse> sell = queryRepository.getTodaySellSignals();
        return new NewSignalsResponse(buy, sell);
    }

    private CategoryStocksResponse buildCategories() {
        List<Object[]> raw = queryRepository.getCategoryStocksRaw();

        // category별 그룹핑 → |fluctuation_rate| 상위 2개씩 추출
        Map<String, List<CategoryStockItemResponse>> grouped = raw.stream()
            .map(row -> new AbstractMap.SimpleEntry<>(
                (String) row[0],
                new CategoryStockItemResponse(
                    (String) row[1],
                    ((Number) row[2]).intValue(),
                    toFloat(row[3])
                )
            ))
            .collect(Collectors.groupingBy(
                AbstractMap.SimpleEntry::getKey,
                Collectors.mapping(
                    AbstractMap.SimpleEntry::getValue,
                    Collectors.toList()
                )
            ));

        List<CategoryItemResponse> categories = grouped.entrySet().stream()
            .map(entry -> {
                List<CategoryStockItemResponse> top2 = entry.getValue().stream()
                    .sorted(Comparator.comparing(
                        (CategoryStockItemResponse s) -> Math.abs(s.fluctuationRate())
                    ).reversed())
                    .limit(2)
                    .toList();
                return new CategoryItemResponse(entry.getKey(), top2);
            })
            .toList();

        return new CategoryStocksResponse(categories);
    }

    // ── private: 네이버 금융 API 호출 ──

    /** 네이버 금융 API 3건 호출, URL 미설정 또는 실패 시 null 반환 (이전 캐시 유지) */
    private MarketIndexResponse fetchMarketIndex() {
        if (naverKospiUrl.isBlank() || naverKosdaqUrl.isBlank() || naverFxUrl.isBlank()) {
            log.warn("네이버 금융 API URL 미설정 → 시장 지수 조회 생략");
            return null;
        }
        MarketIndexItemResponse kospi = fetchNaverIndex(naverKospiUrl);
        MarketIndexItemResponse kosdaq = fetchNaverIndex(naverKosdaqUrl);
        MarketIndexItemResponse usdKrw = fetchNaverFx();

        if (kospi == null || kosdaq == null || usdKrw == null) {
            log.warn("시장 지수 일부 조회 실패 → 이전 캐시 유지");
            return null;
        }

        String baseTime = LocalDateTime.now()
            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        return new MarketIndexResponse(kospi, kosdaq, usdKrw, baseTime);
    }

    /** 네이버 국내 지수 API 호출 (KOSPI/KOSDAQ), 실패 시 null 반환 */
    private MarketIndexItemResponse fetchNaverIndex(String url) {
        try {
            String body = restClient.get().uri(url).retrieve().body(String.class);
            JsonNode root = objectMapper.readTree(body);

            // 네이버 polling API 응답 구조에서 현재가와 등락률 추출
            JsonNode datas = root.path("datas").path(0);
            if (datas.isMissingNode() || datas.isNull()) {
                datas = root.path("result");
            }
            if (datas.isMissingNode() || datas.isNull() || datas.isEmpty()) {
                log.warn("네이버 지수 API 응답에 시세 데이터가 없습니다. url={}", url);
                return null;
            }

            Float value = extractNullableFloat(datas, "nv", "closePrice", "now");
            Float changeRate = extractNullableFloat(datas, "cr", "fluctuationsRatio", "changeRate");
            if (value == null || changeRate == null) {
                log.warn("네이버 지수 API 응답 파싱 실패. url={}", url);
                return null;
            }

            return new MarketIndexItemResponse(value, changeRate);
        } catch (Exception e) {
            log.warn("네이버 지수 API 호출 실패: url={}", url, e);
            return null;
        }
    }

    /** 네이버 환율 API 호출 (USD/KRW), 실패 시 null 반환 */
    private MarketIndexItemResponse fetchNaverFx() {
        try {
            String body = restClient.get().uri(naverFxUrl).retrieve().body(String.class);
            JsonNode root = objectMapper.readTree(body);

            JsonNode result = root.path("result");
            if (result.isMissingNode() || result.isNull() || result.isEmpty()) {
                result = root;
            }

            Float value = extractNullableFloat(result, "closePrice", "basePrice", "now");
            Float changeRate = extractNullableFloat(result, "fluctuationsRatio", "changeRate", "cr");
            if (value == null || changeRate == null) {
                log.warn("네이버 환율 API 응답 파싱 실패");
                return null;
            }

            return new MarketIndexItemResponse(value, changeRate);
        } catch (Exception e) {
            log.warn("네이버 환율 API 호출 실패", e);
            return null;
        }
    }

    // ── private: 유틸리티 ──

    /** JSON 노드에서 여러 필드명을 시도하여 float 추출 */
    private MarketIndexResponse defaultMarketIndex() {
        return new MarketIndexResponse(
            new MarketIndexItemResponse(0f, 0f),
            new MarketIndexItemResponse(0f, 0f),
            new MarketIndexItemResponse(0f, 0f),
            ""
        );
    }

    private String defaultString(String value) {
        return value == null ? "" : value;
    }

    @Nullable
    private Float extractNullableFloat(JsonNode node, String... fieldNames) {
        for (String name : fieldNames) {
            JsonNode field = node.path(name);
            if (!field.isMissingNode() && !field.isNull()) {
                String text = field.asText().replace(",", "").replace("%", "");
                try {
                    return Float.parseFloat(text);
                } catch (NumberFormatException ignored) {
                    // 다음 필드명 시도
                }
            }
        }
        return null;
    }

    /** SSE 초기 데이터 전송 (연결 즉시 현재 데이터 전달) */
    private void sendInitial(SseEmitter emitter, Object data) {
        sseManager.sendToEmitter(emitter, data);
    }

    private float toFloat(Object value) {
        if (value == null) {
            return 0f;
        }
        return ((Number) value).floatValue();
    }

    /** 사용자의 관심종목 ID Set 조회 (비로그인 시 빈 Set) */
    private Set<Long> getWatchlistStockIds(Long userId) {
        if (userId == null) {
            return Collections.emptySet();
        }
        return new HashSet<>(watchlistRepository.findStockIdsByUserId(userId));
    }

    /** 추천 종목 TOP10에 관심종목 여부 매핑 */
    private TopStocksResponse applyWatchlistToTopStocks(TopStocksResponse data, Long userId) {
        Set<Long> watchlistIds = getWatchlistStockIds(userId);
        if (watchlistIds.isEmpty()) {
            return data;
        }
        List<TopStockItemResponse> mapped = data.stocks().stream()
            .map(item -> new TopStockItemResponse(
                item.rank(), item.stockId(), item.name(), item.price(),
                item.fluctuationRate(), item.signal(), item.confidence(),
                watchlistIds.contains(item.stockId())
            ))
            .toList();
        return new TopStocksResponse(mapped);
    }

    /** 매수/매도 신호에 관심종목 여부 매핑 */
    private NewSignalsResponse applyWatchlistToNewSignals(NewSignalsResponse data, Long userId) {
        Set<Long> watchlistIds = getWatchlistStockIds(userId);
        if (watchlistIds.isEmpty()) {
            return data;
        }
        List<NewSignalItemResponse> buy = data.buy().stream()
            .map(item -> new NewSignalItemResponse(
                item.stockId(), item.ticker(), item.name(),
                item.confidence(), item.price(), item.fluctuationRate(),
                watchlistIds.contains(item.stockId())
            ))
            .toList();
        List<NewSignalItemResponse> sell = data.sell().stream()
            .map(item -> new NewSignalItemResponse(
                item.stockId(), item.ticker(), item.name(),
                item.confidence(), item.price(), item.fluctuationRate(),
                watchlistIds.contains(item.stockId())
            ))
            .toList();
        return new NewSignalsResponse(buy, sell);
    }
}
