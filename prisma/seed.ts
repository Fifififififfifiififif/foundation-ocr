import "dotenv/config";

import prisma from "../lib/prisma";
import { seedPlatformModules, seedOrganizationModules } from "../src/modules/organizations/modules";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL jest wymagane do seeda");
  }

  await seedPlatformModules();

  const orgId = "org_default";
  const adminId = "seed-admin-id";
  const userId = "seed-user-id";
  const exampleAdminId = "seed-admin-example";

  await prisma.organization.upsert({
    where: { id: orgId },
    create: {
      id: orgId,
      slug: "default",
      name: "Organizacja demo",
      tagline: "Przykładowa organizacja z seeda",
      accentColor: "#18181b",
      appearanceTheme: "system",
    },
    update: {
      name: "Organizacja demo",
      slug: "default",
    },
  });

  await seedOrganizationModules(orgId);

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);
  await prisma.subscription.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      plan: "pro",
      status: "active",
      billingCycle: "monthly",
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    },
    update: {
      plan: "pro",
      status: "active",
      currentPeriodEnd: periodEnd,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    create: {
      id: exampleAdminId,
      name: "Administrator (seed)",
      email: "admin@example.com",
      role: "ADMIN",
      organizationId: orgId,
      isSuperAdmin: true,
      banned: false,
    },
    update: {
      name: "Administrator (seed)",
      role: "ADMIN",
      organizationId: orgId,
      isSuperAdmin: true,
      banned: false,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@org.local" },
    create: {
      id: adminId,
      name: "Anna Kowalska",
      email: "admin@org.local",
      role: "ADMIN",
      organizationId: orgId,
      banned: false,
    },
    update: { role: "ADMIN", organizationId: orgId, banned: false },
  });

  await prisma.user.upsert({
    where: { email: "user@org.local" },
    create: {
      id: userId,
      name: "Jan Nowak",
      email: "user@org.local",
      role: "MEMBER",
      organizationId: orgId,
      banned: false,
    },
    update: { organizationId: orgId, role: "MEMBER" },
  });

  for (const uid of [exampleAdminId, adminId, userId]) {
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: orgId, userId: uid } },
      create: {
        organizationId: orgId,
        userId: uid,
        role: uid === userId ? "MEMBER" : "ADMIN",
      },
      update: {},
    });
  }

  const p1 = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    create: {
      id: "seed-project-1",
      organizationId: orgId,
      name: "Inicjatywa Edukacja Młodzieży",
      grantNumber: "GR-2025-0142",
      fundingSource: "EU Erasmus+",
      budget: 125000,
      description: "Warsztaty i materiały edukacyjne.",
    },
    update: { organizationId: orgId },
  });

  await prisma.project.upsert({
    where: { id: "seed-project-2" },
    create: {
      id: "seed-project-2",
      organizationId: orgId,
      name: "Zdrowie w Społeczności",
      grantNumber: "GR-2025-0201",
      fundingSource: "Program regionalny",
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
      source: "ocr",
      invoiceNumber: "FV/2025/03/88",
      issueDate: new Date("2025-03-10"),
      paymentDate: new Date("2025-03-24"),
      amountNet: 2439.02,
      amountGross: 3000,
      expenseCategory: "Materiały",
      notes: "Materiały drukowane",
      status: "approved",
      filePath: null,
      fileName: null,
      mimeType: null,
      ocrRawText:
        "FAKTURA VAT\nFV/2025/03/88\nData wystawienia: 10.03.2025\nNIP: 527-000-00-00\nKwota brutto: 3 000,00 PLN",
      projectId: p1.id,
      contractorId: c1.id,
      createdByUserId: adminId,
    },
    update: { organizationId: orgId },
  });

  await prisma.document.upsert({
    where: { id: "seed-document-manual" },
    create: {
      id: "seed-document-manual",
      organizationId: orgId,
      source: "manual",
      invoiceNumber: "FV/MAN/001",
      issueDate: new Date("2025-05-01"),
      dueDate: new Date("2025-05-15"),
      amountNet: 1000,
      amountVat: 230,
      amountGross: 1230,
      currency: "PLN",
      sellerName: "Dostawca Demo Sp. z o.o.",
      sellerNip: "5270000001",
      status: "approved",
      createdByUserId: exampleAdminId,
      lineItems: {
        create: [
          { description: "Usługa konsultingowa", quantity: 1, unitPrice: 1000, vatRate: 23, netAmount: 1000, sortOrder: 0 },
        ],
      },
    },
    update: { organizationId: orgId },
  });

  await prisma.$disconnect();
  console.log(
    "Seed OK. Super admin w DB: admin@example.com. Supabase Auth: npm run db:create-super-admin (wymaga SUPABASE_SERVICE_ROLE_KEY).",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
