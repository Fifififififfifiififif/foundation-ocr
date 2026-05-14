"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { Bell } from "lucide-react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { NotificationItemDTO } from "@/lib/in-app-notifications";
import { cn } from "@/lib/utils";

export function NotificationInbox({
  initialItems,
  initialUnreadCount,
}: {
  initialItems: NotificationItemDTO[];
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState(initialItems);
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);

  React.useEffect(() => {
    setItems(initialItems);
    setUnreadCount(initialUnreadCount);
  }, [initialItems, initialUnreadCount]);

  async function handleItemActivate(n: NotificationItemDTO) {
    if (!n.readAt) {
      await markNotificationReadAction(n.id);
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.href) {
      setOpen(false);
      router.push(n.href);
    } else {
      router.refresh();
    }
  }

  async function handleMarkAll() {
    await markAllNotificationsReadAction();
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    router.refresh();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-sidebar-foreground/80 relative shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent"
          aria-label="Powiadomienia"
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm font-semibold">Powiadomienia</p>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-7 px-2 text-xs"
              onClick={() => void handleMarkAll()}
            >
              Oznacz wszystkie
            </Button>
          ) : null}
        </div>
        <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">Brak powiadomień</p>
          ) : (
            <ul className="divide-border divide-y">
              {items.map((n) => {
                const isUnread = !n.readAt;
                const when = formatDistanceToNow(new Date(n.updatedAt), {
                  addSuffix: true,
                  locale: pl,
                });
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        "hover:bg-muted/60 flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors",
                        isUnread && "bg-muted/30",
                      )}
                      onClick={() => void handleItemActivate(n)}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn("font-medium", isUnread && "text-foreground")}>{n.title}</span>
                        <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">{when}</span>
                      </span>
                      {n.body ? (
                        <span className="text-muted-foreground line-clamp-2 text-xs leading-snug">{n.body}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Separator />
        <div className="text-muted-foreground flex flex-col gap-1 px-3 py-2 text-[11px]">
          <span>Nowe wpisy pojawiają się po przesłaniu faktury lub ponowieniu OCR.</span>
          <Link href="/raporty" className="text-primary font-medium underline-offset-2 hover:underline">
            Raporty analityczne
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
