package com.sallaemallae.backend.domain.signal.repository;

import com.sallaemallae.backend.domain.signal.entity.AiTradingHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiTradingHistoryRepository extends JpaRepository<AiTradingHistory, Long> {
}
