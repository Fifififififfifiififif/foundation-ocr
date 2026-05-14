import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-8", className)}>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {description ? (
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
