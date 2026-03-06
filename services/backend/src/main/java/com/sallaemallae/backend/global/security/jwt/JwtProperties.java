package com.sallaemallae.backend.global.security.jwt;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {

  private String secret;
  private long accessTokenExpiration;  // milliseconds (기본: 15분 = 900000)
  private long refreshTokenExpiration; // milliseconds (기본: 14일 = 1209600000)

  // Access Token 만료시간 (초 단위)
  public long getAccessTokenExpirationSeconds() {
    return accessTokenExpiration / 1000;
  }

  // Refresh Token 만료시간 (초 단위)
  public long getRefreshTokenExpirationSeconds() {
    return refreshTokenExpiration / 1000;
  }
}
