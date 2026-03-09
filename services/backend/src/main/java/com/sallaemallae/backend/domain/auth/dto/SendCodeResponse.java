package com.sallaemallae.backend.domain.auth.dto;

public record SendCodeResponse(
    int expiresIn,
    int remainingAttempts
) {

  public static SendCodeResponse of(int expiresIn, int remainingAttempts) {
    return new SendCodeResponse(expiresIn, remainingAttempts);
  }
}
