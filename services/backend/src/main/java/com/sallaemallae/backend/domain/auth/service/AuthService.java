package com.sallaemallae.backend.domain.auth.service;

import com.sallaemallae.backend.domain.auth.dto.AuthStatusResponse;
import com.sallaemallae.backend.domain.auth.dto.LoginRequest;
import com.sallaemallae.backend.domain.auth.dto.SignupRequest;
import java.util.Map;

public interface AuthService {

  AuthStatusResponse getAuthStatus();

  Map<String, Object> login(LoginRequest request);

  Map<String, Object> signup(SignupRequest request);

  Map<String, Object> logout();

  String getOAuthStartUrl(String provider);
}
