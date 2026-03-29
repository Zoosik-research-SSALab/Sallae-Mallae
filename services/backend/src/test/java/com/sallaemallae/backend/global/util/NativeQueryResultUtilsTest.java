package com.sallaemallae.backend.global.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class NativeQueryResultUtilsTest {

  @Test
  @DisplayName("DATE 값도 OffsetDateTime으로 변환한다")
  void toOffsetDateTime_supportsSqlDate() {
    OffsetDateTime result = NativeQueryResultUtils.toOffsetDateTime(Date.valueOf(LocalDate.of(2026, 3, 26)));

    assertThat(result).isEqualTo(OffsetDateTime.parse("2026-03-26T00:00:00+09:00"));
  }

  @Test
  @DisplayName("LocalDateTime 값도 OffsetDateTime으로 변환한다")
  void toOffsetDateTime_supportsLocalDateTime() {
    OffsetDateTime result = NativeQueryResultUtils.toOffsetDateTime(LocalDateTime.of(2026, 3, 26, 15, 30));

    assertThat(result).isEqualTo(OffsetDateTime.parse("2026-03-26T15:30:00+09:00"));
  }

  @Test
  @DisplayName("Instant 값도 OffsetDateTime으로 변환한다")
  void toOffsetDateTime_supportsInstant() {
    OffsetDateTime result = NativeQueryResultUtils.toOffsetDateTime(Instant.parse("2026-03-26T06:30:00Z"));

    assertThat(result).isEqualTo(OffsetDateTime.parse("2026-03-26T15:30:00+09:00"));
  }
}
