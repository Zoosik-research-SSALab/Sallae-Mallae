package com.sallaemallae.backend.domain.main.controller;

import com.sallaemallae.backend.domain.main.dto.NewSignalsResponse;
import com.sallaemallae.backend.domain.main.service.MainService;
import com.sallaemallae.backend.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(name = "메인", description = "메인 페이지 API")
@RestController
@RequestMapping("/api/main")
@RequiredArgsConstructor
public class MainController {

    private final MainService mainService;

    /** FS-MAIN-001: 오늘의 추천 종목 TOP10 (SSE) */
    @Operation(summary = "추천 종목 TOP10 실시간 스트림", description = "오늘 날짜 기준 AI 추천 종목 상위 10개를 SSE로 스트리밍합니다.")
    @GetMapping(value = "/top-stocks", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamTopStocks() {
        return mainService.streamTopStocks();
    }

    /** FS-MAIN-002: 당일 매수 상위 3 + 매도 상위 3 종목 (REST GET) */
    @Operation(summary = "당일 매수/매도 신호 조회", description = "당일 매수 상위 3개 + 매도 상위 3개 종목을 반환합니다.")
    @GetMapping("/new-signals")
    public ApiResponse<NewSignalsResponse> getNewSignals() {
        return ApiResponse.success(mainService.getNewSignals());
    }

    /** FS-MAIN-003: 코스피/코스닥/환율 실시간 지수 (SSE) */
    @Operation(summary = "시장 지수 실시간 스트림", description = "코스피, 코스닥, USD/KRW 환율을 SSE로 스트리밍합니다.")
    @GetMapping(value = "/market-index", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMarketIndex() {
        return mainService.streamMarketIndex();
    }

    /** FS-MAIN-004: 카테고리별 등락률 절대값 큰 대표 종목 2개씩 (SSE) */
    @Operation(summary = "카테고리별 대표 종목 실시간 스트림", description = "카테고리별 등락률 절대값이 큰 대표 종목 2개씩을 SSE로 스트리밍합니다.")
    @GetMapping(value = "/categories", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamCategories() {
        return mainService.streamCategories();
    }
}
