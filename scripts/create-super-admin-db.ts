/**
 * Tworzy Super Admin w auth.users (Supabase) przez połączenie DATABASE_URL.
 * Nie wymaga SUPABASE_SERVICE_ROLE_KEY.
 */
import "dotenv/config";

import { randomUUID } from "crypto";

import prisma from "../lib/prisma";
import { seedOrganizationModules } from "../src/modules/organizations/modules";

const email = process.env.SUPER_ADMIN_EMAIL?.trim() || "admin@example.com";
const password = process.env.SUPER_ADMIN_PASSWORD?.trim() || "SuperAdmin2026!";
const name = process.env.SUPER_ADMIN_NAME?.trim() || "Platform Super Admin";
const orgId = process.env.SUPER_ADMIN_ORG_ID?.trim() || "org_default";

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

async function ensureAuthUser(): Promise<string> {
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM auth.users WHERE email = ${email} LIMIT 1
  `;

  if (existing.length > 0) {
    const userId = existing[0].id;
    await prisma.$executeRaw`
      UPDATE auth.users
      SET
        encrypted_password = crypt(${password}, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW(),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || ${JSON.stringify({ full_name: name, platform_role: "super_admin" })}::jsonb
      WHERE id = ${userId}::uuid
    `;
    console.log(`Auth: zaktualizowano hasło użytkownika ${email}`);
    return userId;
  }

  const userId = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      ${userId}::uuid,
      'authenticated',
      'authenticated',
      ${email},
      crypt(${password}, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      ${JSON.stringify({ full_name: name, platform_role: "super_admin" })}::jsonb,
      false,
      '',
      '',
      '',
      ''
    )
  `;

  const identityId = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      ${identityId}::uuid,
      ${userId},
      ${userId}::uuid,
      ${JSON.stringify({
        sub: userId,
        email,
        email_verified: true,
        phone_verified: false,
      })}::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING
  `;

  console.log(`Auth: utworzono użytkownika ${email}`);
  return userId;
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
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("Brak DATABASE_URL w .env");
  }

  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await ensurePlatformOrg();
  const supabaseUserId = await ensureAuthUser();
  const user = await upsertPrismaSuperAdmin(supabaseUserId);

  console.log("\n=== Super Admin gotowy ===");
  console.log(`Email:    ${email}`);
  console.log(`Hasło:    ${password}`);
  console.log(`Auth ID:  ${supabaseUserId}`);
  console.log(`Prisma:   ${user.id} (isSuperAdmin: ${user.isSuperAdmin})`);
  console.log(`Logowanie: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/logowanie`);
  console.log(`Panel:     ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
