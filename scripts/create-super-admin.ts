/**
 * Tworzy konto Super Admin w Supabase Auth + rekord w Prisma (isSuperAdmin).
 *
 * Wymaga w .env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY  (Supabase → Project Settings → API → service_role)
 *
 * Opcjonalnie:
 *   SUPER_ADMIN_EMAIL=admin@example.com
 *   SUPER_ADMIN_PASSWORD=SuperAdmin2026!
 *   SUPER_ADMIN_NAME=Platform Super Admin
 */
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

import prisma from "../lib/prisma";
import { seedOrganizationModules } from "../src/modules/organizations/modules";

const email = process.env.SUPER_ADMIN_EMAIL?.trim() || "admin@example.com";
const password = process.env.SUPER_ADMIN_PASSWORD?.trim() || "SuperAdmin2026!";
const name = process.env.SUPER_ADMIN_NAME?.trim() || "Platform Super Admin";
const orgId = process.env.SUPER_ADMIN_ORG_ID?.trim() || "org_default";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

async function ensurePlatformOrg() {
  await prisma.organization.upsert({
    where: { id: orgId },
    create: {
      id: orgId,
      slug: "default",
      name: "Organizacja demo",
      tagline: "Platforma — org referencyjna super admina",
    },
    update: {},
  });
  await seedOrganizationModules(orgId);
}

async function createOrGetAuthUserId(): Promise<string> {
  if (!url || !anonKey) {
    throw new Error("Ustaw NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY w .env");
  }

  if (serviceKey) {
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { ...existing.user_metadata, full_name: name, platform_role: "super_admin" },
      });
      console.log(`Supabase: zaktualizowano istniejącego użytkownika ${email}`);
      return existing.id;
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, platform_role: "super_admin" },
    });
    if (error) throw new Error(`Supabase admin.createUser: ${error.message}`);
    console.log(`Supabase: utworzono użytkownika ${email}`);
    return data.user.id;
  }

  console.warn(
    "Brak SUPABASE_SERVICE_ROLE_KEY — próba signUp (wymaga wyłączonego Confirm email w Supabase).",
  );
  const client = createClient(url, anonKey);
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: name, platform_role: "super_admin" } },
  });
  if (error) throw new Error(`Supabase signUp: ${error.message}`);
  if (!data.user?.id) {
    throw new Error(
      "signUp nie zwrócił użytkownika (Confirm email włączone?). Wyłącz Confirm email lub dodaj SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return data.user.id;
}

async function upsertPrismaSuperAdmin(supabaseUserId: string) {
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      id: supabaseUserId,
      supabaseUserId,
      email,
      name,
      role: "ADMIN",
      organizationId: orgId,
      isSuperAdmin: true,
      banned: false,
    },
    update: {
      supabaseUserId,
      name,
      role: "ADMIN",
      organizationId: orgId,
      isSuperAdmin: true,
      banned: false,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: orgId, userId: user.id },
    },
    create: { organizationId: orgId, userId: user.id, role: "ADMIN" },
    update: { role: "ADMIN" },
  });

  return user;
}

async function main() {
  await ensurePlatformOrg();
  const supabaseUserId = await createOrGetAuthUserId();
  const user = await upsertPrismaSuperAdmin(supabaseUserId);

  console.log("\n=== Super Admin gotowy ===");
  console.log(`Email:    ${email}`);
  console.log(`Hasło:    ${password}`);
  console.log(`Prisma:   ${user.id} (isSuperAdmin: ${user.isSuperAdmin})`);
  console.log(`Panel:    ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin`);
  console.log("Zaloguj się na /logowanie tym emailem i hasłem.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
