package com.sallaemallae.backend.domain.auth.repository;

import com.sallaemallae.backend.domain.auth.entity.DeviceSession;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DeviceSessionRepository extends JpaRepository<DeviceSession, Long> {

  Optional<DeviceSession> findByUserIdAndDeviceId(Long userId, String deviceId);

  List<DeviceSession> findByUserIdOrderByLastLoginAtDesc(Long userId);

  int countByUserId(Long userId);

  /**
   * 가장 오래된 세션을 조회합니다. (FIFO 제거용)
   * trust_level이 낮은 순 → last_login_at이 오래된 순으로 정렬합니다.
   */
  @Query("SELECT ds FROM DeviceSession ds WHERE ds.userId = :userId "
      + "ORDER BY CASE ds.trustLevel "
      + "WHEN com.sallaemallae.backend.domain.auth.enumtype.TrustLevel.NEW THEN 0 "
      + "WHEN com.sallaemallae.backend.domain.auth.enumtype.TrustLevel.RECOGNIZED THEN 1 "
      + "WHEN com.sallaemallae.backend.domain.auth.enumtype.TrustLevel.TRUSTED THEN 2 "
      + "END ASC, ds.lastLoginAt ASC")
  List<DeviceSession> findByUserIdOrderByEvictionPriority(@Param("userId") Long userId);

  void deleteByUserIdAndDeviceId(Long userId, String deviceId);

  void deleteAllByUserId(Long userId);
}
