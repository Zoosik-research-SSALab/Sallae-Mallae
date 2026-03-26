package com.sallaemallae.backend.domain.search.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.sallaemallae.backend.domain.search.dto.response.SearchStockItemResponse;
import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SearchQueryRepositoryTest {

  @Test
  @DisplayName("LIKE 검색어의 와일드카드와 역슬래시를 이스케이프한다")
  void escapeLikeKeyword_escapesWildcardsAndBackslash() {
    assertThat(SearchQueryRepository.escapeLikeKeyword("50%_off\\news"))
        .isEqualTo("50\\%\\_off\\\\news");
  }

  @Test
  @DisplayName("contains 패턴은 이스케이프된 검색어를 양쪽 %로 감싼다")
  void buildContainsPattern_wrapsEscapedKeyword() {
    assertThat(SearchQueryRepository.buildContainsPattern("삼성_"))
        .isEqualTo("%삼성\\_%");
  }

  @Test
  @DisplayName("startsWith 패턴은 이스케이프된 검색어 뒤에만 %를 붙인다")
  void buildStartsWithPattern_appendsTrailingWildcard() {
    assertThat(SearchQueryRepository.buildStartsWithPattern("100%"))
        .isEqualTo("100\\%%");
  }

  @Test
  @DisplayName("한글 종목명에서 초성을 추출한다")
  void extractInitialConsonants_extractsHangulInitials() {
    assertThat(SearchQueryRepository.extractInitialConsonants("삼성전자"))
        .isEqualTo("ㅅㅅㅈㅈ");
  }

  @Test
  @DisplayName("초성 검색어는 종목명의 초성 부분수열과 매칭된다")
  void matchesInitialConsonant_matchesSubsequence() {
    assertThat(SearchQueryRepository.matchesInitialConsonant("삼성전자", "ㅅㅈ"))
        .isTrue();
    assertThat(SearchQueryRepository.matchesInitialConsonant("삼성전자", "ㅈㅅ"))
        .isFalse();
  }

  @Test
  @DisplayName("종목 검색은 종목명, ticker, 초성 기준으로만 매칭한다")
  void matchesStock_usesNameTickerAndInitialsOnly() {
    SearchStockItemResponse item = new SearchStockItemResponse(
        1L,
        "005930",
        "삼성전자",
        "Information Technology",
        70300,
        BigDecimal.valueOf(2.15)
    );

    assertThat(SearchQueryRepository.matchesStock(item, "삼성")).isTrue();
    assertThat(SearchQueryRepository.matchesStock(item, "0059")).isTrue();
    assertThat(SearchQueryRepository.matchesStock(item, "ㅅㅈ")).isTrue();
    assertThat(SearchQueryRepository.matchesStock(item, "반도체")).isFalse();
  }
}
