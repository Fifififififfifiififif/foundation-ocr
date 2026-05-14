"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { contractorSchema } from "@/lib/validations";

export async function submitCreateContractor(formData: FormData) {
  const { organizationId: orgId } = await requirePermission("contractors.write");
  const raw = Object.fromEntries(formData.entries());
  const parsed = contractorSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/contractors/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  await prisma.contractor.create({
    data: {
      organizationId: orgId,
      name: parsed.data.name,
      nip: parsed.data.nip,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
    },
  });

  revalidatePath("/contractors");
  redirect("/contractors");
}

export async function submitUpdateContractor(id: string, formData: FormData) {
  const { organizationId: orgId } = await requirePermission("contractors.write");
  const raw = Object.fromEntries(formData.entries());
  const parsed = contractorSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/contractors/${id}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  await prisma.contractor.update({
    where: { id, organizationId: orgId },
    data: {
      name: parsed.data.name,
      nip: parsed.data.nip,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
    },
  });

  revalidatePath("/contractors");
  redirect("/contractors");
}

export async function submitDeleteContractor(id: string) {
  const { organizationId: orgId } = await requirePermission("contractors.write");

  const docCount = await prisma.document.count({
    where: { contractorId: id, organizationId: orgId },
  });
  if (docCount > 0) {
    redirect(
      `/contractors/${id}?error=${encodeURIComponent("Nie można usunąć kontrahenta z powiązanymi dokumentami. Najpierw przenieś dokumenty.")}`,
    );
  }

  await prisma.contractor.delete({ where: { id, organizationId: orgId } });
  revalidatePath("/contractors");
  redirect("/contractors");
}
