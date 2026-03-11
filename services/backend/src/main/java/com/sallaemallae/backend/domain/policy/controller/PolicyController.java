package com.sallaemallae.backend.domain.policy.controller;

import com.sallaemallae.backend.domain.auth.enumtype.TermType;
import com.sallaemallae.backend.domain.policy.dto.TermsResponse;
import com.sallaemallae.backend.domain.policy.dto.TermsSummaryResponse;
import com.sallaemallae.backend.domain.policy.service.PolicyService;
import com.sallaemallae.backend.global.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/policy")
@RequiredArgsConstructor
public class PolicyController {

  private final PolicyService policyService;

  @GetMapping("/list")
  public ApiResponse<List<TermsSummaryResponse>> list() {
    return ApiResponse.success(policyService.getTermsList());
  }

  @GetMapping("/terms")
  public ApiResponse<TermsResponse> terms() {
    return ApiResponse.success(policyService.getByType(TermType.SERVICE));
  }

  @GetMapping("/privacy")
  public ApiResponse<TermsResponse> privacy() {
    return ApiResponse.success(policyService.getByType(TermType.PRIVACY));
  }

  @GetMapping("/disclaimer")
  public ApiResponse<TermsResponse> disclaimer() {
    return ApiResponse.success(policyService.getByType(TermType.INVESTMENT_DISCLAIMER));
  }
}
