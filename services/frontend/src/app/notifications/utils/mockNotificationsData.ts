import type {
  NotificationItem,
  NotificationSettings,
  NotificationTab,
} from "../types/notifications";
import { getNotificationTabForType } from "./notificationFormatters";

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const notificationSeeds: NotificationItem[] = [
  {
    id: 101,
    notiType: "SURGE_UP",
    stockName: "한미반도체",
    message: "전일 종가 대비 +5.2% 상승하여 150,000원을 돌파했습니다. 변동성에 유의하세요.",
    isRead: false,
    createdAt: minutesAgo(1),
    stockId: 304,
  },
  {
    id: 102,
    notiType: "SURGE_DOWN",
    stockName: "삼성전자",
    message: "전일 종가 대비 -5.2% 하락하며 변동성이 확대되었습니다.",
    isRead: false,
    createdAt: minutesAgo(10),
    stockId: 1,
  },
  {
    id: 103,
    notiType: "BUY",
    stockName: "삼성전자",
    message: "AI 모델 3인 전원 일치로 강력 매수 신호가 포착되었습니다. 리포트를 확인하세요.",
    isRead: false,
    createdAt: minutesAgo(60),
    stockId: 1,
  },
  {
    id: 104,
    notiType: "SELL",
    stockName: "SK하이닉스",
    message: "AI 모델 3인 전원 일치로 강력 매도 신호가 포착되었습니다. 리포트를 확인하세요.",
    isRead: false,
    createdAt: minutesAgo(95),
    stockId: 308,
  },
  {
    id: 105,
    notiType: "ANNOUNCEMENT",
    stockName: "삼성전자",
    message: "‘현금/현물배당결정(결산배당)’ 공시가 등록되었습니다. 터치하여 원문을 확인하세요.",
    isRead: false,
    createdAt: minutesAgo(180),
    stockId: 1,
  },
  {
    id: 106,
    notiType: "ANNOUNCEMENT",
    stockName: "삼성전자",
    message: "‘현금/현물배당결정(결산배당)’ 공시가 등록되었습니다. 터치하여 원문을 확인하세요.",
    isRead: true,
    createdAt: minutesAgo(540),
    stockId: 1,
  },
  {
    id: 107,
    notiType: "SURGE_DOWN",
    stockName: "삼성전자",
    message: "전일 종가 대비 -5.2% 하락하며 변동성이 확대되었습니다.",
    isRead: true,
    createdAt: minutesAgo(1500),
    stockId: 1,
  },
  {
    id: 108,
    notiType: "BUY",
    stockName: "LG에너지솔루션",
    message: "AI 모델 합의로 신규 매수 시그널이 생성되었습니다. 최신 리포트를 확인하세요.",
    isRead: false,
    createdAt: minutesAgo(1600),
    stockId: 301,
  },
  {
    id: 109,
    notiType: "SELL",
    stockName: "카카오",
    message: "수급 악화와 함께 매도 시그널이 포착되었습니다. 리포트를 확인하세요.",
    isRead: true,
    createdAt: minutesAgo(1700),
    stockId: 201,
  },
  {
    id: 110,
    notiType: "SURGE_UP",
    stockName: "NAVER",
    message: "전일 종가 대비 +4.1% 상승하며 거래대금이 급증했습니다.",
    isRead: false,
    createdAt: minutesAgo(1900),
    stockId: 102,
  },
  {
    id: 111,
    notiType: "ANNOUNCEMENT",
    stockName: "기아",
    message: "‘자기주식 취득 결정’ 공시가 등록되었습니다. 터치하여 원문을 확인하세요.",
    isRead: true,
    createdAt: minutesAgo(2000),
    stockId: 302,
  },
  {
    id: 112,
    notiType: "SURGE_DOWN",
    stockName: "셀트리온",
    message: "장중 낙폭이 확대되며 급락 구간에 진입했습니다.",
    isRead: false,
    createdAt: minutesAgo(2500),
    stockId: 203,
  },
  {
    id: 113,
    notiType: "BUY",
    stockName: "현대모비스",
    message: "AI 모델 3인의 합의로 매수 관점이 강화되었습니다. 리포트를 확인하세요.",
    isRead: true,
    createdAt: minutesAgo(2900),
    stockId: 303,
  },
  {
    id: 114,
    notiType: "ANNOUNCEMENT",
    stockName: "KB금융",
    message: "‘현금배당 결정’ 공시가 등록되었습니다. 터치하여 원문을 확인하세요.",
    isRead: false,
    createdAt: minutesAgo(3200),
    stockId: 306,
  },
];

let notificationStore = [...notificationSeeds].sort((left, right) => {
  const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
  const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
  return rightTime - leftTime;
});

let notificationSettingsStore: NotificationSettings = {
  isNotiEnabled: true,
  isEmailNotiEnabled: false,
};

export function getMockNotifications(tab: NotificationTab, limit: number) {
  const filtered =
    tab === "ALL"
      ? notificationStore
      : notificationStore.filter((item) => getNotificationTabForType(item.notiType) === tab);

  return {
    notifications: filtered.slice(0, Math.max(1, limit)),
  };
}

export function getMockNotificationSettings() {
  return {
    ...notificationSettingsStore,
  };
}

export function updateMockNotificationSettings(patch: Partial<NotificationSettings>) {
  notificationSettingsStore = {
    ...notificationSettingsStore,
    ...patch,
  };

  return getMockNotificationSettings();
}

export function markMockNotificationAsRead(notificationId: number) {
  let updated: NotificationItem | null = null;

  notificationStore = notificationStore.map((item) => {
    if (item.id !== notificationId) {
      return item;
    }

    updated = {
      ...item,
      isRead: true,
    };

    return updated;
  });

  return updated;
}

export function markAllMockNotificationsAsRead(tab: NotificationTab) {
  let updatedCount = 0;

  notificationStore = notificationStore.map((item) => {
    const isTargetItem = tab === "ALL" || getNotificationTabForType(item.notiType) === tab;

    if (!isTargetItem || item.isRead) {
      return item;
    }

    updatedCount += 1;

    return {
      ...item,
      isRead: true,
    };
  });

  return {
    updatedCount,
  };
}

export function deleteMockNotification(notificationId: number) {
  const beforeLength = notificationStore.length;
  notificationStore = notificationStore.filter((item) => item.id !== notificationId);

  return {
    deleted: beforeLength !== notificationStore.length,
  };
}

export function getMockUnreadNotificationCount() {
  return notificationStore.reduce((count, item) => count + (item.isRead ? 0 : 1), 0);
}
