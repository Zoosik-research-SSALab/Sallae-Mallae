package com.sallaemallae.backend.domain.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RefreshResponse {

  private final String accessToken;
  private final String tokenType;
  private final long expiresIn;

  public static RefreshResponse of(String accessToken, long expiresIn) {
    return RefreshResponse.builder()
        .accessToken(accessToken)
        .tokenType("Bearer")
        .expiresIn(expiresIn)
        .build();
  }
}
