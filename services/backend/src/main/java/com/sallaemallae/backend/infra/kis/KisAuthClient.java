package com.sallaemallae.backend.infra.kis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Slf4j
@Component
@RequiredArgsConstructor
public class KisAuthClient {

  private static final DateTimeFormatter EXPIRES_AT_FORMAT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");

  private final KisProperties properties;
  private final ObjectMapper objectMapper;

  public AccessTokenPayload issueAccessToken() {
    properties.validateConfigured();
    RestClient restClient = RestClient.builder()
        .baseUrl(properties.restBaseUrl())
        .build();
    try {
      JsonNode body = restClient.post()
          .uri("/oauth2/tokenP")
          .contentType(MediaType.APPLICATION_JSON)
          .body(Map.of(
              "grant_type", "client_credentials",
              "appkey", properties.getAppKey(),
              "appsecret", properties.getAppSecret()
          ))
          .retrieve()
          .body(JsonNode.class);

      String accessToken = requiredText(body, "access_token");
      String expiredAt = requiredText(body, "access_token_token_expired");
      OffsetDateTime expiresAt = LocalDateTime.parse(expiredAt, EXPIRES_AT_FORMAT)
          .atZone(ZONE_ID)
          .toOffsetDateTime();
      return new AccessTokenPayload(accessToken, expiresAt);
    } catch (RestClientResponseException e) {
      throw toKisApiException("KIS token issuance failed.", e);
    }
  }

  public ApprovalKeyPayload issueApprovalKey() {
    properties.validateConfigured();
    RestClient restClient = RestClient.builder()
        .baseUrl(properties.restBaseUrl())
        .build();
    try {
      JsonNode body = restClient.post()
          .uri("/oauth2/Approval")
          .contentType(MediaType.APPLICATION_JSON)
          .body(Map.of(
              "grant_type", "client_credentials",
              "appkey", properties.getAppKey(),
              "secretkey", properties.getAppSecret()
          ))
          .retrieve()
          .body(JsonNode.class);

      String approvalKey = requiredText(body, "approval_key");
      OffsetDateTime expiresAt = OffsetDateTime.now(ZONE_ID).plusHours(24);
      return new ApprovalKeyPayload(approvalKey, expiresAt);
    } catch (RestClientResponseException e) {
      throw toKisApiException("KIS approval key issuance failed.", e);
    }
  }

  public String issueHashKey(String payloadJson) {
    properties.validateConfigured();
    RestClient restClient = RestClient.builder()
        .baseUrl(properties.restBaseUrl())
        .build();
    try {
      JsonNode body = restClient.post()
          .uri("/uapi/hashkey")
          .contentType(MediaType.APPLICATION_JSON)
          .header("appkey", properties.getAppKey())
          .header("appsecret", properties.getAppSecret())
          .body(payloadJson)
          .retrieve()
          .body(JsonNode.class);
      return requiredText(body, "HASH");
    } catch (RestClientResponseException e) {
      throw toKisApiException("KIS hashkey issuance failed.", e);
    }
  }

  private KisApiException toKisApiException(String defaultMessage, RestClientResponseException e) {
    try {
      JsonNode body = objectMapper.readTree(e.getResponseBodyAsString());
      String code = text(body, "error_code", "msg_cd");
      String message = text(body, "error_description", "msg1", "message");
      return new KisApiException(
          e.getStatusCode().value(),
          code != null ? code : "KIS_HTTP_ERROR",
          message != null ? message : defaultMessage,
          e
      );
    } catch (Exception parseError) {
      log.warn("Failed to parse KIS auth error body.", parseError);
      return new KisApiException(e.getStatusCode().value(), "KIS_HTTP_ERROR", defaultMessage, e);
    }
  }

  private String requiredText(JsonNode node, String fieldName) {
    String value = text(node, fieldName);
    if (value == null || value.isBlank()) {
      throw new KisApiException(502, "KIS_RESPONSE_INVALID", "KIS response is missing " + fieldName + ".");
    }
    return value;
  }

  private String text(JsonNode node, String... fieldNames) {
    if (node == null) {
      return null;
    }
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

  public record AccessTokenPayload(String accessToken, OffsetDateTime expiresAt) {
  }

  public record ApprovalKeyPayload(String approvalKey, OffsetDateTime expiresAt) {
  }
}
