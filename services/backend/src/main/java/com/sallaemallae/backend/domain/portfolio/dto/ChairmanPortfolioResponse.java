package com.sallaemallae.backend.domain.portfolio.dto;

public record ChairmanPortfolioResponse(String name, double cumulativeReturn, int totalTrades, int winningTrades) {
}
