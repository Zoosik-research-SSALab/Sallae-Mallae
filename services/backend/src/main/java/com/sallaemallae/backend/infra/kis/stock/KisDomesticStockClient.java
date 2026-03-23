package com.sallaemallae.backend.infra.kis.stock;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.infra.kis.KisApiException;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.KisRestClientFactory;
import com.sallaemallae.backend.infra.kis.KisTokenManager;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Slf4j
@Component
public class KisDomesticStockClient {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final DateTimeFormatter BASIC_DATE = DateTimeFormatter.BASIC_ISO_DATE;
  private static final String DEFAULT_MARKET_CODE = "J";
  private static final String TOP_INTEREST_SCREEN_CODE = "20180";
  private static final int MAX_TOP_INTEREST_PAGE = 10;
  private static final int MAX_DIVIDEND_RATE_PAGE = 10;

  private final KisProperties properties;
  private final KisTokenManager kisTokenManager;
  private final ObjectMapper objectMapper;
  private final RestClient restClient;

  public KisDomesticStockClient(
      KisProperties properties,
      KisTokenManager kisTokenManager,
      ObjectMapper objectMapper,
      KisRestClientFactory restClientFactory
  ) {
    this.properties = properties;
    this.kisTokenManager = kisTokenManager;
    this.objectMapper = objectMapper;
    this.restClient = restClientFactory.restClient();
  }

  public KisQuoteData getQuote(String marketCode, String ticker) {
    JsonNode body = get(
        "/uapi/domestic-stock/v1/quotations/inquire-price",
        "FHKST01010100",
        "FID_COND_MRKT_DIV_CODE=" + marketCode + "&FID_INPUT_ISCD=" + ticker
    );

    JsonNode output = body.path("output");
    return new KisQuoteData(
        marketCode,
        ticker,
        nullableText(output, "hts_kor_isnm"),
        toInt(output.path("stck_prpr")),
        toInt(output.path("stck_sdpr")),
        toInt(output.path("prdy_vrss")),
        toFloat(output.path("prdy_ctrt")),
        toInt(output.path("stck_oprc")),
        toInt(output.path("stck_hgpr")),
        toInt(output.path("stck_lwpr")),
        toLong(output.path("acml_vol")),
        OffsetDateTime.now(ZONE_ID),
        "KIS"
    );
  }

  public KisQuoteData getOvertimeQuote(String marketCode, String ticker) {
    JsonNode body = get(
        "/uapi/domestic-stock/v1/quotations/inquire-overtime-price",
        "FHPST02300000",
        "FID_COND_MRKT_DIV_CODE=" + marketCode + "&FID_INPUT_ISCD=" + ticker
    );

    JsonNode output = body.path("output");
    return new KisQuoteData(
        marketCode,
        ticker,
        nullableText(output, "hts_kor_isnm"),
        toInt(output.path("ovtm_untp_prpr")),
        toInt(output.path("stck_sdpr")),
        toInt(output.path("ovtm_untp_prdy_vrss")),
        toFloat(output.path("ovtm_untp_prdy_ctrt")),
        toInt(output.path("ovtm_untp_oprc")),
        toInt(output.path("ovtm_untp_hgpr")),
        toInt(output.path("ovtm_untp_lwpr")),
        toLong(output.path("ovtm_untp_vol")),
        OffsetDateTime.now(ZONE_ID),
        "KIS"
    );
  }

