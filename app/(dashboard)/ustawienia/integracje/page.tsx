import { CheckCircle2, XCircle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";

function envPresent(key: string) {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0;
}

function summarizeDbUrl(url: string) {
  if (!url.trim()) return "—";
  const at = url.indexOf("@");
  if (at === -1) return "skonfigurowano";
  const slash = url.indexOf("/", at + 1);
  const host = slash === -1 ? url.slice(at + 1) : url.slice(at + 1, slash);
  return host || "—";
}

export default async function IntegracjeSettingsPage() {
  const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
  const supabaseHint =
    dbUrl.includes("supabase") ||
    envPresent("SUPABASE_URL") ||
    envPresent("NEXT_PUBLIC_SUPABASE_URL");

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  return (
    <>
      <PageHeader
        title="Integracje"
        description="Status połączeń z usługami zewnętrznymi i bazą danych (tylko odczyt, bez sekretów)."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">OCR lokalny (Tesseract)</CardTitle>
              <CardDescription>Odczyt PDF (tekst osadzony) oraz JPG/PNG — bez kluczy API.</CardDescription>
            </div>
            <CheckCircle2 className="text-emerald-600 size-5 shrink-0" aria-hidden />
          </CardHeader>
          <CardContent className="text-sm">
            <Badge variant="default">Aktywny</Badge>
            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
              Silnik: <code className="bg-muted rounded px-1">tesseract.js</code> (języki{" "}
              <code className="bg-muted rounded px-1">pol+eng</code>), PDF:{" "}
              <code className="bg-muted rounded px-1">pdf-parse</code>. Skany PDF bez warstwy tekstowej wymagają pliku
              graficznego.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">Supabase / Postgres</CardTitle>
              <CardDescription>Dane aplikacji i Better Auth.</CardDescription>
            </div>
            {dbOk ? (
              <CheckCircle2 className="text-emerald-600 size-5 shrink-0" aria-hidden />
            ) : (
              <XCircle className="text-destructive size-5 shrink-0" aria-hidden />
            )}
          </CardHeader>
          <CardContent className="text-sm">
            <Badge variant={dbOk ? "default" : "secondary"}>{dbOk ? "Połączenie aktywne" : "Błąd połączenia"}</Badge>
            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
              Host bazy: <span className="text-foreground font-medium">{summarizeDbUrl(dbUrl)}</span>
            </p>
            {supabaseHint ? (
              <p className="text-muted-foreground mt-2 text-xs">Wykryto środowisko zgodne z Supabase / hosted Postgres.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
