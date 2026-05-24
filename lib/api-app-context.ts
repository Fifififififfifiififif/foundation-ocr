import { NextResponse } from "next/server";

import { getAppContext, type AppContext } from "@/lib/app-context";
import {
  enforceApiFeature,
  enforceApiModule,
  enforceApiQuota,
} from "@/lib/api-entitlement";
import { type Permission } from "@/lib/permissions";
import type { ModuleKey } from "@/generated/prisma";
import { hasPermissionInOrg } from "@/src/modules/permissions/check";
import type { SubscriptionFeatureFlag } from "@/src/modules/subscription/types";

type ApiOk = { ok: true; ctx: AppContext };
type ApiErr = { ok: false; response: NextResponse };

export type ApiContextOptions = {
  permission?: Permission;
  module?: ModuleKey;
  feature?: SubscriptionFeatureFlag;
  quota?: "users" | "documents" | "ocr" | "exports";
};

function forbidden(message: string): ApiErr {
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status: 403 }),
  };
}

function normalizeOptions(
  input?: Permission | ApiContextOptions,
): ApiContextOptions {
  if (!input) return {};
  if (typeof input === "string") return { permission: input };
  return input;
}

export async function getApiAppContext(
  input?: Permission | ApiContextOptions,
): Promise<ApiOk | ApiErr> {
  const opts = normalizeOptions(input);
  const ctx = await getAppContext();

  if (ctx.user.banned) {
    return forbidden("Konto zostało wyłączone. Skontaktuj się z administratorem.");
  }

  if (opts.permission) {
    const allowed = ctx.user.isSuperAdmin
      ? true
      : await hasPermissionInOrg(
          ctx.organizationId,
          ctx.user.role,
          opts.permission,
          false,
          ctx.user.id,
        );
    if (!allowed) {
      return forbidden("Brak uprawnień.");
    }
  }

  if (opts.module) {
    const denied = enforceApiModule(ctx, opts.module);
    if (denied) return { ok: false, response: denied };
  }
  if (opts.feature) {
    const denied = enforceApiFeature(ctx, opts.feature);
    if (denied) return { ok: false, response: denied };
  }
  if (opts.quota) {
    const denied = enforceApiQuota(ctx, opts.quota);
    if (denied) return { ok: false, response: denied };
  }

  return { ok: true, ctx };
}
