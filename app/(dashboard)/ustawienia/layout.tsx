import { SettingsNav } from "@/components/settings/settings-nav";

export default function UstawieniaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Ustawienia</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          Konfiguracja aplikacji, danych fundacji, integracji i OCR — przejrzysto, bez zbędnej złożoności.
        </p>
      </div>
      <div className="relative flex min-w-0 flex-col gap-8 lg:block lg:min-h-0 lg:pl-[15rem]">
        <div className="shrink-0 lg:absolute lg:left-0 lg:top-0 lg:w-52">
          <SettingsNav />
        </div>
        <div className="bg-card text-card-foreground border-border/80 min-w-0 w-full rounded-xl border p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
