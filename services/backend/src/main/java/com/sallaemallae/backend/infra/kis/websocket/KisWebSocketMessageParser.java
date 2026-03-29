package com.sallaemallae.backend.infra.kis.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class KisWebSocketMessageParser {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final DateTimeFormatter BASIC_DATE = DateTimeFormatter.BASIC_ISO_DATE;
  private static final DateTimeFormatter BASIC_TIME = DateTimeFormatter.ofPattern("HHmmss");
  private static final String DOMESTIC_TRADE_TOPIC = "H0STCNT0";
  private static final int DOMESTIC_TRADE_FIELD_COUNT = 46;

  private final ObjectMapper objectMapper;

  public boolean isPingPong(String rawMessage) {
    if (rawMessage == null || rawMessage.isBlank() || rawMessage.charAt(0) != '{') {
      return false;
    }
    try {
      JsonNode payload = objectMapper.readTree(rawMessage);
      return "PINGPONG".equalsIgnoreCase(payload.path("header").path("tr_id").asText());
    } catch (Exception e) {
      return false;
    }
  }

  public Optional<KisWebSocketSubscriptionAck> parseSubscriptionAck(String rawMessage) {
    if (rawMessage == null || rawMessage.isBlank() || rawMessage.charAt(0) != '{') {
      return Optional.empty();
    }

    try {
      JsonNode payload = objectMapper.readTree(rawMessage);
      JsonNode header = payload.path("header");
      JsonNode body = payload.path("body");
      String topic = header.path("tr_id").asText("");
      String ticker = header.path("tr_key").asText("");
      String message = body.path("msg1").asText("");
      String resultCode = body.path("rt_cd").asText("");
      if (topic.isBlank() || ticker.isBlank() || message.isBlank()) {
        return Optional.empty();
      }
      boolean success = "0".equals(resultCode) || message.toUpperCase().contains("SUCCESS");
      return Optional.of(new KisWebSocketSubscriptionAck(
          topic,
          ticker,
          success,
          message,
          OffsetDateTime.now(ZONE_ID)
      ));
    } catch (Exception e) {
      return Optional.empty();
    }
  }

  public List<KisRealtimeTradeTickData> parseDomesticTradeTicks(String rawMessage, String marketCode) {
    if (rawMessage == null || rawMessage.isBlank() || rawMessage.charAt(0) == '{') {
      return List.of();
    }

    String[] sections = rawMessage.trim().split("\\|", 4);
    if (sections.length < 4 || !DOMESTIC_TRADE_TOPIC.equals(sections[1].trim())) {
      return List.of();
    }

    String payload = sections[3].trim();
    if (payload.isBlank()) {
      return List.of();
    }

    String[] fields = payload.split("\\^", -1);
    int expectedRecords = parseInteger(sections[2]).orElse(0);
    int availableRecords = fields.length / DOMESTIC_TRADE_FIELD_COUNT;
    int recordCount = expectedRecords > 0 ? Math.min(expectedRecords, availableRecords) : availableRecords;
    if (recordCount <= 0) {
      return List.of();
    }

    List<KisRealtimeTradeTickData> ticks = new ArrayList<>(recordCount);
    for (int recordIndex = 0; recordIndex < recordCount; recordIndex++) {
      int base = recordIndex * DOMESTIC_TRADE_FIELD_COUNT;
      KisRealtimeTradeTickData tick = parseDomesticTradeTick(fields, base, marketCode);
      if (tick != null) {
        ticks.add(tick);
      }
    }
    return ticks;
  }

  private KisRealtimeTradeTickData parseDomesticTradeTick(String[] fields, int base, String marketCode) {
    try {
      String ticker = value(fields, base);
      OffsetDateTime tradedAt = parseTradeDateTime(value(fields, base + 33), value(fields, base + 1));
      Integer currentPrice = parseInteger(value(fields, base + 2)).orElse(null);
      Integer changePrice = parseSignedInteger(value(fields, base + 4), value(fields, base + 3)).orElse(null);
      Float changeRate = parseSignedFloat(value(fields, base + 5), value(fields, base + 3)).orElse(null);
      Integer openPrice = parseInteger(value(fields, base + 7)).orElse(null);
      Integer highPrice = parseInteger(value(fields, base + 8)).orElse(null);
      Integer lowPrice = parseInteger(value(fields, base + 9)).orElse(null);
      Long tradeVolume = parseLong(value(fields, base + 12)).orElse(0L);
      Long accumulatedVolume = parseLong(value(fields, base + 13)).orElse(0L);
      Float executionStrength = parseFloat(value(fields, base + 18)).orElse(null);
      String marketOperationCode = value(fields, base + 34);
      boolean halted = "Y".equalsIgnoreCase(value(fields, base + 35));
      if (ticker == null || ticker.isBlank() || tradedAt == null || currentPrice == null) {
        return null;
      }

      return new KisRealtimeTradeTickData(
          marketCode,
          ticker,
          tradedAt,
          currentPrice,
          openPrice,
          highPrice,
          lowPrice,
          changePrice,
          changeRate,
          Math.abs(tradeVolume),
          accumulatedVolume,
          executionStrength,
          marketOperationCode,
          halted,
          "KIS_WS"
      );
    } catch (Exception e) {
      log.debug("Failed to parse KIS domestic trade tick.", e);
      return null;
    }
  }

  private OffsetDateTime parseTradeDateTime(String tradeDate, String tradeTime) {
    try {
      LocalDate parsedDate = tradeDate == null || tradeDate.isBlank()
          ? LocalDate.now(ZONE_ID)
          : LocalDate.parse(tradeDate, BASIC_DATE);
      LocalTime parsedTime = LocalTime.parse((tradeTime == null ? "" : tradeTime).trim(), BASIC_TIME);
      return LocalDateTime.of(parsedDate, parsedTime).atZone(ZONE_ID).toOffsetDateTime();
    } catch (DateTimeParseException e) {
      return null;
    }
  }

  private Optional<Integer> parseSignedInteger(String rawValue, String signCode) {
    return parseInteger(rawValue).map(value -> applySign(value, signCode));
  }

  private Optional<Float> parseSignedFloat(String rawValue, String signCode) {
    return parseFloat(rawValue).map(value -> applySign(value, signCode));
  }

  private int applySign(int value, String signCode) {
    return switch (signCode) {
      case "4", "5" -> -Math.abs(value);
      case "3" -> 0;
      default -> value;
    };
  }

  private float applySign(float value, String signCode) {
    return switch (signCode) {
      case "4", "5" -> -Math.abs(value);
      case "3" -> 0f;
      default -> value;
    };
  }

  private Optional<Integer> parseInteger(String rawValue) {
    try {
      if (rawValue == null || rawValue.isBlank()) {
        return Optional.empty();
      }
      return Optional.of(Integer.parseInt(rawValue.replace(",", "").trim()));
    } catch (NumberFormatException e) {
      return Optional.empty();
    }
  }

  private Optional<Long> parseLong(String rawValue) {
    try {
      if (rawValue == null || rawValue.isBlank()) {
        return Optional.empty();
      }
      return Optional.of(Long.parseLong(rawValue.replace(",", "").trim()));
    } catch (NumberFormatException e) {
      return Optional.empty();
    }
  }

  private Optional<Float> parseFloat(String rawValue) {
    try {
      if (rawValue == null || rawValue.isBlank()) {
        return Optional.empty();
      }
      return Optional.of(Float.parseFloat(rawValue.replace(",", "").trim()));
    } catch (NumberFormatException e) {
      return Optional.empty();
    }
  }

  private String value(String[] fields, int index) {
    return index < fields.length ? fields[index].trim() : null;
  }
}
