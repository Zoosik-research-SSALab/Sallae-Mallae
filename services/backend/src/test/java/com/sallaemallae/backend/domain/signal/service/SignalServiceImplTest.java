package com.sallaemallae.backend.domain.signal.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.sallaemallae.backend.domain.signal.dto.SignalListResponse;
import com.sallaemallae.backend.domain.signal.exception.SignalErrorCode;
import com.sallaemallae.backend.domain.signal.repository.SignalQueryRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SignalServiceImplTest {

  @Mock
  private SignalQueryRepository signalQueryRepository;

  @InjectMocks
  private SignalServiceImpl signalService;

  @Test
  @DisplayName("신호 목록 조회 시 필터, 정렬, 카운트를 반영한다")
  void getSignals_returnsFilteredAndSortedSignals() {
    OffsetDateTime now = OffsetDateTime.of(2026, 3, 17, 10, 0, 0, 0, ZoneOffset.UTC);
    given(signalQueryRepository.findLatestSignalCandidates()).willReturn(List.of(
        new SignalQueryRepository.SignalCandidateRow(1L, "005930", "삼성전자", "반도체", 74300, 439300000000000L, 1.24f, "BUY", 0.98f, now),
        new SignalQueryRepository.SignalCandidateRow(2L, "035720", "카카오", "IT플랫폼 / 소프트웨어", 48000, null, -1.52f, "SELL", 0.92f, now.minusMinutes(1)),
        new SignalQueryRepository.SignalCandidateRow(3L, "000660", "SK하이닉스", "반도체", 162500, 118300000000000L, 0.42f, "BUY", 0.85f, now.minusMinutes(2))
    ));

    SignalListResponse response = signalService.getSignals("BUY", null, null, null, "UP", 0, 10);

    assertThat(response.buyCount()).isEqualTo(2);
    assertThat(response.sellCount()).isEqualTo(1);
    assertThat(response.signals()).hasSize(2);
    assertThat(response.signals().get(0).ticker()).isEqualTo("005930");
    assertThat(response.signals().get(0).category()).isEqualTo("반도체");
    assertThat(response.signals().get(0).marketCap()).isEqualTo(439300000000000L);
    assertThat(response.signals().get(0).confidence()).isEqualTo(98);
    assertThat(response.signals().get(1).ticker()).isEqualTo("000660");
  }

  @Test
  @DisplayName("잘못된 정렬 값이 오면 BusinessException을 던진다")
  void getSignals_throwsExceptionWhenSortIsInvalid() {
    assertThatThrownBy(() -> signalService.getSignals("ALL", null, null, null, "UNKNOWN", 0, 6))
        .isInstanceOfSatisfying(BusinessException.class, exception ->
            assertThat(exception.getErrorCode()).isEqualTo(SignalErrorCode.SIGNAL_INPUT_INVALID)
        );
  }

  @Test
  @DisplayName("시가총액 필터가 오면 small, mid, large 기준으로 결과를 필터링한다")
  void getSignals_filtersByMarketCapClass() {
    OffsetDateTime now = OffsetDateTime.of(2026, 3, 24, 10, 0, 0, 0, ZoneOffset.UTC);
    given(signalQueryRepository.findLatestSignalCandidates()).willReturn(List.of(
        new SignalQueryRepository.SignalCandidateRow(1L, "111111", "스몰", "테스트", 1000, 900_000_000_000L, 1.0f, "BUY", 0.9f, now),
        new SignalQueryRepository.SignalCandidateRow(2L, "222222", "미드", "테스트", 1000, 3_000_000_000_000L, 2.0f, "BUY", 0.8f, now.minusMinutes(1)),
        new SignalQueryRepository.SignalCandidateRow(3L, "333333", "라지", "테스트", 1000, 15_000_000_000_000L, 3.0f, "SELL", 0.7f, now.minusMinutes(2)),
        new SignalQueryRepository.SignalCandidateRow(4L, "444444", "미정", "테스트", 1000, null, 4.0f, "BUY", 0.6f, now.minusMinutes(3))
    ));

    SignalListResponse smallResponse = signalService.getSignals("ALL", null, null, "small", "LATEST", 0, 10);
    SignalListResponse midResponse = signalService.getSignals("ALL", null, null, "mid", "LATEST", 0, 10);
    SignalListResponse largeResponse = signalService.getSignals("ALL", null, null, "large", "LATEST", 0, 10);

    assertThat(smallResponse.signals()).extracting("ticker").containsExactly("111111");
    assertThat(midResponse.signals()).extracting("ticker").containsExactly("222222");
    assertThat(largeResponse.signals()).extracting("ticker").containsExactly("333333");
  }

  @Test
  @DisplayName("잘못된 시가총액 필터 값이 오면 BusinessException을 던진다")
  void getSignals_throwsExceptionWhenMarketCapIsInvalid() {
    assertThatThrownBy(() -> signalService.getSignals("ALL", null, null, "mega", "LATEST", 0, 6))
        .isInstanceOfSatisfying(BusinessException.class, exception ->
            assertThat(exception.getErrorCode()).isEqualTo(SignalErrorCode.SIGNAL_INPUT_INVALID)
        );
  }

  @Test
  @DisplayName("카테고리와 키워드가 오면 해당 조건으로 먼저 결과를 필터링한다")
  void getSignals_filtersByCategoriesAndKeyword() {
    OffsetDateTime now = OffsetDateTime.of(2026, 3, 27, 10, 0, 0, 0, ZoneOffset.UTC);
    given(signalQueryRepository.findLatestSignalCandidates()).willReturn(List.of(
        new SignalQueryRepository.SignalCandidateRow(1L, "005930", "삼성전자", "반도체", 74300, 439300000000000L, 1.24f, "BUY", 0.98f, now),
        new SignalQueryRepository.SignalCandidateRow(2L, "000660", "SK하이닉스", "반도체", 162500, 118300000000000L, 0.42f, "BUY", 0.85f, now.minusMinutes(1)),
        new SignalQueryRepository.SignalCandidateRow(3L, "012450", "한화에어로스페이스", "방산", 385000, 18000000000000L, 4.41f, "BUY", 0.96f, now.minusMinutes(2)),
        new SignalQueryRepository.SignalCandidateRow(4L, "035720", "카카오", "IT플랫폼 / 소프트웨어", 48000, 7_000_000_000_000L, -1.52f, "SELL", 0.92f, now.minusMinutes(3))
    ));

    SignalListResponse response = signalService.getSignals("ALL", "반도체,방산", "한화", null, "LATEST", 0, 10);

    assertThat(response.buyCount()).isEqualTo(1);
    assertThat(response.sellCount()).isEqualTo(0);
    assertThat(response.signals()).extracting("ticker").containsExactly("012450");
  }
}
