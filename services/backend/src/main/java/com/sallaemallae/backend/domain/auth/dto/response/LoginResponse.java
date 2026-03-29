package com.sallaemallae.backend.domain.auth.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.sallaemallae.backend.domain.auth.entity.User;
import com.sallaemallae.backend.domain.auth.enumtype.AuthProvider;
import java.time.OffsetDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {

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

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private final OffsetDateTime lastLoginAt;

    public static UserInfo from(User user, AuthProvider provider, OffsetDateTime lastLoginAt) {
      return UserInfo.builder()
          .userId(user.getId())
          .email(user.getEmail())
          .nickname(user.getNickname())
          .profileImageUrl(user.getProfileImageUrl())
          .provider(provider)
          .role(user.isAdmin() ? "ADMIN" : "USER")
          .lastLoginAt(lastLoginAt)
          .build();
    }
  }

  public static LoginResponse of(String accessToken, long expiresIn, UserInfo userInfo) {
    return LoginResponse.builder()
        .accessToken(accessToken)
        .tokenType("Bearer")
        .expiresIn(expiresIn)
        .user(userInfo)
        .build();
  }
}
