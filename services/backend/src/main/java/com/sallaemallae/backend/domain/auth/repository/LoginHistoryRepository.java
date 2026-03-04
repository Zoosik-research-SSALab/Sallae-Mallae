package com.sallaemallae.backend.domain.auth.repository;

import com.sallaemallae.backend.domain.auth.entity.LoginHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginHistoryRepository extends JpaRepository<LoginHistory, Long> {
}
