"use server";

import { getAppContext } from "@/lib/app-context";
import prisma from "@/lib/prisma";
import { isInAppNotificationTableMissingError } from "@/lib/in-app-notifications";

export async function markNotificationReadAction(id: string): Promise<void> {
  const { user } = await getAppContext();
  try {
    await prisma.inAppNotification.updateMany({
      where: { id, userId: user.id },
      data: { readAt: new Date() },
    });
  } catch (e) {
    if (isInAppNotificationTableMissingError(e)) return;
    const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : String(e);
    if (msg.includes("in_app_notification")) return;
    throw e;
  }
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const { user } = await getAppContext();
  try {
    await prisma.inAppNotification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  } catch (e) {
    if (isInAppNotificationTableMissingError(e)) return;
    const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : String(e);
    if (msg.includes("in_app_notification")) return;
    throw e;
  }
}
