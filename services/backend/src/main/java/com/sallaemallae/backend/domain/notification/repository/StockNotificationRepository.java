package com.sallaemallae.backend.domain.notification.repository;

import com.sallaemallae.backend.domain.notification.entity.StockNotification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockNotificationRepository extends JpaRepository<StockNotification, Long> {
}
