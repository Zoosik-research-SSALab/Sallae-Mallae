export const NOTIFICATION_TABS = ["ALL", "SURGE", "SIGNAL", "ANNOUNCEMENT"] as const;

export type NotificationTab = (typeof NOTIFICATION_TABS)[number];

export type NotificationType = "SURGE_UP" | "SURGE_DOWN" | "BUY" | "SELL" | "ANNOUNCEMENT";

export type NotificationItem = {
  id: number;
  notiType: NotificationType;
  stockName: string;
  message: string;
  isRead: boolean;
  createdAt: string | null;
  stockId: number;
};

export type NotificationListPayload = {
  notifications: NotificationItem[];
  hasMore: boolean;
};

export type NotificationSettings = {
  isNotiEnabled: boolean;
  isEmailNotiEnabled: boolean;
};

export type NotificationSettingsPatch = Partial<NotificationSettings>;

export type NotificationGroup = {
  label: string;
  items: NotificationItem[];
};

export type NotificationListItemApi = Partial<NotificationItem> & {
  noti_type?: string | null;
  stock_name?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
  stock_id?: number | null;
};

export type NotificationSettingsApi = Partial<NotificationSettings> & {
  is_noti_enabled?: boolean | null;
  is_email_noti_enabled?: boolean | null;
};
