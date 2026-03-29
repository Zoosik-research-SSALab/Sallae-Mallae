package com.sallaemallae.backend.domain.main.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MainErrorCode implements ErrorCode {

    MAIN_SUMMARY_NOT_FOUND(404, "MAIN_001", "메인 요약 정보를 찾을 수 없습니다."),
    MAIN_DATA_NOT_FOUND(404, "MAIN_002", "메인 데이터를 찾을 수 없습니다."),
    MAIN_MARKET_FETCH_FAILED(503, "MAIN_003", "시장 지수 데이터를 가져오는 데 실패했습니다.");

    private final int status;
    private final String code;
    private final String message;
}
