package com.sallaemallae.backend.domain.auth.oauth;

import com.sallaemallae.backend.domain.auth.enumtype.AuthProvider;
import com.sallaemallae.backend.domain.auth.exception.AuthErrorCode;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Slf4j
@Component
public class GoogleOAuthClient implements OAuthProviderClient {

  private final String clientId;
  private final String clientSecret;
  private final String redirectUri;
  private final RestClient restClient;

  public GoogleOAuthClient(
      @Value("${oauth.google.client-id:}") String clientId,
      @Value("${oauth.google.client-secret:}") String clientSecret,
      @Value("${oauth.google.redirect-uri:}") String redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.restClient = RestClient.create();
  }

  @Override
  public AuthProvider getProvider() {
    return AuthProvider.GOOGLE;
  }

  @Override
  @SuppressWarnings("unchecked")
  public OAuthUserProfile getUserProfile(String authorizationCode) {
    try {
      // 1. Authorization Code → Access Token 교환
      MultiValueMap<String, String> tokenRequest = new LinkedMultiValueMap<>();
      tokenRequest.add("code", authorizationCode);
      tokenRequest.add("client_id", clientId);
      tokenRequest.add("client_secret", clientSecret);
      tokenRequest.add("redirect_uri", redirectUri);
      tokenRequest.add("grant_type", "authorization_code");

      Map<String, Object> tokenResponse = restClient.post()
          .uri("https://oauth2.googleapis.com/token")
          .contentType(MediaType.APPLICATION_FORM_URLENCODED)
          .body(tokenRequest)
          .retrieve()
          .body(Map.class);

      String accessToken = (String) tokenResponse.get("access_token");

      // 2. 사용자 프로필 조회
      Map<String, Object> profile = restClient.get()
          .uri("https://www.googleapis.com/oauth2/v2/userinfo")
          .header("Authorization", "Bearer " + accessToken)
          .retrieve()
          .body(Map.class);

      return new OAuthUserProfile(
          (String) profile.get("id"),
          (String) profile.get("email"),
          (String) profile.get("name"),
          (String) profile.get("picture")
      );
    } catch (RestClientException e) {
      log.error("Google OAuth error: {}", e.getMessage());
      throw new BusinessException(AuthErrorCode.OAUTH_PROVIDER_ERROR);
    }
  }
}
