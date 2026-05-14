import prisma from "@/lib/prisma";

export type InAppNotificationRow = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationItemDTO = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toNotificationDTOs(rows: InAppNotificationRow[]): NotificationItemDTO[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    href: r.href,
    readAt: r.readAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export function isInAppNotificationTableMissingError(e: unknown): boolean {
  const rec = e as { message?: unknown; name?: unknown } | null;
  const msg = typeof rec?.message === "string" ? rec.message : "";
  const lower = msg.toLowerCase();
  if (!msg.includes("in_app_notification")) return false;
  if (
    lower.includes("does not exist") ||
    lower.includes("doesn't exist") ||
    lower.includes("undefined_table") ||
    lower.includes("42p01") ||
    (lower.includes("relation") && lower.includes("not exist"))
  ) {
    return true;
  }
  return false;
}

export async function fetchNotificationBundleForUser(
  userId: string,
  organizationId: string,
): Promise<{
  items: NotificationItemDTO[];
  unreadCount: number;
}> {
  try {
    const [rows, unreadCount] = await Promise.all([
      prisma.inAppNotification.findMany({
        where: { userId, organizationId },
        orderBy: { updatedAt: "desc" },
        take: 40,
        select: {
          id: true,
          title: true,
          body: true,
          href: true,
          readAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.inAppNotification.count({ where: { userId, organizationId, readAt: null } }),
    ]);
    return { items: toNotificationDTOs(rows), unreadCount };
  } catch (e) {
    if (isInAppNotificationTableMissingError(e)) {
      return { items: [], unreadCount: 0 };
    }
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "P2021" || code === "P2022") {
      return { items: [], unreadCount: 0 };
    }
    const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : String(e);
    if (msg.includes("in_app_notification")) {
      return { items: [], unreadCount: 0 };
    }
    throw e;
  }
}

export async function upsertDocumentInboxNotification(params: {
  userId: string;
  organizationId: string;
  documentId: string;
  fileName: string;
  ocrEnabled: boolean;
  ocrError?: string | null;
  manualReviewRecommended: boolean;
  ocrTextPresent: boolean;
}): Promise<void> {
  const dedupeKey = `document:${params.documentId}:inbox`;
  let title: string;
  let body: string;
  let href: string;

  if (!params.ocrEnabled) {
    title = "Nowa faktura";
    body = `${params.fileName} — OCR jest wyłączony w ustawieniach.`;
    href = `/documents/${params.documentId}`;
  } else if (params.ocrError) {
    title = "OCR nie powiódł się";
    body = params.fileName;
    href = `/documents/${params.documentId}/verify?ocrError=${encodeURIComponent(params.ocrError)}`;
  } else if (!params.ocrTextPresent) {
    title = "Brak tekstu z OCR";
    body = `${params.fileName} — uzupełnij dane ręcznie lub ponów OCR.`;
    href = `/documents/${params.documentId}/verify`;
  } else if (params.manualReviewRecommended) {
    title = "Weryfikacja OCR";
    body = `${params.fileName} — sugerowana ręczna weryfikacja pól.`;
    href = `/documents/${params.documentId}/verify`;
  } else {
    title = "OCR zakończony";
    body = `${params.fileName} — sprawdź rozpoznane pola.`;
    href = `/documents/${params.documentId}/verify`;
  }

  try {
    await prisma.inAppNotification.upsert({
      where: { userId_dedupeKey: { userId: params.userId, dedupeKey } },
      create: {
        userId: params.userId,
        organizationId: params.organizationId,
        type: "document",
        title,
        body,
        href,
        dedupeKey,
      },
      update: {
        title,
        body,
        href,
        readAt: null,
      },
    });
  } catch (e) {
    if (isInAppNotificationTableMissingError(e)) {
      return;
    }
    const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : String(e);
    if (msg.includes("in_app_notification")) {
      return;
    }
    throw e;
  }
}
