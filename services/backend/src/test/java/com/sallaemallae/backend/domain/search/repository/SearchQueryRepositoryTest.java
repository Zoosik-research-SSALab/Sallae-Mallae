package com.sallaemallae.backend.domain.search.repository;

import static org.assertj.core.api.Assertions.assertThat;

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
}
