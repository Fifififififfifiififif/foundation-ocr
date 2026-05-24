-- Usunięcie modułu „Asystent AI” (nigdy nie zaimplementowany w UI).

DELETE FROM "user_module_permission" WHERE "moduleKey"::text = 'AI_ASSISTANT';

DELETE FROM "organization_module"
WHERE "moduleId" IN (SELECT "id" FROM "module" WHERE "key"::text = 'AI_ASSISTANT');

DELETE FROM "permission" WHERE "moduleKey"::text = 'AI_ASSISTANT';

DELETE FROM "module" WHERE "key" = 'AI_ASSISTANT';

-- Wartość enum AI_ASSISTANT może pozostać w PostgreSQL (bezpieczne, nieużywane).
