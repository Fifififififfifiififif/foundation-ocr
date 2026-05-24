import { CheckCircle2, XCircle } from "lucide-react";

import { KsefIntegrationForm } from "@/components/settings/ksef-integration-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppContext } from "@/lib/app-context";
import { getOrganizationById } from "@/lib/organization-settings";
import prisma from "@/lib/prisma";
import { describeOcrEngineConfig } from "@/lib/ocr/config";
import { hasPermissionInOrg } from "@/src/modules/permissions/check";

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
  const ocr = describeOcrEngineConfig();
  const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
  const ctx = await getAppContext();
  const org = await getOrganizationById(ctx.organizationId);
  const canKsef =
    ctx.enabledModules.has("ACCOUNTING") &&
    (ctx.user.isSuperAdmin ||
      (await hasPermissionInOrg(ctx.organizationId, ctx.user.role, "integrations.manage", false, ctx.user.id)));

  let ksefInitial = null;
  if (canKsef) {
    const row = await prisma.ksefIntegration.findUnique({ where: { organizationId: ctx.organizationId } });
    if (row) {
      ksefInitial = {
        environment: row.environment,
        status: row.status,
        nip: row.nip,
        tokenMasked: row.tokenEncrypted ? "••••••••" : "—",
        lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
        lastSyncMessage: row.lastSyncMessage,
        lastError: row.lastError,
      };
    }
  }
  const supabaseHint =
    dbUrl.includes("supabase") ||
    envPresent("SUPABASE_URL") ||
    envPresent("NEXT_PUBLIC_SUPABASE_URL") ||
    envPresent("NEXT_PUBLIC_SUPABASE_ANON_KEY");

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
              <CardDescription>
                Tesseract (obrazy + skany PDF), pdf-parse (tekst osadzony) — bez kluczy API.
              </CardDescription>
            </div>
            <CheckCircle2 className="text-emerald-600 size-5 shrink-0" aria-hidden />
          </CardHeader>
          <CardContent className="text-sm">
            <Badge variant="default">Aktywny</Badge>
            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
              Silnik: <code className="bg-muted rounded px-1">{ocr.engine}</code>, języki{" "}
              <code className="bg-muted rounded px-1">{ocr.languages}</code>, preprocess:{" "}
              {ocr.preprocess ? "tak" : "nie"}, PDF tekst:{" "}
              <code className="bg-muted rounded px-1">{ocr.pdfText}</code>, skan PDF → Tesseract:{" "}
              {ocr.pdfScannedFallback ? `tak (max ${ocr.pdfMaxPages} str.)` : "nie"}.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">Supabase / Postgres</CardTitle>
              <CardDescription>Dane aplikacji (Prisma + PostgreSQL).</CardDescription>
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

      {canKsef ? (
        <Card className="border-border/80 mt-4 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">KSeF — Krajowy System e-Faktur</CardTitle>
            <CardDescription>
              Połączenie, import faktur wystawionych i otrzymanych. Wymaga modułu Księgowość i uprawnienia integracji.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KsefIntegrationForm initial={ksefInitial} organizationNip={org.nip} />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
