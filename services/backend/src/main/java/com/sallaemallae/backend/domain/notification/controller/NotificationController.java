package com.sallaemallae.backend.domain.notification.controller;

import com.sallaemallae.backend.domain.notification.dto.response.NotificationActionResponse;
import com.sallaemallae.backend.domain.notification.dto.response.NotificationBulkActionResponse;
import com.sallaemallae.backend.domain.notification.dto.response.NotificationListResponse;
import com.sallaemallae.backend.domain.notification.dto.response.NotificationSettingsResponse;
import com.sallaemallae.backend.domain.notification.dto.request.NotificationSettingsUpdateRequest;
import com.sallaemallae.backend.domain.notification.dto.request.NotificationTabRequest;
import com.sallaemallae.backend.domain.notification.dto.response.NotificationUnreadCountResponse;
import com.sallaemallae.backend.domain.notification.service.NotificationService;
import com.sallaemallae.backend.global.response.ApiResponse;
import com.sallaemallae.backend.global.security.AuthenticatedUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "알림", description = "사용자 알림 API")
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

  private final NotificationService notificationService;
  private final AuthenticatedUserProvider authenticatedUserProvider;

  /** FS-NOTI-001: 미확인 알림 수 조회 */
  @Operation(summary = "미확인 알림 수 조회", description = "헤더 배지에 표시할 미확인 알림 수를 조회합니다.")
  @GetMapping("/unread-count")
  public ApiResponse<NotificationUnreadCountResponse> getUnreadCount() {
    return ApiResponse.success(notificationService.getUnreadCount(authenticatedUserProvider.getCurrentUserId()));
  }

  /** FS-NOTI-002: 알림 내역 조회 */
  @Operation(summary = "알림 목록 조회", description = "탭별 알림 내역을 offset/limit 기반으로 조회합니다.")
  @GetMapping("/list")
  public ApiResponse<NotificationListResponse> getNotifications(
      @Parameter(description = "알림 탭", example = "ALL")
      @RequestParam(defaultValue = "ALL") String tab,
      @Parameter(description = "페이지 오프셋", example = "0")
      @RequestParam(defaultValue = "0") int offset,
      @Parameter(description = "페이지 크기", example = "6")
      @RequestParam(defaultValue = "6") int limit
  ) {
    return ApiResponse.success(
        notificationService.getNotifications(authenticatedUserProvider.getCurrentUserId(), tab, offset, limit)
    );
  }

  /** FS-NOTI-003: 개별 알림 읽음 처리 */
  @Operation(summary = "개별 알림 읽음 처리", description = "선택한 알림 1건을 읽음 처리합니다.")
  @PatchMapping("/{notificationId}")
  public ApiResponse<NotificationActionResponse> markAsRead(
      @Parameter(description = "사용자 알림 ID", example = "11")
      @PathVariable Long notificationId
  ) {
    return ApiResponse.success(
        notificationService.markAsRead(authenticatedUserProvider.getCurrentUserId(), notificationId)
    );
  }

  /** FS-NOTI-004: 현재 탭 범위 전체 읽음 처리 */
  @Operation(summary = "알림 전체 읽음 처리", description = "현재 탭 범위의 알림을 전체 읽음 처리합니다.")
  @PatchMapping("/read-all")
  public ApiResponse<NotificationBulkActionResponse> markAllAsRead(
      @RequestBody NotificationTabRequest request
  ) {
    return ApiResponse.success(
        notificationService.markAllAsRead(authenticatedUserProvider.getCurrentUserId(), request.tab())
    );
  }

  /** FS-NOTI-005: 개별 알림 삭제 */
  @Operation(summary = "개별 알림 삭제", description = "선택한 알림 1건을 삭제합니다.")
  @DeleteMapping("/{notificationId}")
  public ApiResponse<NotificationActionResponse> deleteNotification(
      @Parameter(description = "사용자 알림 ID", example = "11")
      @PathVariable Long notificationId
  ) {
    return ApiResponse.success(
        notificationService.deleteNotification(authenticatedUserProvider.getCurrentUserId(), notificationId)
    );
  }

  /** FS-NOTI-006: 알림 일괄 삭제 */
  @Operation(summary = "알림 일괄 삭제", description = "현재 탭 범위의 알림을 일괄 삭제합니다.")
  @DeleteMapping
  public ApiResponse<NotificationBulkActionResponse> deleteNotifications(
      @Parameter(description = "알림 탭", example = "ALL")
      @RequestParam(defaultValue = "ALL") String tab
  ) {
    return ApiResponse.success(
        notificationService.deleteNotifications(authenticatedUserProvider.getCurrentUserId(), tab)
    );
  }

  /** 알림 설정 조회 */
  @Operation(summary = "알림 설정 조회", description = "전체 알림 및 이메일 알림 ON/OFF 설정을 조회합니다.")
  @GetMapping("/settings")
  public ApiResponse<NotificationSettingsResponse> getNotificationSettings() {
    return ApiResponse.success(
        notificationService.getNotificationSettings(authenticatedUserProvider.getCurrentUserId())
    );
  }

  /** 알림 설정 변경 */
  @Operation(summary = "알림 설정 변경", description = "전체 알림 및 이메일 알림 ON/OFF 설정을 변경합니다.")
  @PatchMapping("/settings")
  public ApiResponse<NotificationSettingsResponse> updateNotificationSettings(
      @Valid @RequestBody NotificationSettingsUpdateRequest request) {
    return ApiResponse.success(
        notificationService.updateNotificationSettings(authenticatedUserProvider.getCurrentUserId(), request)
    );
  }
}
