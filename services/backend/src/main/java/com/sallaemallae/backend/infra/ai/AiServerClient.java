package com.sallaemallae.backend.infra.ai;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AiServerClient {

  private final RestClient restClient;

  public AiServerClient(@Value("${AI_SERVER_BASE_URL:http://ml-server:8000}") String aiServerBaseUrl) {
    this.restClient = RestClient.builder().baseUrl(aiServerBaseUrl).build();
  }

  public Map<String, Object> requestInfer(Map<String, Object> payload) {
    return restClient.post()
        .uri("/infer")
        .contentType(MediaType.APPLICATION_JSON)
        .body(payload)
        .retrieve()
        .body(Map.class);
  }
}
