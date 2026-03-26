package com.sallaemallae.backend.domain.stock.service;

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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 실시간 인기 검색 종목 TOP5 서비스.
 * Redis Sorted Set에서 검색 횟수 기반 상위 5개 종목을 조회하여 SSE로 스트리밍.
 * 응답 캐시(Redis)를 두어 SSE 연결 시 즉시 전송, 1분마다 갱신.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TrendingStockService {

    private static final String CHANNEL = "trending-stocks";
    private static final int TOP_LIMIT = 5;

    private final TrendingCacheRepository trendingCacheRepository;
    private final TrendingStockCacheRepository trendingStockCacheRepository;
    private final StockRepository stockRepository;
    private final StockPriceDailyRepository stockPriceDailyRepository;
    private final StockIconUrlResolver stockIconUrlResolver;
    private final SseManager sseManager;

    /** SSE 스트림 등록 및 캐시에서 즉시 전송 (캐시 미스 시 DB 조회 후 캐시 저장) */
    public SseEmitter streamTrending() {
        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);
        emitter.onCompletion(() -> sseManager.removeEmitter(CHANNEL, emitter));
        emitter.onTimeout(() -> sseManager.removeEmitter(CHANNEL, emitter));
        emitter.onError(ex -> sseManager.removeEmitter(CHANNEL, emitter));
        sseManager.addEmitter(CHANNEL, emitter);

        TrendingStocksResponse data = trendingStockCacheRepository.getTrending()
            .orElseGet(() -> {
                TrendingStocksResponse fresh = buildTrendingStocks();
                trendingStockCacheRepository.saveTrending(fresh);
                return fresh;
            });
        sseManager.sendToEmitter(emitter, data);
        return emitter;
    }

    /** 검색 시 호출 — 종목 검색 횟수 증가 */
    public void incrementSearchCount(Long stockId) {
        if (stockId != null) {
            trendingCacheRepository.incrementSearchCount(stockId);
        }
    }

    /** 1분마다 인기 검색 종목 갱신 → 캐시 저장 → SSE broadcast (구독 클라이언트가 있을 때만 broadcast) */
    @Scheduled(fixedRate = 60_000, initialDelay = 5_000)
    public void refreshTrending() {
        try {
            TrendingStocksResponse data = buildTrendingStocks();
            trendingStockCacheRepository.saveTrending(data);

            if (sseManager.hasEmitters(CHANNEL)) {
                sseManager.broadcast(CHANNEL, data);
            }
            log.debug("인기 검색 종목 갱신 완료: {}건", data.stocks().size());
        } catch (Exception e) {
            log.error("인기 검색 종목 갱신 실패", e);
        }
    }

    /** Redis에서 TOP5 종목 ID 조회 → DB에서 종목 정보 + 최신 가격 매핑 */
    private TrendingStocksResponse buildTrendingStocks() {
        Set<String> topStockIds = trendingCacheRepository.getTopStockIds(TOP_LIMIT);
        if (topStockIds.isEmpty()) {
            return new TrendingStocksResponse(List.of());
        }

        List<Long> ids = topStockIds.stream()
            .map(this::parseLong)
            .filter(Objects::nonNull)
            .toList();

        Map<Long, Stock> stockMap = stockRepository.findAllByIdInAndIsActiveTrue(ids).stream()
            .collect(Collectors.toMap(Stock::getId, Function.identity()));

        // 최신 일봉 가격 조회
        List<Long> activeIds = ids.stream().filter(stockMap::containsKey).toList();
        Map<Long, StockPriceDaily> priceMap = activeIds.isEmpty()
            ? Map.of()
            : stockPriceDailyRepository.findLatestByStockIdIn(activeIds).stream()
                .collect(Collectors.toMap(StockPriceDaily::getStockId, Function.identity(), (a, b) -> a));

        List<TrendingStockItemResponse> items = new ArrayList<>();
        int rank = 1;
        for (Long id : ids) {
            Stock stock = stockMap.get(id);
            if (stock != null) {
                StockPriceDaily price = priceMap.get(id);
                items.add(new TrendingStockItemResponse(
                    rank++,
                    stock.getId(),
                    stock.getName(),
                    price != null ? price.getClosePrice() : null,
                    price != null ? price.getFluctuationRate() : null,
                    stockIconUrlResolver.resolve(stock.getIconUrl())
                ));
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
