package com.sallaemallae.backend.domain.storage.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 종목 아이콘 경로(DB 저장값)를 전체 URL로 변환하는 유틸.
 * DB에는 'stock-icons/삼성전자_005930.png' 같은 상대 경로만 저장하고,
 * API 응답 시 이 컴포넌트를 통해 전체 URL로 조합한다.
 */
@Component
public class StockIconUrlResolver {

    private final String publicUrl;
    private final String bucket;

    public StockIconUrlResolver(
        @Value("${minio.public-url}") String publicUrl,
        @Value("${minio.bucket}") String bucket
    ) {
        this.publicUrl = publicUrl;
        this.bucket = bucket;
    }

    /** 상대 경로를 전체 URL로 변환. null이면 null 반환. */
    public String resolve(String iconPath) {
        if (iconPath == null || iconPath.isBlank()) {
            return null;
        }
        return publicUrl + "/" + bucket + "/" + iconPath;
    }
}
