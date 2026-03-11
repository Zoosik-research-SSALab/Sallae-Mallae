package com.sallaemallae.backend.domain.signal.repository;

import com.sallaemallae.backend.domain.signal.entity.AiPortfolioHolding;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiPortfolioHoldingRepository extends JpaRepository<AiPortfolioHolding, Long> {

  Optional<AiPortfolioHolding> findByPortfolioIdAndStockId(Long portfolioId, Long stockId);
}
