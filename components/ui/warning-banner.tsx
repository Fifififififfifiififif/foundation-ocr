export function WarningBanner({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={title ? "mt-1 space-y-1 leading-relaxed" : "space-y-1 leading-relaxed"}>{children}</div>
    </div>
  );
}
