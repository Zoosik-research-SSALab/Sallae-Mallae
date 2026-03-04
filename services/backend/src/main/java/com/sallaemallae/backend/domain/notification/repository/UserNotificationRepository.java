package com.sallaemallae.backend.domain.notification.repository;

import com.sallaemallae.backend.domain.notification.entity.UserNotification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {
}
