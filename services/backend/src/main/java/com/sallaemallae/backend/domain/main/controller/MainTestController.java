package com.sallaemallae.backend.domain.main.controller;

import com.sallaemallae.backend.domain.main.dto.CategoryItemResponse;
import com.sallaemallae.backend.domain.main.dto.CategoryStockItemResponse;
import com.sallaemallae.backend.domain.main.dto.CategoryStocksResponse;

import com.sallaemallae.backend.domain.main.dto.NewSignalItemResponse;
import com.sallaemallae.backend.domain.main.dto.NewSignalsResponse;
import com.sallaemallae.backend.domain.main.dto.TopStockItemResponse;
import com.sallaemallae.backend.domain.main.dto.TopStocksResponse;
import com.sallaemallae.backend.global.response.ApiResponse;
import com.sallaemallae.backend.domain.main.service.MainService;
import com.sallaemallae.backend.global.sse.SseManager;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 프론트엔드 연동 테스트용 더미 데이터 컨트롤러
 * - DB 조회 없이 하드코딩된 데이터를 반환합니다.
 * - 1분마다 두 세트의 데이터를 교대로 SSE broadcast하여 실시간 갱신을 테스트할 수 있습니다.
 * - 프론트 확인 완료 후 이 파일을 삭제하면 됩니다.
 */
