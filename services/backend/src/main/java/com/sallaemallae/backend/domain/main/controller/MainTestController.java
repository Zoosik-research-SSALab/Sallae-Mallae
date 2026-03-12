package com.sallaemallae.backend.domain.main.controller;

import com.sallaemallae.backend.domain.main.dto.CategoryItemResponse;
import com.sallaemallae.backend.domain.main.dto.CategoryStockItemResponse;
import com.sallaemallae.backend.domain.main.dto.CategoryStocksResponse;
import com.sallaemallae.backend.domain.main.dto.MarketIndexItemResponse;
import com.sallaemallae.backend.domain.main.dto.MarketIndexResponse;
import com.sallaemallae.backend.domain.main.dto.NewSignalItemResponse;
import com.sallaemallae.backend.domain.main.dto.NewSignalsResponse;
import com.sallaemallae.backend.domain.main.dto.TopStockItemResponse;
import com.sallaemallae.backend.domain.main.dto.TopStocksResponse;
import com.sallaemallae.backend.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 프론트엔드 연동 테스트용 더미 데이터 컨트롤러
 * - DB 조회 없이 하드코딩된 데이터를 반환합니다.
 * - 프론트 확인 완료 후 이 파일을 삭제하면 됩니다.
 */
@Tag(name = "메인 (테스트)", description = "메인 페이지 더미 데이터 API")
@RestController
@RequestMapping("/api/main/test")
public class MainTestController {

    /** 추천 종목 TOP10 더미 데이터 */
    @Operation(summary = "[테스트] 추천 종목 TOP10")
    @GetMapping("/top-stocks")
    public ApiResponse<TopStocksResponse> getTopStocks() {
        List<TopStockItemResponse> stocks = List.of(
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
        );
        return ApiResponse.success(new TopStocksResponse(stocks));
    }

    /** 당일 매수/매도 신호 더미 데이터 */
    @Operation(summary = "[테스트] 당일 매수/매도 신호")
    @GetMapping("/new-signals")
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

    /** 시장 지수 더미 데이터 */
    @Operation(summary = "[테스트] 시장 지수")
    @GetMapping("/market-index")
    public ApiResponse<MarketIndexResponse> getMarketIndex() {
        String baseTime = LocalDateTime.now()
            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        MarketIndexResponse data = new MarketIndexResponse(
            new MarketIndexItemResponse(2687.45f, 1.23f),
            new MarketIndexItemResponse(872.31f, -0.58f),
            new MarketIndexItemResponse(1365.20f, 0.35f),
            baseTime
        );
        return ApiResponse.success(data);
    }

    /** 카테고리별 대표 종목 더미 데이터 (21개 카테고리, 각 2종목) */
    @Operation(summary = "[테스트] 카테고리별 대표 종목")
    @GetMapping("/categories")
    public ApiResponse<CategoryStocksResponse> getCategories() {
        List<CategoryItemResponse> categories = List.of(
            category("에너지",
                stock("SK이노베이션", 125000, 3.2f), stock("S-Oil", 68500, -1.8f)),
            category("친환경 / 탄소",
                stock("에코프로", 98000, 5.1f), stock("에코프로비엠", 245000, -2.4f)),
            category("소재",
                stock("LG화학", 385000, 1.7f), stock("롯데케미칼", 95000, -3.1f)),
            category("반도체",
                stock("삼성전자", 72500, 2.1f), stock("SK하이닉스", 185000, 3.5f)),
            category("디스플레이",
                stock("LG디스플레이", 15200, -4.2f), stock("삼성SDI", 412000, 1.3f)),
            category("전자부품",
                stock("삼성전기", 152000, 2.8f), stock("LG이노텍", 285000, -1.1f)),
            category("IT플랫폼 / 소프트웨어",
                stock("NAVER", 215000, -0.7f), stock("카카오", 48500, 1.5f)),
            category("게임 / 디지털콘텐츠",
                stock("크래프톤", 265000, 4.3f), stock("엔씨소프트", 185000, -2.9f)),
            category("2차전지",
                stock("LG에너지솔루션", 385000, -1.2f), stock("삼성SDI", 412000, 1.3f)),
            category("스마트기기",
                stock("삼성전자", 72500, 2.1f), stock("LG전자", 98000, -0.5f)),
            category("기계 / 산업장비",
                stock("두산에너빌리티", 18500, 3.8f), stock("현대로템", 42000, -1.6f)),
            category("건설 / 인프라",
                stock("현대건설", 35000, 1.2f), stock("대우건설", 4200, -2.7f)),
            category("조선",
                stock("HD한국조선해양", 145000, 5.5f), stock("삼성중공업", 9800, 3.2f)),
            category("방산",
                stock("한화에어로스페이스", 185000, 4.1f), stock("LIG넥스원", 125000, 2.3f)),
            category("운송 / 물류",
                stock("대한항공", 25000, 1.9f), stock("HMM", 18500, -3.4f)),
            category("소비내구재",
                stock("LG전자", 98000, -0.5f), stock("삼성전자", 72500, 2.1f)),
            category("필수소비재",
                stock("CJ제일제당", 285000, 0.8f), stock("오뚜기", 425000, -0.3f)),
            category("패션 / 뷰티",
                stock("아모레퍼시픽", 125000, -2.1f), stock("LG생활건강", 385000, 1.4f)),
            category("유통 / 서비스",
                stock("신세계", 185000, 0.6f), stock("이마트", 78000, -1.9f)),
            category("금융 / 헬스케어",
                stock("KB금융", 68000, 1.7f), stock("삼성바이오로직스", 825000, 0.9f)),
            category("기타",
                stock("셀트리온", 178000, -1.5f), stock("한미약품", 285000, 2.2f))
        );
        return ApiResponse.success(new CategoryStocksResponse(categories));
    }

    private CategoryItemResponse category(String name, CategoryStockItemResponse... stocks) {
        return new CategoryItemResponse(name, List.of(stocks));
    }

    private CategoryStockItemResponse stock(String name, int price, float fluctuationRate) {
        return new CategoryStockItemResponse(name, price, fluctuationRate);
    }
}
