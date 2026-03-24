"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
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
import type {
  NotificationItem,
  NotificationListPayload,
  NotificationSettings,
  NotificationSettingsPatch,
  NotificationTab,
} from "./types/notifications";

const PAGE_SIZE = 6;
const EMPTY_NOTIFICATIONS: NotificationItem[] = [];

type NotificationListSnapshot = [readonly unknown[], NotificationListPayload | undefined];

type NotificationMutationContext = {
  listSnapshots: NotificationListSnapshot[];
  unreadCountSnapshot: number | undefined;
};

function getActionErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message ? error.message : fallbackMessage;
}

function updateNotificationListCaches(
  queryClient: QueryClient,
  updater: (item: NotificationItem) => NotificationItem | null,
) {
  queryClient.setQueriesData(
    { queryKey: notificationsQueryKeys.lists() },
    (previous: NotificationListPayload | undefined) => {
      if (!previous?.notifications) {
        return previous;
      }

      const notifications = previous.notifications
        .map((item) => updater(item))
        .filter((item): item is NotificationItem => item !== null);

      return {
        ...previous,
        notifications,
      };
    },
  );
}

function restoreNotificationListCaches(
  queryClient: QueryClient,
  snapshots: NotificationListSnapshot[] | undefined,
) {
  snapshots?.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
}

