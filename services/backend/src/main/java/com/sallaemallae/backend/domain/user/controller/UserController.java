package com.sallaemallae.backend.domain.user.controller;

import com.sallaemallae.backend.domain.user.dto.UserEmailOptInRequest;
import com.sallaemallae.backend.domain.user.dto.UserPasswordUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.UserProfileUpdateRequest;
import com.sallaemallae.backend.domain.user.service.UserService;
import com.sallaemallae.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  @PatchMapping("/profile")
  public ApiResponse<Map<String, Object>> updateProfile(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @Valid @RequestBody UserProfileUpdateRequest request) {
    return ApiResponse.success(userService.updateProfile(userId, request));
  }

  @PutMapping("/profile/password")
  public ApiResponse<Map<String, Object>> updatePassword(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @Valid @RequestBody UserPasswordUpdateRequest request) {
    return ApiResponse.success(userService.updatePassword(userId, request));
  }

  @PatchMapping("/profile/email-opt-in")
  public ApiResponse<Map<String, Object>> updateEmailOptIn(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @Valid @RequestBody UserEmailOptInRequest request) {
    return ApiResponse.success(userService.updateEmailOptIn(userId, request));
  }

  @DeleteMapping("/profile")
  public ApiResponse<Map<String, Object>> deleteProfile(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId) {
    return ApiResponse.success(userService.deleteProfile(userId));
  }
}
