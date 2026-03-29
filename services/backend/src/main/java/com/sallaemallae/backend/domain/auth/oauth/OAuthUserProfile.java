package com.sallaemallae.backend.domain.auth.oauth;

public record OAuthUserProfile(
    String providerAccountId,
    String email,
    String nickname,
    String profileImageUrl
) {
}
