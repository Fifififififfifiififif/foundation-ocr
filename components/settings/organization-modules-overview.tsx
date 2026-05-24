import { Badge } from "@/components/ui/badge";
import type { ModuleKey } from "@/generated/prisma";
import { isDeprecatedModuleKey } from "@/src/modules/organizations/modules";
import { NAV_LINKS } from "@/src/modules/permissions/navigation";
import { cn } from "@/lib/utils";

export type OrgModuleRow = {
  key: ModuleKey;
  name: string;
  description: string | null;
  isCore: boolean;
  enabled: boolean;
  disabledAt: Date | null;
};

const HIDDEN_KEYS = new Set<ModuleKey>(["AUTH", "PERMISSIONS"]);

const MENU_BY_MODULE = NAV_LINKS.reduce(
  (acc, link) => {
    if (!link.module) return acc;
    const list = acc.get(link.module) ?? [];
    list.push(link.label);
    acc.set(link.module, list);
    return acc;
  },
  new Map<ModuleKey, string[]>(),
);

function statusHint(row: OrgModuleRow): string {
  if (row.enabled) {
    const menu = MENU_BY_MODULE.get(row.key);
    if (menu?.length) {
      return `Aktywny — pozycje w menu: ${menu.join(", ")} (jeśli Twoja rola ma dostęp).`;
    }
    if (row.isCore) {
      return "Aktywny — moduł podstawowy organizacji.";
    }
    return "Aktywny — funkcja dostępna w aplikacji (jeśli Twoja rola ma dostęp).";
  }
  if (row.disabledAt) {
    return "Wyłączony przez administratora platformy dla tej organizacji. Nie pojawi się w menu i API zwróci odmowę dostępu.";
  }
  return "Wyłączony dla organizacji. Skontaktuj się z administratorem platformy, aby włączyć moduł.";
}

export function OrganizationModulesOverview({ rows }: { rows: OrgModuleRow[] }) {
  const visible = rows.filter((r) => !HIDDEN_KEYS.has(r.key) && !isDeprecatedModuleKey(r.key));

  if (visible.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Brak skonfigurowanych modułów. Administrator platformy musi przypisać moduły do organizacji.
      </p>
    );
  }

  const enabledCount = visible.filter((r) => r.enabled).length;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Poniżej widać, które funkcje są włączone dla Twojej organizacji. Wyłączone moduły znikają z menu bocznego;
        włączone nadal wymagają odpowiedniej roli użytkownika.
      </p>
      <p className="text-sm">
        <span className="font-medium">{enabledCount}</span>
        <span className="text-muted-foreground"> / {visible.length} modułów aktywnych</span>
      </p>
      <ul className="space-y-3">
        {visible.map((row) => (
          <li
            key={row.key}
            className={cn(
              "border-border rounded-lg border px-4 py-3",
              !row.enabled && "bg-muted/30",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{row.name}</p>
                {row.description ? (
                  <p className="text-muted-foreground text-xs">{row.description}</p>
                ) : null}
              </div>
              <Badge variant={row.enabled ? "default" : "secondary"}>
                {row.enabled ? "Włączony" : "Wyłączony"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{statusHint(row)}</p>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Zmiany (włączenie / wyłączenie modułów) wykonuje wyłącznie administrator platformy w panelu Super Admin.
        Jeśli potrzebujesz modułu, którego nie ma na liście jako włączonego, zgłoś to do opiekuna platformy.
      </p>
    </div>
  );
}
