-- Ensure waitlist auto-linking also runs for existing auth users on sign-in.
-- This covers cases where a user existed before the waitlist offer row was created.

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email
    OR OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at
    OR OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.handle_new_user();

