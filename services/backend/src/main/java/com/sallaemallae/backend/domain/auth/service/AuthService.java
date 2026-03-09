package com.sallaemallae.backend.domain.auth.service;

import com.sallaemallae.backend.domain.auth.dto.AuthStatusResponse;
import com.sallaemallae.backend.domain.auth.dto.LoginRequest;
import com.sallaemallae.backend.domain.auth.dto.LoginResponse;
import com.sallaemallae.backend.domain.auth.dto.RefreshResponse;
import com.sallaemallae.backend.domain.auth.dto.SignupRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

public interface AuthService {

  AuthStatusResponse getAuthStatus();

  LoginResponse login(LoginRequest request, String deviceId, String userAgent, String ipAddress,
      HttpServletResponse response);

  Map<String, Object> signup(SignupRequest request);

  void logout(String accessToken, String deviceId, HttpServletResponse response);

  RefreshResponse refresh(HttpServletRequest request, String deviceId,
      HttpServletResponse response);

  String getOAuthStartUrl(String provider);
}
