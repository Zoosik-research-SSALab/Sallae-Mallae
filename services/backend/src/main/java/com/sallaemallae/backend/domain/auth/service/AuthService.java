package com.sallaemallae.backend.domain.auth.service;

import com.sallaemallae.backend.domain.auth.dto.AuthStatusResponse;
import com.sallaemallae.backend.domain.auth.dto.CheckEmailResponse;
import com.sallaemallae.backend.domain.auth.dto.LoginRequest;
import com.sallaemallae.backend.domain.auth.dto.LoginResponse;
import com.sallaemallae.backend.domain.auth.dto.OAuthCallbackRequest;
import com.sallaemallae.backend.domain.auth.dto.OAuthCallbackResponse;
import com.sallaemallae.backend.domain.auth.dto.OAuthTermsAgreeRequest;
import com.sallaemallae.backend.domain.auth.dto.RefreshResponse;
import com.sallaemallae.backend.domain.auth.dto.SendCodeRequest;
import com.sallaemallae.backend.domain.auth.dto.SendCodeResponse;
import com.sallaemallae.backend.domain.auth.dto.SignupRequest;
import com.sallaemallae.backend.domain.auth.dto.SignupResponse;
import com.sallaemallae.backend.domain.auth.dto.VerifyCodeRequest;
import com.sallaemallae.backend.domain.auth.dto.VerifyCodeResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public interface AuthService {

  AuthStatusResponse getAuthStatus();

  LoginResponse login(LoginRequest request, String deviceId, String userAgent, String ipAddress,
      HttpServletResponse response);

  CheckEmailResponse checkEmailDuplicate(String email);

  SendCodeResponse sendVerificationCode(SendCodeRequest request);

  VerifyCodeResponse verifyCode(VerifyCodeRequest request);

  SignupResponse signup(SignupRequest request, String deviceId, String userAgent, String ipAddress,
      HttpServletResponse response);

  void logout(String accessToken, String deviceId, HttpServletResponse response);

  RefreshResponse refresh(HttpServletRequest request, String deviceId,
      HttpServletResponse response);

  String getOAuthStartUrl(String provider);

  OAuthCallbackResponse oauthCallback(String provider, OAuthCallbackRequest request,
      String deviceId, String userAgent, String ipAddress, HttpServletResponse response);

  LoginResponse oauthTermsAgree(OAuthTermsAgreeRequest request,
      String deviceId, String userAgent, String ipAddress, HttpServletResponse response);
}
