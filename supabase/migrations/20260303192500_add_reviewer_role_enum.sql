-- Add reviewer enum value in its own migration/transaction.
-- PostgreSQL requires committing enum changes before using the new value.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role'
      AND e.enumlabel = 'reviewer'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'reviewer';
  END IF;
END $$;
