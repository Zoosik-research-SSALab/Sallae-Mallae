package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.TrendingStockItemResponse;
import com.sallaemallae.backend.domain.stock.dto.TrendingStocksResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.repository.TrendingCacheRepository;
import com.sallaemallae.backend.global.sse.SseManager;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 실시간 인기 검색 종목 TOP5 서비스.
 * Redis Sorted Set에서 검색 횟수 기반 상위 5개 종목을 조회하여 SSE로 스트리밍.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TrendingStockService {

    private static final String CHANNEL = "trending-stocks";
    private static final int TOP_LIMIT = 5;

    private final TrendingCacheRepository trendingCacheRepository;
    private final StockRepository stockRepository;
    private final SseManager sseManager;

    /** 종목 ID → Stock 매핑 캐시 (서버 기동 시 1회 로드, 종목 정보는 거의 변경되지 않음) */
    private final Map<Long, Stock> stockCache = new ConcurrentHashMap<>();

    @PostConstruct
    void initStockCache() {
        stockRepository.findAll().forEach(stock -> stockCache.put(stock.getId(), stock));
        log.info("종목 캐시 초기화 완료: {}건", stockCache.size());
    }

    /** SSE 스트림 등록 및 현재 데이터 즉시 전송 */
    public SseEmitter streamTrending() {
        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);
        sseManager.addEmitter(CHANNEL, emitter);
        TrendingStocksResponse data = buildTrendingStocks();
        sseManager.sendToEmitter(emitter, data);
        return emitter;
    }

    /** 검색 시 호출 — 종목 검색 횟수 증가 */
    public void incrementSearchCount(Long stockId) {
        if (stockId != null) {
            trendingCacheRepository.incrementSearchCount(stockId);
        }
    }

    /** 1분마다 인기 검색 종목 갱신 → SSE broadcast */
    @Scheduled(fixedRate = 60_000, initialDelay = 5_000)
    public void refreshTrending() {
        try {
            TrendingStocksResponse data = buildTrendingStocks();
            sseManager.broadcast(CHANNEL, data);
            log.debug("인기 검색 종목 갱신 완료: {}건", data.stocks().size());
        } catch (Exception e) {
            log.error("인기 검색 종목 갱신 실패", e);
        }
    }

    /** Redis에서 TOP5 종목 ID 조회 → 메모리 캐시에서 종목 정보 매핑 */
    private TrendingStocksResponse buildTrendingStocks() {
        Set<String> topStockIds = trendingCacheRepository.getTopStockIds(TOP_LIMIT);
        if (topStockIds.isEmpty()) {
            return new TrendingStocksResponse(List.of());
        }

        List<TrendingStockItemResponse> items = new ArrayList<>();
        int rank = 1;
        for (String idStr : topStockIds) {
            Long id = parseLong(idStr);
            if (id == null) {
                continue;
            }
            Stock stock = stockCache.get(id);
            if (stock != null) {
                items.add(new TrendingStockItemResponse(rank++, stock.getId(), stock.getName()));
            }
        }
        return new TrendingStocksResponse(items);
    }

    private Long parseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            log.warn("인기 검색 종목 ID 파싱 실패: {}", value);
            return null;
        }
    }
}
