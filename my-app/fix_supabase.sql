-- The application is broken because Supabase PostgREST API is still trying to expose the 'chatting' schema, but you dropped it!
-- To fix the schema cache error immediately, we just need to recreate the empty schema.

CREATE SCHEMA IF NOT EXISTS chatting;
GRANT USAGE ON SCHEMA chatting TO postgres, anon, authenticated, service_role;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
