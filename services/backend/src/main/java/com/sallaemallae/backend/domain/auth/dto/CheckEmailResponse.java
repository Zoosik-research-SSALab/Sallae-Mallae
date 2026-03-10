package com.sallaemallae.backend.domain.auth.dto;

public record CheckEmailResponse(
    String email,
    boolean available
) {

  public static CheckEmailResponse of(String email, boolean available) {
    return new CheckEmailResponse(email, available);
  }
}
