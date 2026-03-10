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
public class KakaoOAuthClient implements OAuthProviderClient {

  private final String clientId;
  private final String clientSecret;
  private final String redirectUri;
  private final RestClient restClient;

  public KakaoOAuthClient(
      @Value("${oauth.kakao.client-id:}") String clientId,
      @Value("${oauth.kakao.client-secret:}") String clientSecret,
      @Value("${oauth.kakao.redirect-uri:}") String redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.restClient = RestClient.create();
  }

  @Override
  public AuthProvider getProvider() {
    return AuthProvider.KAKAO;
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
          .uri("https://kauth.kakao.com/oauth/token")
          .contentType(MediaType.APPLICATION_FORM_URLENCODED)
          .body(tokenRequest)
          .retrieve()
          .body(Map.class);

      String accessToken = (String) tokenResponse.get("access_token");

      // 2. 사용자 프로필 조회 (카카오는 kakao_account.profile에 중첩)
      Map<String, Object> result = restClient.get()
          .uri("https://kapi.kakao.com/v2/user/me")
          .header("Authorization", "Bearer " + accessToken)
          .retrieve()
          .body(Map.class);

      Map<String, Object> kakaoAccount = (Map<String, Object>) result.get("kakao_account");
      Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");

      return new OAuthUserProfile(
          String.valueOf(result.get("id")),
          (String) kakaoAccount.get("email"),
          (String) profile.get("nickname"),
          (String) profile.get("profile_image_url")
      );
    } catch (RestClientException e) {
      log.error("Kakao OAuth error: {}", e.getMessage());
      throw new BusinessException(AuthErrorCode.OAUTH_PROVIDER_ERROR);
    }
  }
}