  public KisTopInterestStockData getTopInterestStocks(String marketCode, int maxItems) {
    String normalizedMarketCode = marketCode == null || marketCode.isBlank()
        ? DEFAULT_MARKET_CODE
        : marketCode.trim().toUpperCase();
    int targetSize = Math.max(1, Math.min(maxItems, 200));
    List<KisTopInterestStockItem> items = new ArrayList<>();
    Set<String> seenTickers = new LinkedHashSet<>();

    for (int page = 1; page <= MAX_TOP_INTEREST_PAGE && items.size() < targetSize; page++) {
      JsonNode body = get(
          "/uapi/domestic-stock/v1/ranking/top-interest-stock",
          "FHPST01800000",
          "fid_input_iscd_2=000000"
              + "&fid_cond_mrkt_div_code=" + normalizedMarketCode
              + "&fid_cond_scr_div_code=" + TOP_INTEREST_SCREEN_CODE
              + "&fid_input_iscd=0000"
              + "&fid_trgt_cls_code=0"
              + "&fid_trgt_exls_cls_code=0"
              + "&fid_input_price_1=0"
              + "&fid_input_price_2=0"
              + "&fid_vol_cnt=0"
              + "&fid_div_cls_code=0"
              + "&fid_input_cnt_1=" + page
      );

      JsonNode output = body.path("output");
      if (!output.isArray() || output.isEmpty()) {
        break;
      }

      for (JsonNode row : output) {
        String ticker = nullableText(row, "mksc_shrn_iscd");
        if (ticker == null || !seenTickers.add(ticker)) {
          continue;
        }
        Integer dataRank = toInt(row.path("data_rank"));
        items.add(new KisTopInterestStockItem(
            dataRank != null ? dataRank : items.size() + 1,
            ticker,
            nullableText(row, "hts_kor_isnm"),
            toInt(row.path("stck_prpr")),
            toInt(row.path("prdy_vrss")),
            nullableText(row, "prdy_vrss_sign"),
            toFloat(row.path("prdy_ctrt")),
            toLong(row.path("acml_vol")),
            toLong(row.path("acml_tr_pbmn")),
            toInt(row.path("askp")),
            toInt(row.path("bidp")),
            toInt(row.path("inter_issu_reg_csnu"))
        ));
        if (items.size() >= targetSize) {
          break;
        }
      }
    }

    return new KisTopInterestStockData(
        normalizedMarketCode,
        OffsetDateTime.now(ZONE_ID),
        List.copyOf(items),
        "KIS"
    );
  }

  public KisDividendRateData getCashDividendRateRanking(
      String marketGroup,
      String upjong,
      LocalDate fromDate,
      LocalDate toDate
  ) {
    List<KisDividendRateItem> items = new ArrayList<>();
    String ctsArea = "";
    String trCont = "";

    for (int page = 1; page <= MAX_DIVIDEND_RATE_PAGE; page++) {
      KisApiResponse response = getResponse(
          "/uapi/domestic-stock/v1/ranking/dividend-rate",
          "HHKDB13470100",
          buildDividendRateQuery(ctsArea, marketGroup, upjong, fromDate, toDate),
          trCont
      );

      JsonNode output = dividendRateOutput(response.body());
      if (!output.isArray() || output.isEmpty()) {
        break;
      }

      for (JsonNode row : output) {
        items.add(new KisDividendRateItem(
            toInt(row.path("rank")),
            nullableText(row, "sht_cd"),
            toDate(row.path("record_date")),
            toFloat(row.path("divi_rate")),
            nullableText(row, "divi_kind"),
            KisDividendRateItem.DividendType.CASH
        ));
      }

      String nextTrCont = response.headers().getFirst("tr_cont");
      if (!"M".equalsIgnoreCase(nextTrCont != null ? nextTrCont.trim() : null)) {
        break;
      }
      ctsArea = continuationArea(response);
      trCont = "N";
    }

    return new KisDividendRateData(
        marketGroup,
        upjong,
        fromDate,
        toDate,
        OffsetDateTime.now(ZONE_ID),
        List.copyOf(items),
        "KIS"
    );
  }

