import { randomUUID } from "crypto";

import prisma from "@/lib/prisma";

/**
 * Tworzy / aktualizuje użytkownika w Supabase Auth (auth.users) przez DATABASE_URL.
 */
export async function provisionSupabaseAuthUser(input: {
  email: string;
  password: string;
  name: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const meta = JSON.stringify({
    full_name: input.name,
    ...input.metadata,
  });

  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM auth.users WHERE email = ${email} LIMIT 1
  `;

  if (existing.length > 0) {
    const userId = existing[0].id;
    await prisma.$executeRaw`
      UPDATE auth.users
      SET
        encrypted_password = crypt(${input.password}, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW(),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || ${meta}::jsonb
      WHERE id = ${userId}::uuid
    `;
    return userId;
  }

  const userId = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      ${userId}::uuid, 'authenticated', 'authenticated', ${email},
      crypt(${input.password}, gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      ${meta}::jsonb,
      false, '', '', '', ''
    )
  `;

  const identityId = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      ${identityId}::uuid, ${userId}, ${userId}::uuid,
      ${JSON.stringify({ sub: userId, email, email_verified: true })}::jsonb,
      'email', NOW(), NOW(), NOW()
    )
    ON CONFLICT DO NOTHING
  `;

  return userId;
}
