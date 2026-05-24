import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { UNASSIGNED_LABEL } from "@/lib/optional-relation-ids";
import { documentStatusPl } from "@/lib/ui-i18n";
import { requireOcrModule } from "@/src/modules/permissions/require-ocr";

export default async function OcrHubPage() {
  const { organizationId: orgId } = await requireOcrModule();

  const [inReview, recentFailed] = await Promise.all([
    prisma.document.findMany({
      where: { organizationId: orgId, archived: false, status: "review" },
      orderBy: { updatedAt: "desc" },
      take: 12,
      include: {
        contractor: { select: { name: true } },
        project: { select: { name: true } },
      },
    }),
    prisma.document.findMany({
      where: { organizationId: orgId, archived: false, ocrRawText: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        contractor: { select: { name: true } },
        project: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">OCR</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Przesyłanie faktur, lokalny odczyt OCR (Tesseract / PDF) i ręczna weryfikacja pól.
        </p>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Nowa faktura</CardTitle>
          <CardDescription>PDF lub obraz — OCR uruchomi się po przesłaniu.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg">
            <Link href="/documents/new">Prześlij dokument</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Kolejka weryfikacji</CardTitle>
          <CardDescription>Faktury ze statusem „{documentStatusPl("review")}”</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {inReview.length === 0 ? (
            <p className="text-muted-foreground text-sm">Brak pozycji w kolejce.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {inReview.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="font-medium">{d.invoiceNumber ?? d.fileName}</span>
                  <span className="text-muted-foreground text-xs">
                    {d.contractor?.name ?? UNASSIGNED_LABEL} · {d.project?.name ?? UNASSIGNED_LABEL}
                  </span>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/documents/${d.id}/verify`}>Weryfikuj</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Bez tekstu OCR</CardTitle>
          <CardDescription>Ostatnie przesłania — rozważ ponowne OCR ze strony faktury</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentFailed.length === 0 ? (
            <p className="text-muted-foreground text-sm">Wszystkie ostatnie pliki mają zapisany tekst OCR.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {recentFailed.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="truncate">{d.fileName}</span>
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={`/documents/${d.id}`}>Otwórz</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
