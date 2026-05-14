import { randomUUID } from "crypto";
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { getPgPoolOptionsFromConnectionString } from "../lib/pg-pool-options";
import { PrismaClient } from "../generated/prisma";

async function ensureCredentialAccount(
  prisma: PrismaClient,
  userId: string,
  plainPassword: string,
) {
  const hashed = await hashPassword(plainPassword);
  await prisma.account.deleteMany({ where: { userId, providerId: "credential" } });
  await prisma.account.create({
    data: {
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: hashed,
    },
  });
}

async function main() {
  const connectionString =
    process.env.DIRECT_DATABASE_URL?.trim() || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL lub DIRECT_DATABASE_URL jest wymagane do seeda");
  }

  const pool = new Pool(getPgPoolOptionsFromConnectionString(connectionString));
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const orgId = "org_default";
  const adminId = "seed-admin-id";
  const userId = "seed-user-id";
  const exampleAdminId = "seed-admin-example";

  await prisma.organization.upsert({
    where: { id: orgId },
    create: {
      id: orgId,
      name: "Fundacja (demo)",
      tagline: "Przykładowa organizacja z seeda",
      accentColor: "#18181b",
      appearanceTheme: "system",
    },
    update: {
      name: "Fundacja (demo)",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@foundation.local" },
    create: {
      id: adminId,
      name: "Anna Kowalska",
      email: "admin@foundation.local",
      emailVerified: true,
      role: "ADMIN",
      organizationId: orgId,
      banned: false,
    },
    update: { role: "ADMIN", organizationId: orgId, banned: false },
  });

  await prisma.user.upsert({
    where: { email: "user@foundation.local" },
    create: {
      id: userId,
      name: "Jan Nowak",
      email: "user@foundation.local",
      emailVerified: true,
      role: "USER",
      organizationId: orgId,
      banned: false,
    },
    update: { organizationId: orgId },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    create: {
      id: exampleAdminId,
      name: "Administrator (seed)",
      email: "admin@example.com",
      emailVerified: true,
      role: "ADMIN",
      organizationId: orgId,
      banned: false,
    },
    update: {
      name: "Administrator (seed)",
      role: "ADMIN",
      organizationId: orgId,
      banned: false,
    },
  });

  await ensureCredentialAccount(prisma, adminId, "demo12345");
  await ensureCredentialAccount(prisma, userId, "demo12345");
  const ex = await prisma.user.findUniqueOrThrow({ where: { email: "admin@example.com" } });
  await ensureCredentialAccount(prisma, ex.id, "password123");

  const p1 = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    create: {
      id: "seed-project-1",
      organizationId: orgId,
      name: "Inicjatywa Edukacja Młodzieży",
      grantNumber: "GR-2025-0142",
      fundingSource: "EU Erasmus+",
      budget: 125000,
      description: "Warsztaty i materiały edukacyjne dla szkół wiejskich.",
    },
    update: { organizationId: orgId },
  });

  const p2 = await prisma.project.upsert({
    where: { id: "seed-project-2" },
    create: {
      id: "seed-project-2",
      organizationId: orgId,
      name: "Zdrowie w Społeczności",
      grantNumber: "GR-2025-0201",
      fundingSource: "Narodowy Fundusz Zdrowia",
      budget: 89000,
      description: "Mobilne kliniki i badania profilaktyczne.",
    },
    update: { organizationId: orgId },
  });

  const c1 = await prisma.contractor.upsert({
    where: { id: "seed-contractor-1" },
    create: {
      id: "seed-contractor-1",
      organizationId: orgId,
      name: "Print & Paper Sp. z o.o.",
      nip: "5270000000",
      email: "faktury@printpaper.example",
      phone: "+48 22 123 45 67",
      address: "ul. Przykładowa 1, 00-001 Warszawa",
    },
    update: { organizationId: orgId },
  });

  await prisma.contractor.upsert({
    where: { id: "seed-contractor-2" },
    create: {
      id: "seed-contractor-2",
      organizationId: orgId,
      name: "MedSupply Sp. z o.o.",
      nip: "1234567890",
      email: "kontakt@medsupply.example",
      phone: "+48 12 987 65 43",
      address: "ul. Medyczna 5, 30-001 Kraków",
    },
    update: { organizationId: orgId },
  });

  await prisma.document.upsert({
    where: { id: "seed-document-1" },
    create: {
      id: "seed-document-1",
      organizationId: orgId,
      invoiceNumber: "FV/2025/03/88",
      issueDate: new Date("2025-03-10"),
      paymentDate: new Date("2025-03-24"),
      amountNet: 2439.02,
      amountGross: 3000,
      expenseCategory: "Materiały edukacyjne",
      notes: "Materiały drukowane na warsztaty",
      status: "approved",
      filePath: "seed/placeholder.pdf",
      fileName: "placeholder.pdf",
      mimeType: "application/pdf",
      ocrRawText:
        "FAKTURA VAT\nFV/2025/03/88\nData wystawienia: 10.03.2025\nNIP: 527-000-00-00\nKwota brutto: 3 000,00 PLN",
      projectId: p1.id,
      contractorId: c1.id,
      createdByUserId: adminId,
    },
    update: { organizationId: orgId },
  });

  await prisma.document.upsert({
    where: { id: "seed-document-2" },
    create: {
      id: "seed-document-2",
      organizationId: orgId,
      invoiceNumber: "FV/2025/04/12",
      issueDate: new Date("2025-04-02"),
      paymentDate: null,
      amountNet: 1626.02,
      amountGross: 2000,
      expenseCategory: "Usługi medyczne",
      notes: "Oczekuje na weryfikację",
      status: "review",
      filePath: "seed/placeholder2.pdf",
      fileName: "scan.jpg",
      mimeType: "image/jpeg",
      ocrRawText: "NIP 5270000000\nFV/2025/04/12\n1 626,02 PLN",
      projectId: p2.id,
      contractorId: c1.id,
      createdByUserId: userId,
    },
    update: { organizationId: orgId },
  });

  await prisma.$disconnect();
  await pool.end();
  console.log(
    "Seed OK. Logowanie: admin@example.com / password123 (ADMIN) · admin@foundation.local / demo12345 · user@foundation.local / demo12345",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
