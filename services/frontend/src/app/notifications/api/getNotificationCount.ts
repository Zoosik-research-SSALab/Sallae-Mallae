import { getNotifications } from "./getNotifications";

export async function getNotificationCount() {
  const page = await getNotifications(null, 100);
  return page.data.reduce((count, item) => count + (item.isRead ? 0 : 1), 0);
}
