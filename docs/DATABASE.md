# Baza danych — operacje

## Zalecana ścieżka (dev / Supabase)

```bash
npm run db:sync
```

Wykonuje: `pre-push-fix.sql` → `prisma db push` → `prisma generate` → seed.  
DDL idzie przez **session pooler (port 5432)** — stabilniejsze niż transaction pooler (6543).

## `prisma migrate deploy`

Na istniejącej bazie utworzonej przez `db push` może zwrócić **P3005** (brak baseline `_prisma_migrations`).

Opcje:

1. Kontynuować **`npm run db:sync`** po zmianach w `schema.prisma`.
2. Baseline produkcyjny: [Prisma — add migrate to existing project](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/add-prisma-migrate-to-a-project).
3. Ręcznie wkleić SQL z `prisma/migrations/*/migration.sql` w Supabase SQL Editor.

## Nowe migracje

Po edycji schematu dodaj folder w `prisma/migrations/` i uruchom `npm run db:sync` lub `npx prisma db execute --file prisma/migrations/.../migration.sql`.
