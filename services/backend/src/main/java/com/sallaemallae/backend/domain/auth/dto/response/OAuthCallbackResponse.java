package com.sallaemallae.backend.domain.auth.dto.response;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OAuthCallbackResponse {

  private final String code;

  // SUCCESS 응답용
  private final String accessToken;
  private final String tokenType;
  private final Long expiresIn;
  private final LoginResponse.UserInfo user;

  // TERMS_AGREEMENT_REQUIRED 응답용
  private final String tempToken;
  private final String email;
  private final String provider;
  private final List<TermsDto> requiredTerms;
  private final List<TermsDto> optionalTerms;

  public static OAuthCallbackResponse existingUser(String accessToken, long expiresIn,
      LoginResponse.UserInfo userInfo) {
    return OAuthCallbackResponse.builder()
        .code("SUCCESS")
        .accessToken(accessToken)
        .tokenType("Bearer")
        .expiresIn(expiresIn)
        .user(userInfo)
        .build();
  }

  public static OAuthCallbackResponse newUser(String tempToken, String email, String provider,
      List<TermsDto> requiredTerms, List<TermsDto> optionalTerms) {
    return OAuthCallbackResponse.builder()
        .code("TERMS_AGREEMENT_REQUIRED")
        .tempToken(tempToken)
        .email(email)
        .provider(provider)
        .requiredTerms(requiredTerms)
        .optionalTerms(optionalTerms)
        .build();
  }

  @Getter
  @Builder
  public static class TermsDto {
    private final Long termsId;
    private final String title;
    private final boolean required;
  }
}
