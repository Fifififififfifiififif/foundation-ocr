import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/secrets";
import type { KsefEnvironment, KsefSession } from "@/src/modules/ksef/types";

export async function loadKsefSession(organizationId: string): Promise<{
  environment: KsefEnvironment;
  nip: string;
  session: KsefSession;
} | null> {
  const row = await prisma.ksefIntegration.findUnique({ where: { organizationId } });
  if (!row?.tokenEncrypted || !row.nip) return null;

  const meta = (row.authMetadata ?? {}) as {
    accessToken?: string;
    expiresAt?: string;
    refreshToken?: string;
    sessionReference?: string;
  };

  if (!meta.accessToken || !meta.expiresAt) return null;
  const expiresAt = new Date(meta.expiresAt);
  if (expiresAt.getTime() <= Date.now()) return null;

  return {
    environment: row.environment,
    nip: row.nip,
    session: {
      accessToken: meta.accessToken,
      refreshToken: meta.refreshToken,
      expiresAt,
      sessionReference: meta.sessionReference,
    },
  };
}

export async function getKsefTokenPlain(organizationId: string): Promise<string | null> {
  const row = await prisma.ksefIntegration.findUnique({ where: { organizationId } });
  if (!row?.tokenEncrypted) return null;
  try {
    return decryptSecret(row.tokenEncrypted);
  } catch {
    return null;
  }
}
