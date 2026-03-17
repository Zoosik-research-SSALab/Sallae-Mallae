package com.sallaemallae.backend.domain.user.controller;

import com.sallaemallae.backend.domain.user.dto.request.UserEmailOptInRequest;
import com.sallaemallae.backend.domain.user.dto.request.UserPasswordUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.request.UserProfileUpdateRequest;
import com.sallaemallae.backend.domain.user.service.UserService;
import com.sallaemallae.backend.global.response.ApiResponse;
import com.sallaemallae.backend.global.security.AuthenticatedUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "User", description = "사용자 API")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;
  private final AuthenticatedUserProvider authenticatedUserProvider;

  @PatchMapping("/profile")
  public ApiResponse<Map<String, Object>> updateProfile(
      @Valid @RequestBody UserProfileUpdateRequest request) {
    Long userId = authenticatedUserProvider.getCurrentUserId();
    return ApiResponse.success(userService.updateProfile(userId, request));
  }

  @Operation(summary = "비밀번호 변경", description = "로그인 상태에서 현재 비밀번호를 확인 후 새 비밀번호로 변경합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "비밀번호 변경 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "현재 비밀번호 불일치"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "소셜 계정/동일 비밀번호")
  })
  @PutMapping("/profile/password")
  public ApiResponse<Map<String, Object>> updatePassword(
      @Valid @RequestBody UserPasswordUpdateRequest request) {
    Long userId = authenticatedUserProvider.getCurrentUserId();
    return ApiResponse.success(userService.updatePassword(userId, request));
  }

  @PatchMapping("/profile/email-opt-in")
  public ApiResponse<Map<String, Object>> updateEmailOptIn(
      @Valid @RequestBody UserEmailOptInRequest request) {
    Long userId = authenticatedUserProvider.getCurrentUserId();
    return ApiResponse.success(userService.updateEmailOptIn(userId, request));
  }

  @DeleteMapping("/profile")
  public ApiResponse<Map<String, Object>> deleteProfile() {
    Long userId = authenticatedUserProvider.getCurrentUserId();
    return ApiResponse.success(userService.deleteProfile(userId));
  }
}
