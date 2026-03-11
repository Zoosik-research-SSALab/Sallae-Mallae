package com.sallaemallae.backend.domain.policy.controller;

import com.sallaemallae.backend.domain.policy.service.PolicyService;
import com.sallaemallae.backend.global.response.ApiResponse;
import java.util.List;
import java.util.Map;
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
  public ApiResponse<List<Map<String, Object>>> list() {
    return ApiResponse.success(policyService.getTermsList());
  }

  @GetMapping("/terms")
  public ApiResponse<Map<String, Object>> terms() {
    return ApiResponse.success(policyService.getTerms());
  }

  @GetMapping("/privacy")
  public ApiResponse<Map<String, Object>> privacy() {
    return ApiResponse.success(policyService.getPrivacy());
  }

  @GetMapping("/disclaimer")
  public ApiResponse<Map<String, Object>> disclaimer() {
    return ApiResponse.success(policyService.getDisclaimer());
  }
}
