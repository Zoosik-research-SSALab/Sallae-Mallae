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
import com.sallaemallae.backend.global.sse.SseManager;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;

import java.time.format.DateTimeFormatter;
import java.util.AbstractMap;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
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

    private static final String CHANNEL_TOP_STOCKS = "top-stocks";
    private static final String CHANNEL_MARKET_INDEX = "market-index";
    private static final String CHANNEL_CATEGORIES = "categories";

    private final MainStockQueryRepository queryRepository;
    private final MainCacheRepository cacheRepository;
    private final SseManager sseManager;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    private final String naverKospiUrl;
    private final String naverKosdaqUrl;
    private final String naverFxUrl;

    public MainServiceImpl(
        MainStockQueryRepository queryRepository,
        MainCacheRepository cacheRepository,
        SseManager sseManager,
        ObjectMapper objectMapper,
        @Value("${main.naver.kospi-url:}") String naverKospiUrl,
        @Value("${main.naver.kosdaq-url:}") String naverKosdaqUrl,
        @Value("${main.naver.fx-url:}") String naverFxUrl
    ) {
        this.queryRepository = queryRepository;
        this.cacheRepository = cacheRepository;
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

    // ── SSE 스트림 등록 메서드 ──

    /** 추천 종목 TOP10 SSE 스트림 등록 및 현재 캐시 즉시 전송 (캐시 미스 시 DB 조회) */
    @Override
    public SseEmitter streamTopStocks() {
        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);
        sseManager.addEmitter(CHANNEL_TOP_STOCKS, emitter);
        TopStocksResponse data = cacheRepository.getTopStocks()
            .orElseGet(() -> {
                List<TopStockItemResponse> items = queryRepository.getTopTenStocksToday();
                TopStocksResponse fresh = new TopStocksResponse(items);
                cacheRepository.saveTopStocks(fresh);
                return fresh;
            });
        sendInitial(emitter, data);
        return emitter;
    }

    /** 시장 지수 SSE 스트림 등록 및 현재 캐시 즉시 전송 (캐시 미스 시 기본값 전송) */
    @Override
    public SseEmitter streamMarketIndex() {
        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);
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

    // ── REST GET 메서드 ──

    /** 당일 매수/매도 상위 3종목 조회 (캐시 우선, 미스 시 DB 조회) */
    @Override
    @Transactional(readOnly = true)
    public NewSignalsResponse getNewSignals() {
        return cacheRepository.getNewSignals()
            .orElseGet(() -> {
                NewSignalsResponse data = buildNewSignals();
                cacheRepository.saveNewSignals(data);
                return data;
            });
    }

    // ── @Scheduled 갱신 메서드 (1분마다 실행) ──

    /** 추천 종목 TOP10 갱신 → Redis 저장 → SSE broadcast */
    @Scheduled(fixedRate = 60_000, initialDelay = 5_000)
    public void refreshTopStocks() {
        try {
            List<TopStockItemResponse> items = queryRepository.getTopTenStocksToday();
            TopStocksResponse data = new TopStocksResponse(items);
            cacheRepository.saveTopStocks(data);
            sseManager.broadcast(CHANNEL_TOP_STOCKS, data);
            log.debug("추천 종목 TOP10 갱신 완료: {}건", items.size());
        } catch (Exception e) {
            log.error("추천 종목 TOP10 갱신 실패", e);
        }
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

    /** 코스피/코스닥/환율 지수 갱신 → Redis 저장 → SSE broadcast (실패 시 이전 캐시 유지) */
    @Scheduled(fixedRate = 60_000, initialDelay = 15_000)
    public void refreshMarketIndex() {
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

    /** 매수/매도 신호 갱신 (캐시만 갱신, SSE 없음) */
    @Scheduled(fixedRate = 60_000, initialDelay = 20_000)
    public void refreshNewSignals() {
        try {
            NewSignalsResponse data = buildNewSignals();
            cacheRepository.saveNewSignals(data);
            log.debug("매수/매도 신호 갱신 완료");
        } catch (Exception e) {
            log.error("매수/매도 신호 갱신 실패", e);
        }
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
}
