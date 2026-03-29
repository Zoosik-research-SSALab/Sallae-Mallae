package com.sallaemallae.backend.domain.signal.repository;

import com.sallaemallae.backend.domain.signal.entity.AiPortfolio;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiPortfolioRepository extends JpaRepository<AiPortfolio, Long> {

  Optional<AiPortfolio> findTopByOrderByUpdatedAtDescIdDesc();
}
