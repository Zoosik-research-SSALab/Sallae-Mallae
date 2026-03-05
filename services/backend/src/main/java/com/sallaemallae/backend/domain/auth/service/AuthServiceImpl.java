package com.sallaemallae.backend.domain.auth.service;

import com.sallaemallae.backend.domain.auth.dto.AuthStatusResponse;
import com.sallaemallae.backend.domain.auth.dto.LoginRequest;
import com.sallaemallae.backend.domain.auth.dto.SignupRequest;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

  @Override
  @Transactional(readOnly = true)
  public AuthStatusResponse getAuthStatus() {
    return new AuthStatusResponse(false, null, "GUEST");
  }

  @Override
  @Transactional
  public Map<String, Object> login(LoginRequest request) {
    return Map.of("message", "auth login boilerplate", "email", request.email());
  }

  @Override
  @Transactional
  public Map<String, Object> signup(SignupRequest request) {
    return Map.of("message", "auth signup boilerplate", "email", request.email());
  }

  @Override
  @Transactional
  public Map<String, Object> logout() {
    return Map.of("message", "auth logout boilerplate");
  }

  @Override
  @Transactional(readOnly = true)
  public String getOAuthStartUrl(String provider) {
    return "/api/v1/auth/oauth/" + provider + "/callback";
  }
}
