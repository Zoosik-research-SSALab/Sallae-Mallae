package com.sallaemallae.backend.domain.storage.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class StockIconUrlResolverTest {

    private StockIconUrlResolver resolver(String publicUrl) {
        return new StockIconUrlResolver(publicUrl);
    }

    @Test
    @DisplayName("상대 경로를 전체 URL로 변환한다")
    void resolve_relativePath() {
        StockIconUrlResolver resolver = resolver("/assets");
        assertThat(resolver.resolve("stock-icons/삼성전자_005930.png"))
            .isEqualTo("/assets/stock-icons/삼성전자_005930.png");
    }

    @Test
    @DisplayName("null이면 null을 반환한다")
    void resolve_null() {
        StockIconUrlResolver resolver = resolver("/assets");
        assertThat(resolver.resolve(null)).isNull();
    }

    @Test
    @DisplayName("빈 문자열이면 null을 반환한다")
    void resolve_blank() {
        StockIconUrlResolver resolver = resolver("/assets");
        assertThat(resolver.resolve("  ")).isNull();
    }

    @Test
    @DisplayName("절대 URL이면 그대로 반환한다")
    void resolve_absoluteUrl() {
        StockIconUrlResolver resolver = resolver("/assets");
        String absoluteUrl = "https://other.cdn.com/icons/test.png";
        assertThat(resolver.resolve(absoluteUrl)).isEqualTo(absoluteUrl);
    }

    @Test
    @DisplayName("publicUrl 끝에 슬래시가 있어도 중복되지 않는다")
    void resolve_trailingSlash() {
        StockIconUrlResolver resolver = resolver("/assets/");
        assertThat(resolver.resolve("stock-icons/test.png"))
            .isEqualTo("/assets/stock-icons/test.png");
    }

    @Test
    @DisplayName("iconPath 앞에 슬래시가 있어도 중복되지 않는다")
    void resolve_leadingSlashInPath() {
        StockIconUrlResolver resolver = resolver("/assets");
        assertThat(resolver.resolve("/stock-icons/test.png"))
            .isEqualTo("/assets/stock-icons/test.png");
    }
}
