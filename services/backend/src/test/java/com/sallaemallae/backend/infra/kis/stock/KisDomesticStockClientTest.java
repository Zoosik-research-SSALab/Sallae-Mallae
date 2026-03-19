package com.sallaemallae.backend.infra.kis.stock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.KisRestClientFactory;
import com.sallaemallae.backend.infra.kis.KisTokenManager;
import java.time.LocalDate;
import java.util.List;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings({"rawtypes", "unchecked"})
class KisDomesticStockClientTest {

  @Mock
  private KisProperties kisProperties;

  @Mock
  private KisTokenManager kisTokenManager;

  @Mock
  private KisRestClientFactory restClientFactory;

  @Mock
  private RestClient restClient;

  @Mock
  private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

  @Mock
  private RestClient.RequestHeadersSpec requestHeadersSpec;

  @Mock
  private RestClient.ResponseSpec responseSpec;

  @Test
  void getCashDividendRateRanking_updatesContinuationCursorAndHeaderForNextPage() {
    given(restClientFactory.restClient()).willReturn(restClient);

    KisDomesticStockClient client = new KisDomesticStockClient(
        kisProperties,
        kisTokenManager,
        new ObjectMapper(),
        restClientFactory
    );

    given(restClient.get()).willReturn(requestHeadersUriSpec);
    given(requestHeadersUriSpec.uri(anyString())).willReturn(requestHeadersSpec);
    given(requestHeadersSpec.headers(any())).willReturn(requestHeadersSpec);
    given(requestHeadersSpec.accept(MediaType.APPLICATION_JSON)).willReturn(requestHeadersSpec);
    given(requestHeadersSpec.retrieve()).willReturn(responseSpec);
    given(responseSpec.toEntity(JsonNode.class)).willReturn(
        responseEntity(bodyWithDividendItem("005930", "20251230", "2.10", "AREA001"), "M"),
        responseEntity(bodyWithDividendItem("000660", "20251230", "1.45", null), "F")
    );

    KisDividendRateData result = client.getCashDividendRateRanking(
        "1",
        "0001",
        LocalDate.parse("2025-02-11"),
        LocalDate.parse("2026-03-18")
    );

    assertThat(result.items())
        .extracting(KisDividendRateItem::ticker)
        .containsExactly("005930", "000660");

    ArgumentCaptor<String> uriCaptor = ArgumentCaptor.forClass(String.class);
    verify(requestHeadersUriSpec, times(2)).uri(uriCaptor.capture());
    assertThat(uriCaptor.getAllValues()).containsExactly(
        "/uapi/domestic-stock/v1/ranking/dividend-rate?CTS_AREA=&GB1=1&UPJONG=0001&GB2=0&GB3=2&F_DT=20250211&T_DT=20260318&GB4=0",
        "/uapi/domestic-stock/v1/ranking/dividend-rate?CTS_AREA=AREA001&GB1=1&UPJONG=0001&GB2=0&GB3=2&F_DT=20250211&T_DT=20260318&GB4=0"
    );

    ArgumentCaptor<Consumer<HttpHeaders>> headersCaptor = ArgumentCaptor.forClass(Consumer.class);
    verify(requestHeadersSpec, times(2)).headers(headersCaptor.capture());

    List<Consumer<HttpHeaders>> headersConsumers = headersCaptor.getAllValues();
    HttpHeaders firstHeaders = new HttpHeaders();
    headersConsumers.get(0).accept(firstHeaders);
    assertThat(firstHeaders.getFirst("tr_cont")).isNull();

    HttpHeaders secondHeaders = new HttpHeaders();
    headersConsumers.get(1).accept(secondHeaders);
    assertThat(secondHeaders.getFirst("tr_cont")).isEqualTo("N");
  }

  private ResponseEntity<JsonNode> responseEntity(JsonNode body, String trCont) {
    HttpHeaders headers = new HttpHeaders();
    headers.set("tr_cont", trCont);
    return new ResponseEntity<>(body, headers, HttpStatus.OK);
  }

  private JsonNode bodyWithDividendItem(String ticker, String recordDate, String dividendYield, String ctsArea) {
    ObjectNode body = JsonNodeFactory.instance.objectNode();
    body.put("rt_cd", "0");
    if (ctsArea != null) {
      body.put("cts_area", ctsArea);
    }

    ObjectNode item = JsonNodeFactory.instance.objectNode();
    item.put("rank", "1");
    item.put("sht_cd", ticker);
    item.put("record_date", recordDate);
    item.put("divi_rate", dividendYield);
    item.put("divi_kind", "cash");

    body.set("output", JsonNodeFactory.instance.arrayNode().add(item));
    return body;
  }
}
