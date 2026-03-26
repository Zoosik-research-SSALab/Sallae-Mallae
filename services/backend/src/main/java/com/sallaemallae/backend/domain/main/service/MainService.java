package com.sallaemallae.backend.domain.main.service;

import com.sallaemallae.backend.domain.main.dto.NewSignalsResponse;
import com.sallaemallae.backend.domain.main.dto.TopStocksResponse;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface MainService {

    /** 오늘의 추천 종목 TOP10 조회 (관심종목 여부 포함) */
    TopStocksResponse getTopStocks(Long userId);

    /** 코스피/코스닥/환율 실시간 지수 SSE 스트림 등록 */
    SseEmitter streamMarketIndex();

    /** 카테고리별 등락률 대표 종목 SSE 스트림 등록 */
    SseEmitter streamCategories();

    /** 당일 매수 상위 3 + 매도 상위 3 종목 조회 (관심종목 여부 포함) */
    NewSignalsResponse getNewSignals(Long userId);
}
