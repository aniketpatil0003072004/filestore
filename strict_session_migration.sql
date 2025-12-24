-- 1. Add active_device_id column to user_tokens table
ALTER TABLE user_tokens 
ADD COLUMN IF NOT EXISTS active_device_id TEXT;

-- 2. Create RPC function for Secure Login (Single Session Enforced)
CREATE OR REPLACE FUNCTION login_active_session(p_token TEXT, p_device_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_id TEXT;
    v_exists BOOLEAN;
BEGIN
    -- Check if token exists
    SELECT EXISTS(SELECT 1 FROM user_tokens WHERE token = p_token) INTO v_exists;
    IF NOT v_exists THEN
        RETURN 'INVALID_TOKEN';
    END IF;

    -- Get current active device
    SELECT active_device_id INTO v_active_id FROM user_tokens WHERE token = p_token;

    -- Check lock: If locked by DIFFERENT device, reject
    IF v_active_id IS NOT NULL AND v_active_id <> p_device_id THEN
        RETURN 'LOCKED_BY_OTHER_DEVICE';
    END IF;

    -- Lock session to this device
    UPDATE user_tokens
    SET active_device_id = p_device_id
    WHERE token = p_token;

    RETURN 'SUCCESS';
END;
$$;

-- 3. Create RPC function for Logout
CREATE OR REPLACE FUNCTION logout_active_session(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_tokens
    SET active_device_id = NULL
    WHERE token = p_token;
END;
$$;
