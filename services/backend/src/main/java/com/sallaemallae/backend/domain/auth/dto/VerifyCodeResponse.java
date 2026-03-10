package com.sallaemallae.backend.domain.auth.dto;

public record VerifyCodeResponse(
    String verificationToken,
    int expiresIn
) {

  public static VerifyCodeResponse of(String verificationToken, int expiresIn) {
    return new VerifyCodeResponse(verificationToken, expiresIn);
  }
}