  public KisPeriodPriceData getPeriodPrices(
      String marketCode,
      String ticker,
      String periodCode,
      LocalDate startDate,
      LocalDate endDate,
      boolean adjusted
  ) {
    String query = "FID_COND_MRKT_DIV_CODE=" + marketCode
        + "&FID_INPUT_ISCD=" + ticker
        + "&FID_INPUT_DATE_1=" + startDate.format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE)
        + "&FID_INPUT_DATE_2=" + endDate.format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE)
        + "&FID_PERIOD_DIV_CODE=" + periodCode
        + "&FID_ORG_ADJ_PRC=" + (adjusted ? "0" : "1");

    JsonNode body = get(
        "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
        "FHKST03010100",
        query
    );

    JsonNode summary = body.path("output1");
    JsonNode candlesNode = body.path("output2");
    Integer summaryPreviousClose = toInt(summary.path("stck_prdy_clpr"));

    List<KisPriceCandleData> candles = new ArrayList<>();
    for (int i = 0; i < candlesNode.size(); i++) {
      JsonNode row = candlesNode.get(i);
      Integer previousClose = null;
      if (i == 0) {
        previousClose = summaryPreviousClose;
      } else if (i + 1 < candlesNode.size()) {
        previousClose = toInt(candlesNode.get(i + 1).path("stck_clpr"));
      }

      Integer changePrice = toInt(row.path("prdy_vrss"));
      Float fluctuationRate = null;
      if (previousClose != null && previousClose != 0 && changePrice != null) {
        fluctuationRate = (changePrice * 100.0f) / previousClose;
      }

      candles.add(new KisPriceCandleData(
          LocalDate.parse(row.path("stck_bsop_date").asText(), java.time.format.DateTimeFormatter.BASIC_ISO_DATE),
          toInt(row.path("stck_oprc")),
          toInt(row.path("stck_hgpr")),
          toInt(row.path("stck_lwpr")),
          toInt(row.path("stck_clpr")),
          toLong(row.path("acml_vol")),
          changePrice,
          fluctuationRate,
          "Y".equalsIgnoreCase(row.path("mod_yn").asText("N"))
      ));
    }

    return new KisPeriodPriceData(
        marketCode,
        ticker,
        nullableText(summary, "hts_kor_isnm"),
        periodCode,
        startDate,
        endDate,
        adjusted,
        toInt(summary.path("stck_prpr")),
        summaryPreviousClose,
        toInt(summary.path("prdy_vrss")),
        toFloat(summary.path("prdy_ctrt")),
        toInt(summary.path("stck_oprc")),
        toInt(summary.path("stck_hgpr")),
        toInt(summary.path("stck_lwpr")),
        toLong(summary.path("acml_vol")),
        OffsetDateTime.now(ZONE_ID),
        candles,
        "KIS"
    );
  }

  private JsonNode get(String path, String trId, String query) {
    return getResponse(path, trId, query, null).body();
  }

  private String buildDividendRateQuery(
      String ctsArea,
      String marketGroup,
      String upjong,
      LocalDate fromDate,
      LocalDate toDate
  ) {
    return "CTS_AREA=" + (ctsArea == null ? "" : ctsArea)
        + "&GB1=" + marketGroup
        + "&UPJONG=" + upjong
        + "&GB2=0"
        + "&GB3=2"
        + "&F_DT=" + fromDate.format(BASIC_DATE)
        + "&T_DT=" + toDate.format(BASIC_DATE)
        + "&GB4=0";
  }

  private KisApiResponse getResponse(String path, String trId, String query, String trCont) {
    properties.validateConfigured();

    int attempts = Math.max(0, properties.getRetryAttempts()) + 1;
    KisApiException lastException = null;

    for (int attempt = 1; attempt <= attempts; attempt++) {
      try {
        var response = restClient.get()
            .uri(path + "?" + query)
            .headers(headers -> buildHeaders(headers, trId, trCont))
            .accept(MediaType.APPLICATION_JSON)
            .retrieve()
            .toEntity(JsonNode.class);
        JsonNode body = response.getBody();
        if (body == null) {
          throw new KisApiException(502, "KIS_EMPTY_BODY", "KIS response body is empty.");
        }
        validateBusinessResponse(body);
        return new KisApiResponse(body, response.getHeaders());
      } catch (RestClientResponseException e) {
        lastException = toKisApiException(e);
        if (attempt >= attempts || e.getStatusCode().is4xxClientError()) {
          throw lastException;
        }
        sleepBeforeRetry(attempt);
      } catch (ResourceAccessException e) {
        lastException = new KisApiException(503, "KIS_TRANSPORT_ERROR", "한국투자증권 시세 서버와 통신할 수 없습니다.", e);
        if (attempt >= attempts) {
          throw lastException;
        }
        sleepBeforeRetry(attempt);
      }
    }

    throw lastException != null
        ? lastException
        : new KisApiException(500, "KIS_REQUEST_FAILED", "한국투자증권 시세 요청에 실패했습니다.");
  }

  private void sleepBeforeRetry(int attempt) {
    long baseDelayMillis = Math.max(0L, properties.getRetryBackoffMillis());
    int shift = Math.min(Math.max(0, attempt - 1), 20);
    long multiplier = 1L << shift;
    long delay;
    try {
      delay = Math.multiplyExact(baseDelayMillis, multiplier);
    } catch (ArithmeticException e) {
      delay = Long.MAX_VALUE;
    }
    delay = Math.min(delay, 30_000L);
    try {
      Thread.sleep(delay);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new KisApiException(503, "KIS_RETRY_INTERRUPTED", "한국투자증권 시세 재시도가 중단되었습니다.", e);
    }
  }

  private void buildHeaders(HttpHeaders headers, String trId, String trCont) {
    headers.setBearerAuth(kisTokenManager.getAccessToken());
    headers.set("appkey", properties.getAppKey());
    headers.set("appsecret", properties.getAppSecret());
    headers.set("tr_id", trId);
    if (trCont != null && !trCont.isBlank()) {
      headers.set("tr_cont", trCont);
    }
    headers.set("custtype", "P");
    headers.setContentType(MediaType.APPLICATION_JSON);
  }

  private void validateBusinessResponse(JsonNode response) {
    String resultCode = nullableText(response, "rt_cd");
    if (resultCode != null && !"0".equals(resultCode)) {
      throw new KisApiException(
          502,
          nullableText(response, "msg_cd", "error_code") != null
              ? nullableText(response, "msg_cd", "error_code")
              : "KIS_RESPONSE_ERROR",
          nullableText(response, "msg1", "error_description", "message") != null
              ? nullableText(response, "msg1", "error_description", "message")
              : "한국투자증권 시세 요청이 실패했습니다."
      );
    }
  }

  private KisApiException toKisApiException(RestClientResponseException e) {
    try {
      JsonNode body = objectMapper.readTree(e.getResponseBodyAsString());
      return new KisApiException(
          e.getStatusCode().value(),
          nullableText(body, "msg_cd", "error_code") != null
              ? nullableText(body, "msg_cd", "error_code")
              : "KIS_HTTP_ERROR",
          nullableText(body, "msg1", "error_description", "message") != null
              ? nullableText(body, "msg1", "error_description", "message")
              : "한국투자증권 시세 HTTP 요청에 실패했습니다.",
          e
      );
    } catch (Exception parseError) {
      log.warn("한국투자증권 시세 오류 응답을 해석하지 못했습니다.", parseError);
      return new KisApiException(e.getStatusCode().value(), "KIS_HTTP_ERROR", "한국투자증권 시세 HTTP 요청에 실패했습니다.", e);
    }
  }

  private String nullableText(JsonNode node, String... fieldNames) {
    for (String fieldName : fieldNames) {
      JsonNode field = node.path(fieldName);
      if (!field.isMissingNode() && !field.isNull()) {
        String value = field.asText();
        if (!value.isBlank()) {
          return value;
        }
      }
    }
    return null;
  }

  private Integer toInt(JsonNode node) {
    String value = node.asText(null);
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return Integer.parseInt(value.replace(",", ""));
    } catch (NumberFormatException ignored) {
      return null;
    }
  }

  private Long toLong(JsonNode node) {
    String value = node.asText(null);
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return Long.parseLong(value.replace(",", ""));
    } catch (NumberFormatException ignored) {
      return null;
    }
  }

  private Float toFloat(JsonNode node) {
    String value = node.asText(null);
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return Float.parseFloat(value.replace(",", ""));
    } catch (NumberFormatException ignored) {
      return null;
    }
  }

  private JsonNode dividendRateOutput(JsonNode body) {
    JsonNode output = body.path("output1");
    if (output.isArray()) {
      return output;
    }
    return body.path("output");
  }

  private String continuationArea(KisApiResponse response) {
    String bodyCursor = nullableText(response.body(), "cts_area", "CTS_AREA", "ctx_area");
    if (bodyCursor != null) {
      return bodyCursor;
    }
    String headerCursor = response.headers().getFirst("cts_area");
    return headerCursor == null ? "" : headerCursor.trim();
  }

  private LocalDate toDate(JsonNode node) {
    String value = node.asText(null);
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return value.contains("-")
          ? LocalDate.parse(value)
          : LocalDate.parse(value, BASIC_DATE);
    } catch (Exception ignored) {
      return null;
    }
  }

  private record KisApiResponse(JsonNode body, HttpHeaders headers) {
  }
}
