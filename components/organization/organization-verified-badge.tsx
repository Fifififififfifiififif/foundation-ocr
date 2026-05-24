import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

type Props = {
  verifiedAt: Date | string | null | undefined;
  registryStatus?: string | null;
  className?: string;
  compact?: boolean;
};

export function OrganizationVerifiedBadge({ verifiedAt, registryStatus, className, compact }: Props) {
  if (!verifiedAt) return null;

  const date =
    verifiedAt instanceof Date
      ? verifiedAt.toLocaleDateString("pl-PL")
      : new Date(verifiedAt).toLocaleDateString("pl-PL");

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
        "gap-1 font-medium",
        className,
      )}
      title={registryStatus ?? undefined}
    >
      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
      {compact ? "Zweryfikowana" : "Zweryfikowana organizacja"}
      {!compact ? (
        <span className="text-muted-foreground font-normal">· {date}</span>
      ) : null}
    </Badge>
  );
}