export default function NotificationsPageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<NotificationTab>("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<NotificationItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const notificationsQuery = useNotificationsListQuery(activeTab, visibleCount);
  const settingsQuery = useNotificationSettingsQuery(false);
  const notificationCountQuery = useNotificationCountQuery(true);

  const notifications = notificationsQuery.data?.notifications ?? EMPTY_NOTIFICATIONS;
  const hasMore = notifications.length >= visibleCount;
  const unreadCount =
    notificationCountQuery.data ??
    notifications.reduce((count, item) => count + (item.isRead ? 0 : 1), 0);

  const markAsReadMutation = useMutation({
    mutationFn: (item: NotificationItem) => markNotificationAsRead(item.id),
    onMutate: async (item): Promise<NotificationMutationContext> => {
      setActionError(null);

      await queryClient.cancelQueries({ queryKey: notificationsQueryKeys.lists() });
      await queryClient.cancelQueries({ queryKey: notificationsQueryKeys.unreadCount() });

      const listSnapshots = queryClient.getQueriesData<NotificationListPayload>({
        queryKey: notificationsQueryKeys.lists(),
      });
      const unreadCountSnapshot = queryClient.getQueryData<number>(notificationsQueryKeys.unreadCount());

      updateNotificationListCaches(queryClient, (cachedItem) =>
        cachedItem.id === item.id ? { ...cachedItem, isRead: true } : cachedItem,
      );

      if (!item.isRead && unreadCountSnapshot !== undefined) {
        queryClient.setQueryData(
          notificationsQueryKeys.unreadCount(),
          Math.max(0, unreadCountSnapshot - 1),
        );
      }

      return { listSnapshots, unreadCountSnapshot };
    },
    onError: (error, _item, context) => {
      restoreNotificationListCaches(queryClient, context?.listSnapshots);

      if (context?.unreadCountSnapshot !== undefined) {
        queryClient.setQueryData(
          notificationsQueryKeys.unreadCount(),
          context.unreadCountSnapshot,
        );
      }

      setActionError(getActionErrorMessage(error, "알림 읽음 처리에 실패했습니다."));
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async (): Promise<NotificationMutationContext> => {
      setActionError(null);

      await queryClient.cancelQueries({ queryKey: notificationsQueryKeys.lists() });
      await queryClient.cancelQueries({ queryKey: notificationsQueryKeys.unreadCount() });

      const listSnapshots = queryClient.getQueriesData<NotificationListPayload>({
        queryKey: notificationsQueryKeys.lists(),
      });
      const unreadCountSnapshot = queryClient.getQueryData<number>(notificationsQueryKeys.unreadCount());

      updateNotificationListCaches(queryClient, (item) => ({ ...item, isRead: true }));
      queryClient.setQueryData(notificationsQueryKeys.unreadCount(), 0);

      return { listSnapshots, unreadCountSnapshot };
    },
    onError: (error, _variables, context) => {
      restoreNotificationListCaches(queryClient, context?.listSnapshots);

      if (context?.unreadCountSnapshot !== undefined) {
        queryClient.setQueryData(
          notificationsQueryKeys.unreadCount(),
          context.unreadCountSnapshot,
        );
      }

      setActionError(getActionErrorMessage(error, "모두 읽음 처리에 실패했습니다."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (item: NotificationItem) => deleteNotification(item.id),
    onMutate: async (item): Promise<NotificationMutationContext> => {
      setActionError(null);

      await queryClient.cancelQueries({ queryKey: notificationsQueryKeys.lists() });
      await queryClient.cancelQueries({ queryKey: notificationsQueryKeys.unreadCount() });

      const listSnapshots = queryClient.getQueriesData<NotificationListPayload>({
        queryKey: notificationsQueryKeys.lists(),
      });
      const unreadCountSnapshot = queryClient.getQueryData<number>(notificationsQueryKeys.unreadCount());

      updateNotificationListCaches(queryClient, (cachedItem) =>
        cachedItem.id === item.id ? null : cachedItem,
      );

      if (!item.isRead && unreadCountSnapshot !== undefined) {
        queryClient.setQueryData(
          notificationsQueryKeys.unreadCount(),
          Math.max(0, unreadCountSnapshot - 1),
        );
      }

      return { listSnapshots, unreadCountSnapshot };
    },
    onError: (error, _item, context) => {
      restoreNotificationListCaches(queryClient, context?.listSnapshots);

      if (context?.unreadCountSnapshot !== undefined) {
        queryClient.setQueryData(
          notificationsQueryKeys.unreadCount(),
          context.unreadCountSnapshot,
        );
      }

      setActionError(getActionErrorMessage(error, "알림을 삭제하지 못했습니다."));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryKeys.list(activeTab, visibleCount),
      });

      if (activeTab !== "ALL") {
        await queryClient.invalidateQueries({
          queryKey: notificationsQueryKeys.list("ALL", visibleCount),
        });
      }
    },
  });

  const settingsMutation = useMutation({
    mutationFn: updateNotificationSettings,
    onMutate: async (
      patch: NotificationSettingsPatch,
    ): Promise<{ previousSettings: NotificationSettings | undefined }> => {
      setActionError(null);

      await queryClient.cancelQueries({ queryKey: notificationsQueryKeys.settings() });

      const previousSettings = queryClient.getQueryData<NotificationSettings>(
        notificationsQueryKeys.settings(),
      );

      if (previousSettings) {
        queryClient.setQueryData(notificationsQueryKeys.settings(), {
          ...previousSettings,
          ...patch,
        });
      }

      return { previousSettings };
    },
    onError: (error, _patch, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(
          notificationsQueryKeys.settings(),
          context.previousSettings,
        );
      }

      setActionError(getActionErrorMessage(error, "알림 설정 변경에 실패했습니다."));
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(notificationsQueryKeys.settings(), settings);
    },
  });

  const headerActionDisabled =
    notificationsQuery.isLoading ||
    markAllReadMutation.isPending ||
    deleteMutation.isPending ||
    markAsReadMutation.isPending;

  const handleItemClick = useCallback(
    (item: NotificationItem) => {
      setActionError(null);

      if (!item.isRead) {
        markAsReadMutation.mutate(item);
      }

      switch (item.notiType) {
        case "BUY":
        case "SELL":
          router.push(`/report/${item.stockId}`);
          return;
        case "SURGE_DOWN":
        case "SURGE_UP":
          router.push(`/stocks/${item.stockId}`);
          return;
        case "ANNOUNCEMENT":
        default:
          setSelectedAnnouncement(item);
      }
    },
    [markAsReadMutation, router],
  );

  const handleDelete = useCallback(
    (item: NotificationItem) => {
      deleteMutation.mutate(item);
    },
    [deleteMutation],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleTabChange = useCallback((tab: NotificationTab) => {
    setActionError(null);
    setActiveTab(tab);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleLoadMore = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.currentTarget.blur();
      setVisibleCount((count) => count + PAGE_SIZE);
    },
    [],
  );

  const openSettings = useCallback(async () => {
    setActionError(null);

    if (settingsQuery.data) {
      setIsSettingsOpen(true);
      void settingsQuery.refetch();
      return;
    }

    const result = await settingsQuery.refetch();

    if (result.error) {
      setActionError(
        getActionErrorMessage(result.error, "알림 설정을 불러오지 못했습니다."),
      );
      return;
    }

    setIsSettingsOpen(true);
  }, [settingsQuery]);

  const handleToggleRealtime = useCallback(() => {
    if (!settingsQuery.data) {
      return;
    }

    settingsMutation.mutate({
      isNotiEnabled: !settingsQuery.data.isNotiEnabled,
    });
  }, [settingsMutation, settingsQuery.data]);

  const handleToggleEmail = useCallback(() => {
    if (!settingsQuery.data) {
      return;
    }

    settingsMutation.mutate({
      isEmailNotiEnabled: !settingsQuery.data.isEmailNotiEnabled,
    });
  }, [settingsMutation, settingsQuery.data]);

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
                  onClick={handleMarkAllRead}
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

            <NotificationTabs activeTab={activeTab} onChange={handleTabChange} />
          </div>

          {actionError ? (
            <div className="rounded-2xl border border-[rgba(251,44,54,0.16)] bg-[color:var(--color-bg-danger-subtle)] px-4 py-3 text-sm font-medium leading-5 text-[color:var(--color-text-danger-bold)]">
              {actionError}
            </div>
          ) : null}

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
              onItemClick={handleItemClick}
              onDelete={handleDelete}
            />
          )}

          <div className="flex justify-center py-12">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={!hasMore || notificationsQuery.isFetching}
              className="inline-flex items-center justify-center rounded-lg bg-[color:var(--color-bg-inverse-bolder)] px-8 py-4 text-sm font-bold leading-5 text-[color:var(--color-text-base)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              과거 알림 더보기 (6개)
            </button>
          </div>
        </div>

        <NotificationAnnouncementModal
          item={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
        <NotificationSettingsModal
          open={isSettingsOpen}
          settings={settingsQuery.data ?? null}
          isLoading={settingsQuery.isFetching && !settingsQuery.data}
          isUpdating={settingsMutation.isPending}
          onClose={() => setIsSettingsOpen(false)}
          onToggleRealtime={handleToggleRealtime}
          onToggleEmail={handleToggleEmail}
        />
      </main>
    </ProtectedPage>
  );
}
