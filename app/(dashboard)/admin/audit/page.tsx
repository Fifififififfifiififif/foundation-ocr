import { PageHeader } from "@/components/layout/page-header";
import { requireSuperAdmin } from "@/lib/require-permission";
import prisma from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminAuditPage() {
  await requireSuperAdmin();

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      organization: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Audyt platformy" description="Ostatnie zdarzenia we wszystkich organizacjach." />
      <div className="mt-6 overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Czas</TableHead>
              <TableHead>Organizacja</TableHead>
              <TableHead>Użytkownik</TableHead>
              <TableHead>Akcja</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                  {l.createdAt.toLocaleString("pl-PL")}
                </TableCell>
                <TableCell>{l.organization?.name ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {l.user ? `${l.user.name} (${l.user.email})` : "—"}
                </TableCell>
                <TableCell className="font-mono text-xs">{l.action}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
