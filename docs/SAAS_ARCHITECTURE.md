# Architektura SaaS multi-tenant

## Przegląd

Platforma **docflow-saas** to wielodostępny system (multi-tenant), w którym:

1. Użytkownik rejestruje się z **nazwą organizacji**.
2. Powstaje **izolowany workspace** (tenant) w PostgreSQL.
3. Rejestrujący dostaje rolę **OWNER** (właściciel organizacji).
4. **Super Admin** platformy zarządza wszystkimi tenantami w `/admin`.

## Warstwy

| Warstwa | Ścieżka | Opis |
|--------|---------|------|
| Auth | `src/modules/auth/` | Supabase Auth, sesja, provision użytkowników |
| Tenant | `src/modules/tenant/` | Izolacja danych, audyt |
| Organizacje | `src/modules/organizations/` | Onboarding, moduły, kontekst org |
| Uprawnienia | `src/modules/permissions/` | RBAC, moduły org + per-user |
| Panel platformy | `app/(dashboard)/admin/` | Super Admin |
| Panel tenanta | `app/(dashboard)/` | Dashboard organizacji |

## Model danych (Prisma)

### Platforma
- `User` — profil + `supabaseUserId`, `isSuperAdmin`
- `Organization` — tenant (`status`: active \| suspended)
- `OrganizationMember` — user ↔ org + `role` + `isActive`
- `InviteToken` — zaproszenia do organizacji
- `UserModulePermission` — granularny dostęp do modułów per user
- `Module`, `OrganizationModule` — moduły SaaS per tenant
- `Subscription`, `Usage`, `AuditLog`

### Biznes (zawsze `organizationId`)
- `Document`, `DocumentLineItem`, `OCRResult`, `Upload`
- `Project`, `Contractor`, `InAppNotification`, …

## Role

### Globalna
- **Super Admin** — `User.isSuperAdmin`, panel `/admin`

### W organizacji (hierarchia)
`OWNER` > `ADMIN` > `ACCOUNTANT` > `MANAGER` > `MEMBER` > `VIEWER`

- **OWNER** — twórca organizacji przy rejestracji; pełne zarządzanie tenantem
- **ADMIN** — użytkownicy, ustawienia (bez przekraczania modułów platformy)
- Pozostałe — wg `ROLE_PERMISSIONS` w `src/modules/permissions/constants.ts`

## Moduły

Super Admin włącza moduły per organizacja (`/admin/modules`).

Owner/Admin nadaje użytkownikom dostęp do **włączonych** modułów (`UserModulePermission`).

Nawigacja: `filterNavLinks()` — tylko włączone moduły.

## Przepływy auth

### Rejestracja
1. Formularz `/rejestracja` (imię, email, hasło, **nazwa organizacji**)
2. `signUpWithPassword` → Supabase Auth
3. `createOrganizationForUser` → OWNER + moduły + subskrypcja
4. Redirect `/onboarding/welcome`

### Logowanie
1. `/logowanie` → Supabase `signInWithPassword`
2. `getAppContext()` → aktywna org z cookie / membership
3. Sprawdzenie `organization.status !== suspended`

### Użytkownik w organizacji
- **Utwórz** — `createOrgUser` → `provisionSupabaseAuthUser` + `OrganizationMember`
- **Zaproś** — `inviteOrgUser` → link `/zaproszenie/[token]`
- **Akceptuj** — `acceptInviteAction` → hasło + membership

### Super Admin
- Skrypt: `npm run db:create-super-admin`
- Impersonacja: cookie `saas_impersonate_org` → dashboard tenanta

## Izolacja tenantów

1. Każde zapytanie biznesowe: `where: { organizationId }` (`tenantWhere()`)
2. `getAppContext()` — tylko członkostwo w aktywnej org
3. API — `getAppContext()` / `requirePermission()`
4. Encje spoza org → `TENANT_MISMATCH`

## Komendy

```bash
npm install
# migracja (jeśli P3005 — ręcznie):
npx prisma db execute --file prisma/migrations/20260521120000_multitenant_saas_v2/migration.sql
npm run db:seed
npm run db:create-super-admin
npm run dev
```

## Zmienne `.env`

```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Opcjonalnie: `SUPABASE_SERVICE_ROLE_KEY`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`

## Trasy

| Trasa | Dostęp |
|-------|--------|
| `/rejestracja` | Publiczna |
| `/logowanie` | Publiczna |
| `/zaproszenie/[token]` | Publiczna |
| `/dashboard` | Tenant |
| `/ustawienia/uzytkownicy` | OWNER, ADMIN |
| `/admin/*` | Super Admin |
| `/onboarding/welcome` | Po rejestracji / zaproszeniu |

## Pliki kluczowe

- `prisma/schema.prisma`
- `lib/app-context.ts`
- `proxy.ts`
- `app/actions/auth.ts`, `users.ts`, `invites.ts`, `admin.ts`
- `scripts/create-super-admin-db.ts`
