package com.sallaemallae.backend.domain.auth.repository;

import com.sallaemallae.backend.domain.auth.entity.LoginHistory;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoginHistoryRepository extends JpaRepository<LoginHistory, Long> {

  @Query("SELECT lh.createdAt FROM LoginHistory lh "
      + "WHERE lh.userId = :userId AND lh.isSuccess = true "
      + "ORDER BY lh.createdAt DESC LIMIT 1 OFFSET 1")
  Optional<OffsetDateTime> findLastLoginAt(@Param("userId") Long userId);
}
