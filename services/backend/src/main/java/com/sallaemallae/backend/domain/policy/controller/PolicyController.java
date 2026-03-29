package com.sallaemallae.backend.domain.policy.controller;

import com.sallaemallae.backend.domain.auth.enumtype.TermType;
import com.sallaemallae.backend.domain.policy.dto.TermsResponse;
import com.sallaemallae.backend.domain.policy.service.PolicyService;
import com.sallaemallae.backend.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Policy", description = "약관 API")
@RestController
@RequestMapping("/api/policy")
@RequiredArgsConstructor
public class PolicyController {

  private final PolicyService policyService;

  @Operation(summary = "서비스 이용약관 조회", description = "현재 활성화된 서비스 이용약관의 전문을 반환합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "약관 정보를 찾을 수 없음")
  })
  @GetMapping("/terms")
  public ApiResponse<TermsResponse> terms() {
    return ApiResponse.success(policyService.getByType(TermType.SERVICE));
  }

  @Operation(summary = "개인정보 처리방침 조회", description = "현재 활성화된 개인정보 처리방침의 전문을 반환합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "약관 정보를 찾을 수 없음")
  })
  @GetMapping("/privacy")
  public ApiResponse<TermsResponse> privacy() {
    return ApiResponse.success(policyService.getByType(TermType.PRIVACY));
  }

  @Operation(summary = "투자 면책 고지 조회", description = "현재 활성화된 투자 면책 고지의 전문을 반환합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "약관 정보를 찾을 수 없음")
  })
  @GetMapping("/disclaimer")
  public ApiResponse<TermsResponse> disclaimer() {
    return ApiResponse.success(policyService.getByType(TermType.INVESTMENT_DISCLAIMER));
  }
}
