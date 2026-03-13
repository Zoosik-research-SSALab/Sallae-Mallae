package com.sallaemallae.backend.infra.kis.websocket;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class KisWebSocketMessageParserTest {

  private final KisWebSocketMessageParser parser = new KisWebSocketMessageParser(new ObjectMapper());

  @Test
  void parseDomesticTradeTicks_parsesSingleTick() {
    String[] fields = new String[46];
    fields[0] = "005930";
    fields[1] = "093354";
    fields[2] = "71900";
    fields[3] = "5";
    fields[4] = "100";
    fields[5] = "0.14";
    fields[7] = "72100";
    fields[8] = "72400";
    fields[9] = "71700";
    fields[12] = "3052";
    fields[13] = "2198532417";
    fields[18] = "125.92";
    fields[33] = "20260312";
    fields[34] = "20";
    fields[35] = "N";
    String raw = "0|H0STCNT0|001|" + String.join("^", fields);

    List<KisRealtimeTradeTickData> ticks = parser.parseDomesticTradeTicks(raw, "J");

    assertThat(ticks).hasSize(1);
    KisRealtimeTradeTickData tick = ticks.getFirst();
    assertThat(tick.ticker()).isEqualTo("005930");
    assertThat(tick.currentPrice()).isEqualTo(71900);
    assertThat(tick.changePrice()).isEqualTo(-100);
    assertThat(tick.changeRate()).isEqualTo(-0.14f);
    assertThat(tick.tradeVolume()).isEqualTo(3052L);
    assertThat(tick.accumulatedVolume()).isEqualTo(2198532417L);
    assertThat(tick.executionStrength()).isEqualTo(125.92f);
    assertThat(tick.halted()).isFalse();
  }

  @Test
  void parseSubscriptionAck_parsesSuccessAck() {
    String raw = """
        {
          "header": {
            "tr_id": "H0STCNT0",
            "tr_key": "005930",
            "encrypt": "N"
          },
          "body": {
            "rt_cd": "0",
            "msg_cd": "OPSP0000",
            "msg1": "SUBSCRIBE SUCCESS"
          }
        }
        """;

    KisWebSocketSubscriptionAck acknowledgement = parser.parseSubscriptionAck(raw).orElseThrow();

    assertThat(acknowledgement.topic()).isEqualTo("H0STCNT0");
    assertThat(acknowledgement.ticker()).isEqualTo("005930");
    assertThat(acknowledgement.success()).isTrue();
    assertThat(acknowledgement.message()).isEqualTo("SUBSCRIBE SUCCESS");
  }
}
