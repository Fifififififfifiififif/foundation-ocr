import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import prisma from "@/lib/prisma";

function baseUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function trustedOrigins(): string[] {
  const main = baseUrl();
  const extra = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const list = new Set<string>([main, ...extra]);
  /** Lokalnie często miesza się `localhost` vs `127.0.0.1` — inaczej Better Auth zwraca FORBIDDEN / pusty komunikat. */
  if (process.env.NODE_ENV !== "production") {
    try {
      const u = new URL(main);
      const hostPort = u.port ? `:${u.port}` : "";
      if (u.hostname === "localhost") list.add(`${u.protocol}//127.0.0.1${hostPort}`);
      if (u.hostname === "127.0.0.1") list.add(`${u.protocol}//localhost${hostPort}`);
    } catch {
      /* ignore */
    }
  }
  return Array.from(list);
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: baseUrl(),
  trustedOrigins: trustedOrigins(),
  /** Join session→user po stronie Prisma (unika zepsutego fallback join). */
  experimental: { joins: true },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  user: {
    additionalFields: {
      organizationId: { type: "string", required: false, input: false },
      role: { type: "string", required: false, defaultValue: "USER", input: false },
      banned: { type: "boolean", required: false, defaultValue: false, input: false },
      banReason: { type: "string", required: false, input: false },
      banExpires: { type: "date", required: false, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      if (process.env.NODE_ENV === "development") {
        console.info("[better-auth] reset password link for", user.email, "→", url);
      }
      void user;
      void url;
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const u = user as { organizationId?: string | null };
          if (u.organizationId) return;
          const org = await prisma.organization.create({
            data: {
              name: "Moja organizacja",
              accentColor: "#18181b",
            },
          });
          return {
            data: {
              organizationId: org.id,
              role: "ADMIN",
            },
          };
        },
      },
    },
  },
  plugins: [nextCookies()],
});
