package com.sallaemallae.backend.domain.report.service;

import com.sallaemallae.backend.domain.report.dto.ChairmanHallOfFameResponse;
import com.sallaemallae.backend.domain.report.dto.ChairmanPortfolioResponse;

public interface ChairmanPortfolioService {

  ChairmanPortfolioResponse getChairmanPortfolio(String tab, int offset, int limit);

  ChairmanHallOfFameResponse getChairmanHallOfFame();
}
