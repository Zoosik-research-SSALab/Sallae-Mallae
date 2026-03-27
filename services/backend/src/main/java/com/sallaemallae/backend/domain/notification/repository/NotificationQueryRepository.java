package com.sallaemallae.backend.domain.notification.repository;

import com.sallaemallae.backend.domain.notification.dto.response.NotificationItemResponse;
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
    String query = """
        SELECT un.id,
               sn.noti_type,
               s.name,
               sn.message,
               un.is_read,
               un.created_at,
               sn.stock_id,
               s.icon_url
        FROM user_notifications un
                 JOIN stock_notifications sn ON sn.id = un.notification_id
                 JOIN stocks s ON s.id = sn.stock_id
        WHERE un.user_id = :userId
          AND un.created_at >= :cutoff
        """
        + buildNotificationTypeCondition(tab, "sn")
        + """
        ORDER BY un.created_at DESC, un.id DESC
        """;

    var nativeQuery = entityManager.createNativeQuery(query);
    bindCommonParameters(nativeQuery, userId, cutoff);
    bindNotificationTypeParameter(nativeQuery, tab);

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
    String query = """
        UPDATE user_notifications un
        SET is_read = true
        WHERE un.user_id = :userId
          AND un.is_read = false
          AND un.created_at >= :cutoff
        """
        + buildNotificationIdFilter(tab);

    var nativeQuery = entityManager.createNativeQuery(query);
    bindCommonParameters(nativeQuery, userId, cutoff);
    bindNotificationTypeParameter(nativeQuery, tab);

    return nativeQuery.executeUpdate();
  }

  public long deleteAll(Long userId, NotificationTab tab, OffsetDateTime cutoff) {
    String query = """
        DELETE FROM user_notifications un
        WHERE un.user_id = :userId
          AND un.created_at >= :cutoff
        """
        + buildNotificationIdFilter(tab);

    var nativeQuery = entityManager.createNativeQuery(query);
    bindCommonParameters(nativeQuery, userId, cutoff);
    bindNotificationTypeParameter(nativeQuery, tab);

    return nativeQuery.executeUpdate();
  }

  private String buildNotificationTypeCondition(NotificationTab tab, String alias) {
    if (tab == NotificationTab.ALL) {
      return "";
    }
    return " AND " + alias + ".noti_type IN (:notiTypes)\n";
  }

  private String buildNotificationIdFilter(NotificationTab tab) {
    if (tab == NotificationTab.ALL) {
      return "";
    }
    return """
          AND un.notification_id IN (
            SELECT sn.id
            FROM stock_notifications sn
            WHERE sn.noti_type IN (:notiTypes)
          )
        """;
  }

  private void bindCommonParameters(jakarta.persistence.Query query, Long userId, OffsetDateTime cutoff) {
    query.setParameter("userId", userId);
    query.setParameter("cutoff", cutoff);
  }

  private void bindNotificationTypeParameter(jakarta.persistence.Query query, NotificationTab tab) {
    if (tab != NotificationTab.ALL) {
      query.setParameter("notiTypes", toDatabaseTypes(tab));
    }
  }

  private NotificationItemResponse toNotificationItem(Object[] row) {
    return new NotificationItemResponse(
        toLong(row[0]),
        toResponseType((String) row[1]),
        (String) row[2],
        (String) row[3],
        toBoolean(row[4]),
        toOffsetDateTime(row[5]),
        toLong(row[6]),
        (String) row[7]
    );
  }

  private List<String> toDatabaseTypes(NotificationTab tab) {
    return tab.getNotifyTypes().stream()
        .map(NotifyType::name)
        .toList();
  }

  private String toResponseType(String value) {
    if (value == null) {
      return null;
    }
    if ("SURGE_PLUNGE".equals(value)) {
      return NotifyType.SURGE.getResponseValue();
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
