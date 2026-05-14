"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";

import type { SearchResultGroup } from "@/lib/search-types";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GlobalSearchCommand() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [groups, setGroups] = React.useState<SearchResultGroup[]>([]);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 320);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    if (!open) return;
    if (debounced.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debounced)}`, {
          credentials: "include",
        });
        const data = (await res.json()) as { groups?: SearchResultGroup[] };
        if (!cancelled) setGroups(Array.isArray(data.groups) ? data.groups : []);
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setQ("");
      setDebounced("");
      setGroups([]);
    }
  };

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  /** Spójnie z paskiem bocznym (`bg-sidebar` itd.) — bez białego `bg-card` z wariantu outline. */
  const topbarControl = cn(
    "border-sidebar-border bg-sidebar text-sidebar-foreground shadow-none",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    "dark:border-sidebar-border dark:bg-sidebar dark:hover:bg-sidebar-accent dark:hover:text-sidebar-accent-foreground",
  );

  return (
    <>
      <div className="flex max-w-md flex-1 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("shrink-0 md:hidden", topbarControl)}
          aria-label="Szukaj"
          onClick={() => setOpen(true)}
        >
          <Search className="size-4" />
        </Button>
        <div className="relative hidden min-w-0 flex-1 md:block">
          <Search className="text-sidebar-foreground/55 pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
          <Button
            type="button"
            variant="outline"
            className={cn("h-9 w-full justify-start rounded-lg px-9 font-normal", topbarControl)}
            onClick={() => setOpen(true)}
          >
            <span className="text-sidebar-foreground/70 truncate">Szukaj</span>
          </Button>
        </div>
      </div>

      <CommandDialog open={open} onOpenChange={onOpenChange} commandShouldFilter={false}>
        <CommandInput
          placeholder="Szukaj"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          {loading && debounced.length >= 2 ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Wyszukiwanie…
            </div>
          ) : null}
          {!loading && debounced.length >= 2 && total === 0 ? (
            <CommandEmpty>Brak wyników</CommandEmpty>
          ) : null}
          {!loading &&
            groups.map((g) => (
              <CommandGroup key={g.id} heading={g.title}>
                {g.items.map((item) => (
                  <CommandItem
                    key={`${g.id}:${item.id}`}
                    value={`${g.id}:${item.id}:${item.title}`}
                    onSelect={() => {
                      onOpenChange(false);
                      router.push(item.href);
                    }}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-medium">{item.title}</span>
                      {item.subtitle ? (
                        <span className="text-muted-foreground truncate text-xs">{item.subtitle}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          {debounced.length > 0 && debounced.length < 2 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">Wpisz co najmniej 2 znaki.</p>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
