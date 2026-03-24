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

    SignalListResponse response = signalService.getSignals("BUY", "UP", 0, 10);

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
    assertThatThrownBy(() -> signalService.getSignals("ALL", "UNKNOWN", 0, 6))
        .isInstanceOfSatisfying(BusinessException.class, exception ->
            assertThat(exception.getErrorCode()).isEqualTo(SignalErrorCode.SIGNAL_INPUT_INVALID)
        );
  }
}
