package com.sallaemallae.backend.global.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Date;
import java.time.LocalDate;
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
}