@Slf4j
@Tag(name = "메인 (테스트)", description = "메인 페이지 더미 데이터 API")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MainTestController {

    private static final String CH_TOP_STOCKS = "test-top-stocks";

    private static final String CH_CATEGORIES = "test-categories";

    private final MainService mainService;
    private final SseManager sseManager;

    /** A/B 데이터 세트 토글 (true=A, false=B) */
    private final AtomicBoolean useSetA = new AtomicBoolean(true);

    // ── SSE 엔드포인트 ──

    /** 추천 종목 TOP10 더미 데이터 (SSE) */
    @Operation(summary = "[테스트] 추천 종목 TOP10 (SSE)")
    @GetMapping(value = "/stream/main/test/top-stocks", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamTopStocks() {
        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);
        sseManager.addEmitter(CH_TOP_STOCKS, emitter);
        sseManager.sendToEmitter(emitter, buildTopStocks(useSetA.get()));
        return emitter;
    }

    /** 시장 지수 (SSE) - 실제 MainService 호출 (DB 불필요, 네이버 API + Redis 캐시) */
    @Operation(summary = "[테스트] 시장 지수 (SSE) - 실제 서비스 연동")
    @GetMapping(value = "/stream/main/test/market-index", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMarketIndex() {
        return mainService.streamMarketIndex();
    }

    /** 카테고리별 대표 종목 더미 데이터 (SSE) */
    @Operation(summary = "[테스트] 카테고리별 대표 종목 (SSE)")
    @GetMapping(value = "/stream/main/test/categories", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamCategories() {
        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);
        sseManager.addEmitter(CH_CATEGORIES, emitter);
        sseManager.sendToEmitter(emitter, buildCategories(useSetA.get()));
        return emitter;
    }

    // ── REST 엔드포인트 ──

    /** 당일 매수/매도 신호 더미 데이터 (REST) */
    @Operation(summary = "[테스트] 당일 매수/매도 신호")
    @GetMapping("/main/test/new-signals")
    public ApiResponse<NewSignalsResponse> getNewSignals() {
        List<NewSignalItemResponse> buy = List.of(
            new NewSignalItemResponse(1L, "005930", "삼성전자", 92, 72500, 2.1f),
            new NewSignalItemResponse(2L, "000660", "SK하이닉스", 88, 185000, 3.5f),
            new NewSignalItemResponse(4L, "005380", "현대자동차", 82, 245000, 1.8f)
        );
        List<NewSignalItemResponse> sell = List.of(
            new NewSignalItemResponse(3L, "373220", "LG에너지솔루션", 85, 385000, -1.2f),
            new NewSignalItemResponse(5L, "035420", "NAVER", 80, 215000, -0.7f),
            new NewSignalItemResponse(7L, "005490", "POSCO홀딩스", 76, 312000, -2.3f)
        );
        return ApiResponse.success(new NewSignalsResponse(buy, sell));
    }

    // ── 1분마다 A/B 데이터 교대 broadcast ──

    /** 1분마다 데이터 세트를 교대(A↔B)하여 모든 테스트 SSE 채널에 broadcast */
    @Scheduled(fixedRate = 60_000, initialDelay = 60_000)
    public void broadcastAlternatingData() {
        boolean setA = useSetA.getAndSet(!useSetA.get());
        boolean nextSet = !setA;

        sseManager.broadcast(CH_TOP_STOCKS, buildTopStocks(nextSet));
        sseManager.broadcast(CH_CATEGORIES, buildCategories(nextSet));
        log.debug("테스트 SSE broadcast: 데이터 세트 {}", nextSet ? "A" : "B");
    }

    // ── 데이터 세트 A/B 빌더 ──

    private TopStocksResponse buildTopStocks(boolean setA) {
        if (setA) {
            return new TopStocksResponse(List.of(
                new TopStockItemResponse(1, 1L, "삼성전자", 72500, 2.1f, "BUY", 92),
                new TopStockItemResponse(2, 2L, "SK하이닉스", 185000, 3.5f, "BUY", 88),
                new TopStockItemResponse(3, 3L, "LG에너지솔루션", 385000, -1.2f, "SELL", 85),
                new TopStockItemResponse(4, 4L, "현대자동차", 245000, 1.8f, "BUY", 82),
                new TopStockItemResponse(5, 5L, "NAVER", 215000, -0.7f, "SELL", 80),
                new TopStockItemResponse(6, 6L, "카카오", 48500, 1.5f, "BUY", 78),
                new TopStockItemResponse(7, 7L, "POSCO홀딩스", 312000, -2.3f, "SELL", 76),
                new TopStockItemResponse(8, 8L, "삼성바이오로직스", 825000, 0.9f, "BUY", 74),
                new TopStockItemResponse(9, 9L, "기아", 125000, 2.7f, "BUY", 72),
                new TopStockItemResponse(10, 10L, "셀트리온", 178000, -1.5f, "SELL", 70)
            ));
        }
        return new TopStocksResponse(List.of(
            new TopStockItemResponse(1, 11L, "현대모비스", 235000, 4.2f, "BUY", 95),
            new TopStockItemResponse(2, 12L, "KB금융", 68000, -1.8f, "SELL", 90),
            new TopStockItemResponse(3, 13L, "신한지주", 45000, 2.9f, "BUY", 87),
            new TopStockItemResponse(4, 14L, "한화에어로스페이스", 185000, 5.3f, "BUY", 84),
            new TopStockItemResponse(5, 15L, "HD현대중공업", 165000, -2.1f, "SELL", 81),
            new TopStockItemResponse(6, 16L, "크래프톤", 265000, 3.7f, "BUY", 79),
            new TopStockItemResponse(7, 17L, "두산에너빌리티", 18500, -1.4f, "SELL", 77),
            new TopStockItemResponse(8, 18L, "에코프로", 98000, 6.2f, "BUY", 75),
            new TopStockItemResponse(9, 19L, "HD한국조선해양", 145000, 4.8f, "BUY", 73),
            new TopStockItemResponse(10, 20L, "LG전자", 98000, -0.9f, "SELL", 71)
        ));
    }

    private CategoryStocksResponse buildCategories(boolean setA) {
        if (setA) {
            return new CategoryStocksResponse(List.of(
                category("에너지", stock("SK이노베이션", 125000, 3.2f), stock("S-Oil", 68500, -1.8f)),
                category("친환경 / 탄소", stock("에코프로", 98000, 5.1f), stock("에코프로비엠", 245000, -2.4f)),
                category("소재", stock("LG화학", 385000, 1.7f), stock("롯데케미칼", 95000, -3.1f)),
                category("반도체", stock("삼성전자", 72500, 2.1f), stock("SK하이닉스", 185000, 3.5f)),
                category("디스플레이", stock("LG디스플레이", 15200, -4.2f), stock("삼성SDI", 412000, 1.3f)),
                category("전자부품", stock("삼성전기", 152000, 2.8f), stock("LG이노텍", 285000, -1.1f)),
                category("IT플랫폼 / 소프트웨어", stock("NAVER", 215000, -0.7f), stock("카카오", 48500, 1.5f)),
                category("게임 / 디지털콘텐츠", stock("크래프톤", 265000, 4.3f), stock("엔씨소프트", 185000, -2.9f)),
                category("2차전지", stock("LG에너지솔루션", 385000, -1.2f), stock("삼성SDI", 412000, 1.3f)),
                category("스마트기기", stock("삼성전자", 72500, 2.1f), stock("LG전자", 98000, -0.5f)),
                category("기계 / 산업장비", stock("두산에너빌리티", 18500, 3.8f), stock("현대로템", 42000, -1.6f)),
                category("건설 / 인프라", stock("현대건설", 35000, 1.2f), stock("대우건설", 4200, -2.7f)),
                category("조선", stock("HD한국조선해양", 145000, 5.5f), stock("삼성중공업", 9800, 3.2f)),
                category("방산", stock("한화에어로스페이스", 185000, 4.1f), stock("LIG넥스원", 125000, 2.3f)),
                category("운송 / 물류", stock("대한항공", 25000, 1.9f), stock("HMM", 18500, -3.4f)),
                category("소비내구재", stock("LG전자", 98000, -0.5f), stock("삼성전자", 72500, 2.1f)),
                category("필수소비재", stock("CJ제일제당", 285000, 0.8f), stock("오뚜기", 425000, -0.3f)),
                category("패션 / 뷰티", stock("아모레퍼시픽", 125000, -2.1f), stock("LG생활건강", 385000, 1.4f)),
                category("유통 / 서비스", stock("신세계", 185000, 0.6f), stock("이마트", 78000, -1.9f)),
                category("금융 / 헬스케어", stock("KB금융", 68000, 1.7f), stock("삼성바이오로직스", 825000, 0.9f)),
                category("기타", stock("셀트리온", 178000, -1.5f), stock("한미약품", 285000, 2.2f))
            ));
        }
        return new CategoryStocksResponse(List.of(
            category("에너지", stock("SK이노베이션", 128000, -2.1f), stock("S-Oil", 70200, 2.5f)),
            category("친환경 / 탄소", stock("에코프로", 95000, -3.2f), stock("에코프로비엠", 250000, 4.1f)),
            category("소재", stock("LG화학", 390000, -0.8f), stock("롯데케미칼", 97000, 2.1f)),
            category("반도체", stock("삼성전자", 73500, -1.4f), stock("SK하이닉스", 188000, 1.6f)),
            category("디스플레이", stock("LG디스플레이", 15800, 3.9f), stock("삼성SDI", 408000, -1.0f)),
            category("전자부품", stock("삼성전기", 149000, -1.9f), stock("LG이노텍", 290000, 1.8f)),
            category("IT플랫폼 / 소프트웨어", stock("NAVER", 218000, 1.4f), stock("카카오", 47500, -2.1f)),
            category("게임 / 디지털콘텐츠", stock("크래프톤", 260000, -1.9f), stock("엔씨소프트", 190000, 2.7f)),
            category("2차전지", stock("LG에너지솔루션", 390000, 1.3f), stock("삼성SDI", 405000, -1.7f)),
            category("스마트기기", stock("삼성전자", 73500, -1.4f), stock("LG전자", 100000, 2.0f)),
            category("기계 / 산업장비", stock("두산에너빌리티", 19200, -3.8f), stock("현대로템", 43500, 3.6f)),
            category("건설 / 인프라", stock("현대건설", 36000, -1.4f), stock("대우건설", 4400, 4.8f)),
            category("조선", stock("HD한국조선해양", 142000, -2.1f), stock("삼성중공업", 10200, 4.1f)),
            category("방산", stock("한화에어로스페이스", 190000, 2.7f), stock("LIG넥스원", 122000, -2.4f)),
            category("운송 / 물류", stock("대한항공", 25800, -0.8f), stock("HMM", 19200, 3.8f)),
            category("소비내구재", stock("LG전자", 100000, 2.0f), stock("삼성전자", 73500, -1.4f)),
            category("필수소비재", stock("CJ제일제당", 282000, -1.1f), stock("오뚜기", 428000, 0.7f)),
            category("패션 / 뷰티", stock("아모레퍼시픽", 128000, 2.4f), stock("LG생활건강", 380000, -1.3f)),
            category("유통 / 서비스", stock("신세계", 182000, -1.6f), stock("이마트", 80000, 2.6f)),
            category("금융 / 헬스케어", stock("KB금융", 66500, -2.2f), stock("삼성바이오로직스", 830000, 0.6f)),
            category("기타", stock("셀트리온", 180000, 1.1f), stock("한미약품", 280000, -1.8f))
        ));
    }

    // ── 유틸리티 ──

    private CategoryItemResponse category(String name, CategoryStockItemResponse... stocks) {
        return new CategoryItemResponse(name, List.of(stocks));
    }

    private CategoryStockItemResponse stock(String name, int price, float fluctuationRate) {
        return new CategoryStockItemResponse(name, price, fluctuationRate);
    }
}
