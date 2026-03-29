package com.sallaemallae.backend.global.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MinioConfig {

  @Value("${minio.endpoint}")
  private String endpoint;

  @Value("${minio.presigned-endpoint}")
  private String presignedEndpoint;

  @Value("${minio.access-key}")
  private String accessKey;

  @Value("${minio.secret-key}")
  private String secretKey;

  @Bean
  public MinioClient minioClient() {
    return MinioClient.builder()
        .endpoint(endpoint)
        .credentials(accessKey, secretKey)
        .build();
  }

  /** presigned URL 서명 전용 — 외부 호스트로 서명하여 nginx 프록시 경유 시 Host 불일치 방지 */
  @Bean
  @Qualifier("presignedMinioClient")
  public MinioClient presignedMinioClient() {
    return MinioClient.builder()
        .endpoint(presignedEndpoint)
        .credentials(accessKey, secretKey)
        .build();
  }
}
