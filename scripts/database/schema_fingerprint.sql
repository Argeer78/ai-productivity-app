\pset tuples_only on
\pset format unaligned
\pset fieldsep '|'

SELECT 'table', table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY 1, 2, 3;

SELECT 'column', table_name, lpad(ordinal_position::text, 4, '0'), column_name,
       data_type, udt_schema, udt_name, is_nullable,
       regexp_replace(coalesce(column_default, ''), E'\\s+', ' ', 'g')
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY 1, 2, 3;

SELECT 'constraint', relation.relname, constraint_row.conname,
       constraint_row.contype,
       regexp_replace(pg_get_constraintdef(constraint_row.oid), E'\\s+', ' ', 'g')
FROM pg_constraint AS constraint_row
JOIN pg_class AS relation ON relation.oid = constraint_row.conrelid
JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
ORDER BY 1, 2, 3;

SELECT 'index', tablename, indexname,
       regexp_replace(indexdef, E'\\s+', ' ', 'g')
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY 1, 2, 3;

SELECT 'function', procedure.proname,
       pg_get_function_identity_arguments(procedure.oid),
       regexp_replace(pg_get_functiondef(procedure.oid), E'\\s+', ' ', 'g')
FROM pg_proc AS procedure
JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
WHERE namespace.nspname = 'public'
ORDER BY 1, 2, 3;

SELECT 'trigger', relation.relname, trigger_row.tgname,
       regexp_replace(pg_get_triggerdef(trigger_row.oid), E'\\s+', ' ', 'g')
FROM pg_trigger AS trigger_row
JOIN pg_class AS relation ON relation.oid = trigger_row.tgrelid
JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND NOT trigger_row.tgisinternal
ORDER BY 1, 2, 3;

SELECT 'rls', relation.relname, relation.relrowsecurity, relation.relforcerowsecurity
FROM pg_class AS relation
JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relkind IN ('r', 'p')
ORDER BY 1, 2;

SELECT 'policy', tablename, policyname, permissive, roles::text, cmd,
       regexp_replace(coalesce(qual, ''), E'\\s+', ' ', 'g'),
       regexp_replace(coalesce(with_check, ''), E'\\s+', ' ', 'g')
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY 1, 2, 3;

SELECT 'table_grant', relation.relname,
       CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee_role.rolname END,
       acl.privilege_type, acl.is_grantable
FROM pg_class AS relation
JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
CROSS JOIN LATERAL aclexplode(relation.relacl) AS acl
LEFT JOIN pg_roles AS grantee_role ON grantee_role.oid = acl.grantee
WHERE namespace.nspname = 'public'
  AND relation.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  AND coalesce(grantee_role.rolname, 'PUBLIC') NOT IN ('postgres', 'supabase_admin')
ORDER BY 1, 2, 3, 4;

SELECT 'routine_grant', procedure.proname,
       pg_get_function_identity_arguments(procedure.oid),
       CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE grantee_role.rolname END,
       acl.privilege_type, acl.is_grantable
FROM pg_proc AS procedure
JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
CROSS JOIN LATERAL aclexplode(procedure.proacl) AS acl
LEFT JOIN pg_roles AS grantee_role ON grantee_role.oid = acl.grantee
WHERE namespace.nspname = 'public'
  AND coalesce(grantee_role.rolname, 'PUBLIC') NOT IN ('postgres', 'supabase_admin')
ORDER BY 1, 2, 3, 4, 5;

SELECT 'default_acl', owner_role.rolname, namespace.nspname,
       default_acl.defaclobjtype,
       coalesce(default_acl.defaclacl::text, '')
FROM pg_default_acl AS default_acl
JOIN pg_roles AS owner_role ON owner_role.oid = default_acl.defaclrole
LEFT JOIN pg_namespace AS namespace ON namespace.oid = default_acl.defaclnamespace
WHERE namespace.nspname = 'public'
ORDER BY 1, 2, 3, 4;
