package com.sallaemallae.backend.domain.main.controller;

import com.sallaemallae.backend.domain.main.dto.MainSummaryResponse;
import com.sallaemallae.backend.domain.main.service.MainService;
import com.sallaemallae.backend.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/main")
@RequiredArgsConstructor
public class MainController {

  private final MainService mainService;

  @GetMapping("/summary")
  public ApiResponse<MainSummaryResponse> summary() {
    return ApiResponse.ok(mainService.getMainSummary());
  }
}
