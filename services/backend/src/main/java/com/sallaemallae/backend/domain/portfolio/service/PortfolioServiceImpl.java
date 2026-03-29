package com.sallaemallae.backend.domain.portfolio.service;

import com.sallaemallae.backend.domain.portfolio.dto.ChairmanPortfolioResponse;
import org.springframework.stereotype.Service;

@Service
public class PortfolioServiceImpl implements PortfolioService {

  @Override
  public ChairmanPortfolioResponse getChairmanPortfolio() {
    return new ChairmanPortfolioResponse("의장 포트폴리오", 3.24, 12, 7);
  }
}
