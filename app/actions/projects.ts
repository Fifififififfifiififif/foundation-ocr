"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { requireEntitlementModule } from "@/lib/require-entitlement";
import { projectSchema } from "@/lib/validations";

export async function submitCreateProject(formData: FormData) {
  await requireEntitlementModule("PROJECTS");
  const { organizationId: orgId } = await requirePermission("projects.write");
  const raw = Object.fromEntries(formData.entries());
  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/projects/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  await prisma.project.create({
    data: {
      organizationId: orgId,
      name: parsed.data.name,
      grantNumber: parsed.data.grantNumber,
      fundingSource: parsed.data.fundingSource,
      budget: parsed.data.budget,
      description: parsed.data.description ?? null,
    },
  });

  revalidatePath("/projects");
  redirect("/projects");
}

export async function submitUpdateProject(id: string, formData: FormData) {
  const { organizationId: orgId } = await requirePermission("projects.write");
  const raw = Object.fromEntries(formData.entries());
  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/projects/${id}?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  await prisma.project.update({
    where: { id, organizationId: orgId },
    data: {
      name: parsed.data.name,
      grantNumber: parsed.data.grantNumber,
      fundingSource: parsed.data.fundingSource,
      budget: parsed.data.budget,
      description: parsed.data.description ?? null,
    },
  });

  revalidatePath("/projects");
  redirect("/projects");
}

export async function submitDeleteProject(id: string) {
  const { organizationId: orgId } = await requirePermission("projects.write");

  const docCount = await prisma.document.count({
    where: { projectId: id, organizationId: orgId },
  });
  if (docCount > 0) {
    redirect(
      `/projects/${id}?error=${encodeURIComponent("Nie można usunąć projektu z powiązanymi dokumentami. Najpierw przenieś dokumenty.")}`,
    );
  }

  await prisma.project.delete({ where: { id, organizationId: orgId } });
  revalidatePath("/projects");
  redirect("/projects");
}
