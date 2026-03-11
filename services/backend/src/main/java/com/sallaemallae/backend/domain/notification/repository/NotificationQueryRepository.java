package com.sallaemallae.backend.domain.notification.repository;

import com.sallaemallae.backend.domain.notification.dto.NotificationItemResponse;
import com.sallaemallae.backend.domain.notification.enumtype.NotificationTab;
import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class NotificationQueryRepository {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");

  private final EntityManager entityManager;

  public long countUnreadNotifications(Long userId, OffsetDateTime cutoff) {
    Number result = (Number) entityManager.createNativeQuery("""
        SELECT COUNT(*)
        FROM user_notifications un
        WHERE un.user_id = :userId
          AND un.is_read = false
          AND un.created_at >= :cutoff
        """)
        .setParameter("userId", userId)
        .setParameter("cutoff", cutoff)
        .getSingleResult();

    return result.longValue();
  }

  public List<NotificationItemResponse> findNotifications(
      Long userId,
      NotificationTab tab,
      int offset,
      int limit,
      OffsetDateTime cutoff
  ) {
    StringBuilder query = new StringBuilder("""
        SELECT un.id,
               sn.noti_type,
               s.name,
               sn.message,
               un.is_read,
               un.created_at,
               sn.stock_id
        FROM user_notifications un
                 JOIN stock_notifications sn ON sn.id = un.notification_id
                 JOIN stocks s ON s.id = sn.stock_id
        WHERE un.user_id = :userId
          AND un.created_at >= :cutoff
        """);

    if (tab != NotificationTab.ALL) {
      query.append("""
            AND sn.noti_type = :notiType
          """);
    }

    query.append("""
        ORDER BY un.created_at DESC, un.id DESC
        """);

    var nativeQuery = entityManager.createNativeQuery(query.toString())
        .setParameter("userId", userId)
        .setParameter("cutoff", cutoff);

    if (tab != NotificationTab.ALL) {
      nativeQuery.setParameter("notiType", toDatabaseType(tab));
    }

    @SuppressWarnings("unchecked")
    List<Object[]> rows = nativeQuery
        .setFirstResult(offset)
        .setMaxResults(limit)
        .getResultList();

    return rows.stream()
        .map(this::toNotificationItem)
        .toList();
  }

  public long markAllAsRead(Long userId, NotificationTab tab, OffsetDateTime cutoff) {
    StringBuilder query = new StringBuilder("""
        UPDATE user_notifications un
        SET is_read = true
        WHERE un.user_id = :userId
          AND un.is_read = false
          AND un.created_at >= :cutoff
        """);

    if (tab != NotificationTab.ALL) {
      query.append("""
          AND un.notification_id IN (
            SELECT sn.id
            FROM stock_notifications sn
            WHERE sn.noti_type = :notiType
          )
          """);
    }

    var nativeQuery = entityManager.createNativeQuery(query.toString())
        .setParameter("userId", userId)
        .setParameter("cutoff", cutoff);

    if (tab != NotificationTab.ALL) {
      nativeQuery.setParameter("notiType", toDatabaseType(tab));
    }

    return nativeQuery.executeUpdate();
  }

  public long deleteAll(Long userId, NotificationTab tab, OffsetDateTime cutoff) {
    StringBuilder query = new StringBuilder("""
        DELETE FROM user_notifications un
        WHERE un.user_id = :userId
          AND un.created_at >= :cutoff
        """);

    if (tab != NotificationTab.ALL) {
      query.append("""
          AND un.notification_id IN (
            SELECT sn.id
            FROM stock_notifications sn
            WHERE sn.noti_type = :notiType
          )
          """);
    }

    var nativeQuery = entityManager.createNativeQuery(query.toString())
        .setParameter("userId", userId)
        .setParameter("cutoff", cutoff);

    if (tab != NotificationTab.ALL) {
      nativeQuery.setParameter("notiType", toDatabaseType(tab));
    }

    return nativeQuery.executeUpdate();
  }

  private NotificationItemResponse toNotificationItem(Object[] row) {
    return new NotificationItemResponse(
        toLong(row[0]),
        toResponseType((String) row[1]),
        (String) row[2],
        (String) row[3],
        toBoolean(row[4]),
        toOffsetDateTime(row[5]),
        toLong(row[6])
    );
  }

  private String toDatabaseType(NotificationTab tab) {
    NotifyType notifyType = tab.getNotifyType();
    return notifyType == null ? null : notifyType.name();
  }

  private String toResponseType(String value) {
    if (value == null) {
      return null;
    }
    return NotifyType.valueOf(value).getResponseValue();
  }

  private Long toLong(Object value) {
    if (value == null) {
      return null;
    }
    return ((Number) value).longValue();
  }

  private boolean toBoolean(Object value) {
    if (value instanceof Boolean booleanValue) {
      return booleanValue;
    }
    return value != null && Boolean.parseBoolean(value.toString());
  }

  private OffsetDateTime toOffsetDateTime(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof OffsetDateTime dateTime) {
      return dateTime;
    }
    if (value instanceof Timestamp timestamp) {
      return timestamp.toInstant().atZone(ZONE_ID).toOffsetDateTime();
    }
    return null;
  }
}
