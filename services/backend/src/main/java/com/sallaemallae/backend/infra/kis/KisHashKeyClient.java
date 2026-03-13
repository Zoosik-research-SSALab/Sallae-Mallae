package com.sallaemallae.backend.infra.kis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class KisHashKeyClient {

  private final KisAuthClient kisAuthClient;
  private final ObjectMapper objectMapper;

  public String issueHashKey(Object payload) {
    try {
      return kisAuthClient.issueHashKey(objectMapper.writeValueAsString(payload));
    } catch (JsonProcessingException e) {
      throw new KisApiException(500, "KIS_HASH_PAYLOAD_INVALID", "Failed to serialize KIS hash payload.", e);
    }
  }
}
