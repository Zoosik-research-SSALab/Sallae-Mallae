package com.sallaemallae.backend.domain.auth.service;

import com.sallaemallae.backend.domain.auth.dto.response.CheckEmailResponse;
import com.sallaemallae.backend.domain.auth.dto.request.LoginRequest;
import com.sallaemallae.backend.domain.auth.dto.response.LoginResponse;
import com.sallaemallae.backend.domain.auth.dto.request.OAuthCallbackRequest;
import com.sallaemallae.backend.domain.auth.dto.response.OAuthCallbackResponse;
import com.sallaemallae.backend.domain.auth.dto.request.OAuthTermsAgreeRequest;
import com.sallaemallae.backend.domain.auth.dto.request.PasswordResetConfirmRequest;
import com.sallaemallae.backend.domain.auth.dto.request.PasswordResetRequestDto;
import com.sallaemallae.backend.domain.auth.dto.response.RefreshResponse;
import com.sallaemallae.backend.domain.auth.dto.request.SendCodeRequest;
import com.sallaemallae.backend.domain.auth.dto.response.SendCodeResponse;
import com.sallaemallae.backend.domain.auth.dto.request.SignupRequest;
import com.sallaemallae.backend.domain.auth.dto.response.SignupResponse;
import com.sallaemallae.backend.domain.auth.dto.request.VerifyCodeRequest;
import com.sallaemallae.backend.domain.auth.dto.response.VerifyCodeResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public interface AuthService {

  LoginResponse login(LoginRequest request, String deviceId, String userAgent, String ipAddress,
      HttpServletResponse response);

  CheckEmailResponse checkEmailDuplicate(String email);

  SendCodeResponse sendVerificationCode(SendCodeRequest request);

  VerifyCodeResponse verifyCode(VerifyCodeRequest request);

  SignupResponse signup(SignupRequest request, String deviceId, String userAgent, String ipAddress,
      HttpServletResponse response);

  void logout(String accessToken, String deviceId, HttpServletResponse response);

  int logoutAll(String accessToken, String deviceId, HttpServletResponse response);

  RefreshResponse refresh(HttpServletRequest request, String deviceId,
      HttpServletResponse response);

  String getOAuthStartUrl(String provider);

  OAuthCallbackResponse oauthCallback(String provider, OAuthCallbackRequest request,
      String deviceId, String userAgent, String ipAddress, HttpServletResponse response);

  LoginResponse oauthTermsAgree(OAuthTermsAgreeRequest request,
      String deviceId, String userAgent, String ipAddress, HttpServletResponse response);

  SendCodeResponse requestPasswordReset(PasswordResetRequestDto request);

  void resetPassword(PasswordResetConfirmRequest request, String ipAddress);

  LoginResponse.UserInfo getCurrentUser(Long userId);
}
