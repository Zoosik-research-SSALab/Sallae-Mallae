package com.sallaemallae.backend.infra.kis;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class KisRestClientFactory {

  private final RestClient restClient;

  public KisRestClientFactory(KisProperties properties) {
    HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
        .build();

    JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
    requestFactory.setReadTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()));

    this.restClient = RestClient.builder()
        .baseUrl(properties.restBaseUrl())
        .requestFactory(requestFactory)
        .build();
  }

  public RestClient restClient() {
    return restClient;
  }
}
