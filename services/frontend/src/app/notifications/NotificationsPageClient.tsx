"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LuSettings2 } from "react-icons/lu";
import { useRouter } from "next/navigation";
import ProtectedPage from "@/shared/components/ProtectedPage";
import { useNotificationCountQuery } from "@/shared/hooks/useNotificationCountQuery";
import {
  deleteNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  updateNotificationSettings,
} from "./api/getNotifications";
import NotificationAnnouncementModal from "./components/NotificationAnnouncementModal";
import NotificationList from "./components/NotificationList";
import NotificationSettingsModal from "./components/NotificationSettingsModal";
import NotificationTabs from "./components/NotificationTabs";
import { useNotificationSettingsQuery } from "./hooks/useNotificationSettingsQuery";
import { notificationsQueryKeys, useNotificationsListQuery } from "./hooks/useNotificationsListQuery";
import type { NotificationItem, NotificationTab } from "./types/notifications";

const PAGE_SIZE = 6;

export default function NotificationsPageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<NotificationTab>("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<NotificationItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const notificationsQuery = useNotificationsListQuery(activeTab, visibleCount);
  const settingsQuery = useNotificationSettingsQuery(false);
  const notificationCountQuery = useNotificationCountQuery(true);

  const notifications = useMemo(() => notificationsQuery.data?.notifications ?? [], [notificationsQuery.data?.notifications]);
  const hasMore = notifications.length >= visibleCount;

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: async (_, notificationId) => {
      queryClient.setQueriesData(
        { queryKey: notificationsQueryKeys.lists() },
        (previous: { notifications?: NotificationItem[] } | undefined) => {
          if (!previous?.notifications) {
            return previous;
          }

          return {
            ...previous,
            notifications: previous.notifications.map((item) =>
              item.id === notificationId ? { ...item, isRead: true } : item,
            ),
          };
        },
      );

      await queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.unreadCount() });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: async () => {
      queryClient.setQueriesData(
        { queryKey: notificationsQueryKeys.lists() },
        (previous: { notifications?: NotificationItem[] } | undefined) => {
          if (!previous?.notifications) {
            return previous;
          }

          return {
            ...previous,
            notifications: previous.notifications.map((item) => ({
              ...item,
              isRead: true,
            })),
          };
        },
      );

      await queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.unreadCount() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: async (_, notificationId) => {
      queryClient.setQueriesData(
        { queryKey: notificationsQueryKeys.lists() },
        (previous: { notifications?: NotificationItem[] } | undefined) => {
          if (!previous?.notifications) {
            return previous;
          }

          return {
            ...previous,
            notifications: previous.notifications.filter((item) => item.id !== notificationId),
          };
        },
      );

      await queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.unreadCount() });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(notificationsQueryKeys.settings(), settings);
    },
  });

  const headerActionDisabled =
    notificationsQuery.isLoading ||
    markAllReadMutation.isPending ||
    deleteMutation.isPending ||
    markAsReadMutation.isPending;

  const unreadCount = notificationCountQuery.data ?? notifications.reduce((count, item) => count + (item.isRead ? 0 : 1), 0);

  const navigateAfterRead = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markAsReadMutation.mutateAsync(item.id);
    }

    switch (item.notiType) {
      case "BUY":
      case "SELL":
        router.push(`/reports/${item.stockId}`);
        return;
      case "SURGE_DOWN":
      case "SURGE_UP":
        router.push(`/stocks/${item.stockId}`);
        return;
      case "ANNOUNCEMENT":
      default:
        setSelectedAnnouncement(item);
    }
  };

  const handleDelete = async (item: NotificationItem) => {
    try {
      await deleteMutation.mutateAsync(item.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "알림을 삭제하지 못했습니다.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "모두 읽음 처리에 실패했습니다.");
    }
  };

  const openSettings = async () => {
    const result = await settingsQuery.refetch();

    if (result.error) {
      window.alert(result.error instanceof Error ? result.error.message : "알림 설정을 불러오지 못했습니다.");
      return;
    }

    setIsSettingsOpen(true);
  };

  const handleToggleRealtime = async () => {
    if (!settingsQuery.data) {
      return;
    }

    try {
      await settingsMutation.mutateAsync({
        isNotiEnabled: !settingsQuery.data.isNotiEnabled,
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "알림 설정 변경에 실패했습니다.");
    }
  };

  const handleToggleEmail = async () => {
    if (!settingsQuery.data) {
      return;
    }

    try {
      await settingsMutation.mutateAsync({
        isEmailNotiEnabled: !settingsQuery.data.isEmailNotiEnabled,
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "이메일 설정 변경에 실패했습니다.");
    }
  };

  return (
    <ProtectedPage>
      <main className="flex w-full justify-center bg-[color:var(--color-bg-primary)] py-8 lg:py-12">
        <div className="flex w-full max-w-[1152px] flex-col gap-4 px-6 lg:px-16">
          <div className="flex flex-col gap-4 lg:gap-6">
            <div className="flex flex-col items-end gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex w-full flex-col gap-3">
                <h1 className="text-3xl font-extrabold leading-9 text-[color:var(--color-text-primary)] lg:text-4xl lg:leading-[48px]">
                  알림
                </h1>
                <p className="text-sm font-medium leading-5 text-[color:var(--color-text-secondary)] lg:text-base lg:leading-6">
                  받은 알림은 최대 30일간 보관됩니다.
                </p>
              </div>

              <div className="flex w-full flex-nowrap items-center justify-end gap-4 whitespace-nowrap text-sm font-medium leading-5 text-[color:var(--color-text-secondary)] lg:w-auto lg:text-base lg:leading-6">
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  disabled={headerActionDisabled || unreadCount === 0}
                  className="shrink-0 transition-colors hover:text-[color:var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  모두 읽음
                </button>
                <span className="h-3 w-px bg-[color:var(--color-icon-disabled)]" />
                <button
                  type="button"
                  onClick={() => void openSettings()}
                  disabled={settingsQuery.isFetching}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap transition-colors hover:text-[color:var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LuSettings2 className="h-4 w-4" />
                  설정
                </button>
              </div>
            </div>

            <NotificationTabs
              activeTab={activeTab}
              onChange={(tab) => {
                setActiveTab(tab);
                setVisibleCount(PAGE_SIZE);
              }}
            />
          </div>

          {notificationsQuery.error ? (
            <div className="rounded-2xl bg-[color:var(--color-bg-secondary)] px-6 py-8 text-sm font-medium leading-6 text-[color:var(--color-text-secondary)]">
              {notificationsQuery.error instanceof Error
                ? notificationsQuery.error.message
                : "알림을 불러오지 못했습니다."}
            </div>
          ) : (
            <NotificationList
              items={notifications}
              isLoading={notificationsQuery.isLoading}
              onItemClick={(item) => void navigateAfterRead(item)}
              onDelete={(item) => void handleDelete(item)}
            />
          )}

          <div className="flex justify-center py-12">
            <button
              type="button"
              onClick={(event) => {
                event.currentTarget.blur();
                setVisibleCount((count) => count + PAGE_SIZE);
              }}
              disabled={!hasMore || notificationsQuery.isFetching}
              className="inline-flex items-center justify-center rounded-lg bg-[color:var(--color-bg-inverse-bolder)] px-8 py-4 text-sm font-bold leading-5 text-[color:var(--color-text-base)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              과거 알림 더보기
            </button>
          </div>
        </div>

        <NotificationAnnouncementModal item={selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} />
        <NotificationSettingsModal
          open={isSettingsOpen}
          settings={settingsQuery.data ?? null}
          isLoading={settingsQuery.isFetching && !settingsQuery.data}
          isUpdating={settingsMutation.isPending}
          onClose={() => setIsSettingsOpen(false)}
          onToggleRealtime={() => void handleToggleRealtime()}
          onToggleEmail={() => void handleToggleEmail()}
        />
      </main>
    </ProtectedPage>
  );
}
