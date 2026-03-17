package com.sallaemallae.backend.domain.auth.dto;

public record LogoutAllResponse(
    int invalidatedSessions
) {

  public static LogoutAllResponse of(int count) {
    return new LogoutAllResponse(count);
  }
}
