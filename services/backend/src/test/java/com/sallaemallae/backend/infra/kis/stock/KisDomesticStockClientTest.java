package com.sallaemallae.backend.infra.kis.stock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.KisRestClientFactory;
import com.sallaemallae.backend.infra.kis.KisTokenManager;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
  void getCashDividendRateRanking_fetchesContinuationPages() {
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
        responseEntity(bodyWithDividendItem("005930", "20251230", "2.10"), "M"),
        responseEntity(bodyWithDividendItem("000660", "20251230", "1.45"), "")
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
  }

  private ResponseEntity<JsonNode> responseEntity(JsonNode body, String trCont) {
    HttpHeaders headers = new HttpHeaders();
    headers.set("tr_cont", trCont);
    return new ResponseEntity<>(body, headers, HttpStatus.OK);
  }

  private JsonNode bodyWithDividendItem(String ticker, String recordDate, String dividendYield) {
    ObjectNode body = JsonNodeFactory.instance.objectNode();
    body.put("rt_cd", "0");

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
