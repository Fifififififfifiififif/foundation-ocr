import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

type Props = {
  title: string;
  description?: string;
};

export function DbSetupRequired({ title, description }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={
          description ??
          "Baza Supabase nie ma jeszcze tabel aplikacji. Jedna komenda to naprawia."
        }
      />
      <Card className="border-border/80 max-w-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Synchronizuj bazę</CardTitle>
          <CardDescription>W terminalu, w katalogu projektu:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 font-mono text-sm">
          <p>
            <code className="bg-muted rounded px-1.5 py-0.5">npm run db:sync</code>
          </p>
          <p className="text-muted-foreground font-sans text-xs leading-relaxed">
            Tworzy tabele (organization, document, project…) i ładuje przykładowe dane. Używa portu
            5432 (Session), bo migracje na poolerze 6543 często się zawieszają.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
