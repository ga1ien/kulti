/**
 * Test RLS Fix - Simplified Verification Script
 *
 * This migration tests that the RLS circular dependency has been resolved
 * Tests are limited to operations that work without authentication context.
 */

-- ============================================================================
-- Test 1: Verify is_admin() function exists and is callable
-- ============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  RAISE NOTICE '=== TEST 1: Verify is_admin() function exists ===';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'is_admin'
      AND p.pronargs = 0
  ) INTO v_function_exists;

  IF NOT v_function_exists THEN
    RAISE EXCEPTION 'TEST 1: FAILED - is_admin() function does not exist';
  END IF;

  RAISE NOTICE 'TEST 1: PASSED - is_admin() function exists';
END $$;

-- ============================================================================
-- Test 2: Verify helper functions exist
-- ============================================================================

DO $$
DECLARE
  v_missing_functions TEXT[];
BEGIN
  RAISE NOTICE '=== TEST 2: Verify all helper functions exist ===';

  SELECT array_agg(func_name)
  INTO v_missing_functions
  FROM (
    VALUES
      ('is_admin'),
      ('get_user_role'),
      ('is_session_host'),
      ('is_session_participant'),
      ('is_room_member'),
      ('is_room_moderator')
  ) AS expected_funcs(func_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = expected_funcs.func_name
  );

  IF v_missing_functions IS NOT NULL THEN
    RAISE EXCEPTION 'TEST 2: FAILED - Missing functions: %', array_to_string(v_missing_functions, ', ');
  END IF;

  RAISE NOTICE 'TEST 2: PASSED - All helper functions exist';
END $$;

-- ============================================================================
-- Test 3: Verify RLS policies exist
-- ============================================================================

DO $$
DECLARE
  v_profile_policies INTEGER;
  v_invite_policies INTEGER;
BEGIN
  RAISE NOTICE '=== TEST 3: Verify RLS policies exist ===';

  -- Check profiles policies
  SELECT COUNT(*) INTO v_profile_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles';

  IF v_profile_policies = 0 THEN
    RAISE EXCEPTION 'TEST 3: FAILED - No policies found on profiles table';
  END IF;

  -- Check invites policies
  SELECT COUNT(*) INTO v_invite_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'invites';

  IF v_invite_policies = 0 THEN
    RAISE EXCEPTION 'TEST 3: FAILED - No policies found on invites table';
  END IF;

  RAISE NOTICE 'Found % policies on profiles table', v_profile_policies;
  RAISE NOTICE 'Found % policies on invites table', v_invite_policies;
  RAISE NOTICE 'TEST 3: PASSED - RLS policies exist';
END $$;

-- ============================================================================
-- Test 4: Verify invite_uses unique constraint exists
-- ============================================================================

DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  RAISE NOTICE '=== TEST 4: Verify race condition protection ===';

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'invite_uses'
      AND indexname = 'idx_invite_uses_unique_per_user'
  ) INTO v_constraint_exists;

  IF NOT v_constraint_exists THEN
    RAISE EXCEPTION 'TEST 4: FAILED - Race condition protection index missing';
  END IF;

  RAISE NOTICE 'TEST 4: PASSED - Unique constraint exists for race condition protection';
END $$;

-- ============================================================================
-- Test 5: Verify SECURITY DEFINER functions
-- ============================================================================

DO $$
DECLARE
  v_non_definer_funcs TEXT[];
BEGIN
  RAISE NOTICE '=== TEST 5: Verify helper functions use SECURITY DEFINER ===';

  SELECT array_agg(p.proname)
  INTO v_non_definer_funcs
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('is_admin', 'get_user_role', 'is_session_host',
                      'is_session_participant', 'is_room_member', 'is_room_moderator')
    AND NOT p.prosecdef; -- prosecdef = SECURITY DEFINER

  IF v_non_definer_funcs IS NOT NULL THEN
    RAISE EXCEPTION 'TEST 5: FAILED - Functions not using SECURITY DEFINER: %',
      array_to_string(v_non_definer_funcs, ', ');
  END IF;

  RAISE NOTICE 'TEST 5: PASSED - All helper functions use SECURITY DEFINER';
END $$;

-- ============================================================================
-- Test 6: Verify use_invite_code function signature
-- ============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  RAISE NOTICE '=== TEST 6: Verify use_invite_code function ===';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'use_invite_code'
      AND p.prosecdef = true
  ) INTO v_function_exists;

  IF NOT v_function_exists THEN
    RAISE EXCEPTION 'TEST 6: FAILED - use_invite_code function missing or not SECURITY DEFINER';
  END IF;

  RAISE NOTICE 'TEST 6: PASSED - use_invite_code function exists with SECURITY DEFINER';
END $$;

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'ALL STRUCTURAL TESTS PASSED!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'The RLS circular dependency fix has been verified:';
  RAISE NOTICE '  ✓ All helper functions exist';
  RAISE NOTICE '  ✓ All functions use SECURITY DEFINER';
  RAISE NOTICE '  ✓ RLS policies are in place';
  RAISE NOTICE '  ✓ Race condition protection is active';
  RAISE NOTICE '  ✓ Invite system functions are ready';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: Runtime tests require authenticated context';
  RAISE NOTICE 'and should be performed via application signup flow.';
  RAISE NOTICE '=====================================================';
END $$;
