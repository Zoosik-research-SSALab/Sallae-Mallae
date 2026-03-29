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
public class NaverOAuthClient implements OAuthProviderClient {

  private final String clientId;
  private final String clientSecret;
  private final String redirectUri;
  private final RestClient restClient;

  public NaverOAuthClient(
      @Value("${oauth.naver.client-id:}") String clientId,
      @Value("${oauth.naver.client-secret:}") String clientSecret,
      @Value("${oauth.naver.redirect-uri:}") String redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.restClient = RestClient.create();
  }

  @Override
  public AuthProvider getProvider() {
    return AuthProvider.NAVER;
  }

  @Override
  @SuppressWarnings("unchecked")
  public OAuthUserProfile getUserProfile(String authorizationCode) {
    try {
      // 1. Authorization Code → Access Token 교환
      MultiValueMap<String, String> tokenRequest = new LinkedMultiValueMap<>();
      tokenRequest.add("grant_type", "authorization_code");
      tokenRequest.add("client_id", clientId);
      tokenRequest.add("client_secret", clientSecret);
      tokenRequest.add("code", authorizationCode);
      tokenRequest.add("redirect_uri", redirectUri);

      Map<String, Object> tokenResponse = restClient.post()
          .uri("https://nid.naver.com/oauth2.0/token")
          .contentType(MediaType.APPLICATION_FORM_URLENCODED)
          .body(tokenRequest)
          .retrieve()
          .body(Map.class);

      String accessToken = (String) tokenResponse.get("access_token");

      // 2. 사용자 프로필 조회 (네이버는 response 안에 중첩)
      Map<String, Object> result = restClient.get()
          .uri("https://openapi.naver.com/v1/nid/me")
          .header("Authorization", "Bearer " + accessToken)
          .retrieve()
          .body(Map.class);

      Map<String, Object> profile = (Map<String, Object>) result.get("response");

      return new OAuthUserProfile(
          (String) profile.get("id"),
          (String) profile.get("email"),
          (String) profile.get("nickname"),
          (String) profile.get("profile_image")
      );
    } catch (RestClientException e) {
      log.error("Naver OAuth error: {}", e.getMessage());
      throw new BusinessException(AuthErrorCode.OAUTH_PROVIDER_ERROR);
    }
  }
}
