package com.sallaemallae.backend.global.util;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;

public final class NativeQueryResultUtils {

  private static final ZoneId DEFAULT_ZONE_ID = ZoneId.of("Asia/Seoul");

  private NativeQueryResultUtils() {
  }

  public static Long toLong(Object value) {
    return value instanceof Number number ? number.longValue() : null;
  }

  public static Integer toInteger(Object value) {
    return value instanceof Number number ? number.intValue() : null;
  }

  public static Float toFloat(Object value) {
    return value instanceof Number number ? number.floatValue() : null;
  }

  public static OffsetDateTime toOffsetDateTime(Object value) {
    if (value instanceof OffsetDateTime offsetDateTime) {
      return offsetDateTime;
    }
    if (value instanceof LocalDate localDate) {
      return localDate.atStartOfDay(DEFAULT_ZONE_ID).toOffsetDateTime();
    }
    if (value instanceof Date date) {
      return date.toLocalDate().atStartOfDay(DEFAULT_ZONE_ID).toOffsetDateTime();
    }
    if (value instanceof Timestamp timestamp) {
      return timestamp.toInstant().atZone(DEFAULT_ZONE_ID).toOffsetDateTime();
    }
    return null;
  }
}
