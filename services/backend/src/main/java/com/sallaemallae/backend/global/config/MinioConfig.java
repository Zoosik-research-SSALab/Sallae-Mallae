package com.sallaemallae.backend.global.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

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
  @Primary
  public MinioClient minioClient() {
    return MinioClient.builder()
        .endpoint(endpoint)
        .credentials(accessKey, secretKey)
        .build();
  }

  @Bean(name = "presignedMinioClient")
  public MinioClient presignedMinioClient() {
    return MinioClient.builder()
        .endpoint(presignedEndpoint)
        .credentials(accessKey, secretKey)
        .build();
  }
}
