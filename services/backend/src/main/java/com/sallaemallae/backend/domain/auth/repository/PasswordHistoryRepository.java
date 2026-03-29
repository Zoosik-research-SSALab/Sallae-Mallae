package com.sallaemallae.backend.domain.auth.repository;

import com.sallaemallae.backend.domain.auth.entity.PasswordHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordHistoryRepository extends JpaRepository<PasswordHistory, Long> {

  @Query("SELECT ph FROM PasswordHistory ph WHERE ph.userId = :userId ORDER BY ph.changedAt DESC")
  List<PasswordHistory> findByUserIdOrderByChangedAtDesc(@Param("userId") Long userId);

  @Query(value = "SELECT ph FROM PasswordHistory ph WHERE ph.userId = :userId ORDER BY ph.changedAt DESC LIMIT :limit")
  List<PasswordHistory> findRecentByUserId(@Param("userId") Long userId, @Param("limit") int limit);
}
