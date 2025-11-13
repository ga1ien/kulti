/**
 * Automatic Invite Code Generation Trigger
 *
 * This trigger automatically generates 5 invite codes for every new user
 * when their profile is created. No manual action needed!
 */

-- ============================================================================
-- Create trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_generate_initial_invite_codes()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate codes asynchronously (don't block profile creation if it fails)
  BEGIN
    PERFORM create_initial_user_invite_codes(NEW.id);
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the profile creation
      RAISE WARNING 'Failed to auto-generate invite codes for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Create trigger that fires after profile insert
-- ============================================================================

DROP TRIGGER IF EXISTS auto_generate_invite_codes_on_signup ON profiles;

CREATE TRIGGER auto_generate_invite_codes_on_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_initial_invite_codes();

-- Add helpful comment
COMMENT ON TRIGGER auto_generate_invite_codes_on_signup ON profiles IS
'Automatically generates 5 invite codes for new users when their profile is created';
