package com.sallaemallae.backend.domain.auth.controller;

import com.sallaemallae.backend.domain.auth.dto.AuthStatusResponse;
import com.sallaemallae.backend.domain.auth.dto.LoginRequest;
import com.sallaemallae.backend.domain.auth.dto.LoginResponse;
import com.sallaemallae.backend.domain.auth.dto.RefreshResponse;
import com.sallaemallae.backend.domain.auth.dto.SignupRequest;
import com.sallaemallae.backend.domain.auth.service.AuthService;
import com.sallaemallae.backend.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @GetMapping("/status")
  public ApiResponse<AuthStatusResponse> status() {
    return ApiResponse.success(authService.getAuthStatus());
  }

  @PostMapping("/login")
  public ApiResponse<LoginResponse> login(
      @Valid @RequestBody LoginRequest request,
      @RequestHeader("X-Device-Id") String deviceId,
      @RequestHeader(value = "User-Agent", defaultValue = "Unknown") String userAgent,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {

    String ipAddress = getClientIpAddress(httpRequest);
    LoginResponse loginResponse = authService.login(request, deviceId, userAgent, ipAddress,
        response);
    return ApiResponse.success(loginResponse);
  }

  @PostMapping("/signup")
  public ApiResponse<Map<String, Object>> signup(@Valid @RequestBody SignupRequest request) {
    return ApiResponse.success(authService.signup(request));
  }

  @PostMapping("/logout")
  public ApiResponse<Void> logout(
      @RequestHeader("Authorization") String authorization,
      @RequestHeader("X-Device-Id") String deviceId,
      HttpServletResponse response) {

    String accessToken = extractAccessToken(authorization);
    authService.logout(accessToken, deviceId, response);
    return ApiResponse.success();
  }

  @PostMapping("/refresh")
  public ApiResponse<RefreshResponse> refresh(
      @RequestHeader("X-Device-Id") String deviceId,
      HttpServletRequest request,
      HttpServletResponse response) {

    RefreshResponse refreshResponse = authService.refresh(request, deviceId, response);
    return ApiResponse.success(refreshResponse);
  }

  @GetMapping("/oauth/{provider}/start")
  public ApiResponse<Map<String, String>> oauthStart(@PathVariable String provider) {
    return ApiResponse.success(
        Map.of("provider", provider, "redirect", authService.getOAuthStartUrl(provider)));
  }

  private String extractAccessToken(String authorization) {
    if (authorization != null && authorization.startsWith("Bearer ")) {
      return authorization.substring(7);
    }
    return authorization;
  }

  private String getClientIpAddress(HttpServletRequest request) {
    String xForwardedFor = request.getHeader("X-Forwarded-For");
    if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
      return xForwardedFor.split(",")[0].trim();
    }
    String xRealIp = request.getHeader("X-Real-IP");
    if (xRealIp != null && !xRealIp.isEmpty()) {
      return xRealIp;
    }
    return request.getRemoteAddr();
  }
}
