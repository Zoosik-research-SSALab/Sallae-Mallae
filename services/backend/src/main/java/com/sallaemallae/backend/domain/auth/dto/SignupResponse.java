package com.sallaemallae.backend.domain.auth.dto;

import com.sallaemallae.backend.domain.auth.entity.User;
import com.sallaemallae.backend.domain.auth.enumtype.AuthProvider;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SignupResponse {

  private final String accessToken;
  private final String tokenType;
  private final long expiresIn;
  private final UserInfo user;

  @Getter
  @Builder
  public static class UserInfo {

    private final Long userId;
    private final String email;
    private final String nickname;
    private final String profileImageUrl;
    private final AuthProvider provider;
    private final String role;

    public static UserInfo from(User user) {
      return UserInfo.builder()
          .userId(user.getId())
          .email(user.getEmail())
          .nickname(user.getNickname())
          .profileImageUrl(user.getProfileImageUrl())
          .provider(AuthProvider.EMAIL)
          .role(user.isAdmin() ? "ADMIN" : "USER")
          .build();
    }
  }

  public static SignupResponse of(String accessToken, long expiresIn, User user) {
    return SignupResponse.builder()
        .accessToken(accessToken)
        .tokenType("Bearer")
        .expiresIn(expiresIn)
        .user(UserInfo.from(user))
        .build();
  }
}
