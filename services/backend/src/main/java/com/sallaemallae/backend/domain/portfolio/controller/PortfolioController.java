package com.sallaemallae.backend.domain.portfolio.controller;

import com.sallaemallae.backend.domain.portfolio.dto.ChairmanPortfolioResponse;
import com.sallaemallae.backend.domain.portfolio.service.PortfolioService;
import com.sallaemallae.backend.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

  private final PortfolioService portfolioService;

  @GetMapping("/chairman")
  public ApiResponse<ChairmanPortfolioResponse> chairman() {
    return ApiResponse.ok(portfolioService.getChairmanPortfolio());
  }
}
