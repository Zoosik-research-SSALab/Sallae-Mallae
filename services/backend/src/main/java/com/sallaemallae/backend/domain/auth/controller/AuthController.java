package com.sallaemallae.backend.domain.auth.controller;

import com.sallaemallae.backend.domain.auth.dto.AuthStatusResponse;
import com.sallaemallae.backend.domain.auth.dto.LoginRequest;
import com.sallaemallae.backend.domain.auth.dto.SignupRequest;
import com.sallaemallae.backend.domain.auth.service.AuthService;
import com.sallaemallae.backend.global.dto.ApiResponse;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @GetMapping("/status")
  public ApiResponse<AuthStatusResponse> status() {
    return ApiResponse.ok(authService.getAuthStatus());
  }

  @PostMapping("/login")
  public ApiResponse<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
    return ApiResponse.ok(authService.login(request));
  }

  @PostMapping("/signup")
  public ApiResponse<Map<String, Object>> signup(@Valid @RequestBody SignupRequest request) {
    return ApiResponse.ok(authService.signup(request));
  }

  @PostMapping("/logout")
  public ApiResponse<Map<String, Object>> logout() {
    return ApiResponse.ok(authService.logout());
  }

  @GetMapping("/oauth/{provider}/start")
  public ApiResponse<Map<String, String>> oauthStart(@PathVariable String provider) {
    return ApiResponse.ok(Map.of("provider", provider, "redirect", authService.getOAuthStartUrl(provider)));
  }
}
