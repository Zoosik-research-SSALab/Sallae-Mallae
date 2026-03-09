package com.sallaemallae.backend.domain.auth.oauth;

import com.sallaemallae.backend.domain.auth.enumtype.AuthProvider;

public interface OAuthProviderClient {

  AuthProvider getProvider();

  OAuthUserProfile getUserProfile(String authorizationCode);
}
