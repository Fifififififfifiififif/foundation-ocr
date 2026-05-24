# Super Admin — konto platformy

Super Admin zarządza **wszystkimi organizacjami** w panelu `/admin`:

- **Organizacje** — lista tenantów, plany (`starter` / `pro` / `enterprise`), status subskrypcji
- **Moduły** — włączanie/wyłączanie modułów SaaS per organizacja (`/admin/modules?org=...`)

## Utworzenie konta (jednorazowo)

### 1. Service Role Key

W [Supabase Dashboard](https://supabase.com/dashboard) → projekt **jkcjbdfukahqmfejlwxz** →  
**Project Settings → API** → skopiuj **`service_role`** (secret, nie anon).

Dopisz do `.env` (nigdy nie commituj):

```env
SUPABASE_SERVICE_ROLE_KEY=eyJ...twoj-service-role...
```

Opcjonalnie:

```env
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=SuperAdmin2026!
SUPER_ADMIN_NAME=Platform Super Admin
```

### 2. Uruchom skrypt

```bash
npm run db:create-super-admin
```

Skrypt:

1. Tworzy lub aktualizuje użytkownika w **Supabase Auth** (email potwierdzony, bez maila).
2. Ustawia w bazie `user.isSuperAdmin = true` i członkostwo w `org_default`.

### 3. Logowanie

- URL: http://localhost:3000/logowanie  
- Email: `admin@example.com` (domyślnie)  
- Hasło: `SuperAdmin2026!` (domyślnie — **zmień po pierwszym logowaniu**)

W menu użytkownika: **Super Admin** → **Panel platformy** (`/admin`).

## Bez Service Role Key

Skrypt próbuje `signUp` przez klucz anon — działa tylko gdy w Supabase wyłączone jest **Confirm email** i nie ma limitu wysyłki maili. Zalecane: użyj **service_role**.

## Ręcznie w Supabase Dashboard

1. Authentication → Users → **Add user** → email + hasło, **Auto Confirm**.
2. W bazie (SQL lub Prisma Studio): `UPDATE "user" SET "isSuperAdmin" = true WHERE email = 'twój@email.com';`
3. Ustaw `supabaseUserId` na UUID użytkownika z Auth.
