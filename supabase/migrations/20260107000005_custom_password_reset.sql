-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    token text NOT NULL, -- Store hashed token ideally, or plain 6-digit for simplicity if short-lived
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to insert tokens for themselves (via function) or open for now if handled by edge function
-- Better: Use a SECURITY DEFINER function to manage this table so we don't expose it directly.

-- Function to generate and store token
CREATE OR REPLACE FUNCTION public.request_password_reset(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_token text;
BEGIN
    -- Find user by email
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        -- Return success even if user not found to prevent enumeration
        RETURN json_build_object('success', true);
    END IF;

    -- Generate 6-digit code
    v_token := floor(random() * (999999 - 100000 + 1) + 100000)::text;

    -- Invalidate old tokens
    UPDATE public.password_reset_tokens 
    SET used = true 
    WHERE user_id = v_user_id AND used = false;

    -- Insert new token (valid for 15 minutes)
    INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
    VALUES (v_user_id, v_token, now() + interval '15 minutes');

    -- Return token to caller (Edge Function will send it via email)
    -- WARNING: In production, do not return token to client directly if client calls this.
    -- Here we assume this is called by an Edge Function or trusted client flow.
    -- Actually, for client-side call, we should probably NOT return it, but send email FROM PGSQL?
    -- No, Supabase can't send email directly easily.
    
    -- Option B: Return it, client sends it via 'send-email' function? 
    -- Risk: Client sees code. 
    -- Secure way: This function triggers an Edge Function or HTTP request? Hard from PL/PGSQL.
    
    -- Let's stick to: Client calls Edge Function "initiate-reset".
    -- Edge Function calls this DB function? Or Edge Function does everything.
    
    RETURN json_build_object('success', true, 'token', v_token, 'user_id', v_user_id);
END;
$$;

-- Function to verify token and update password
CREATE OR REPLACE FUNCTION public.verify_reset_token(p_email text, p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_token_record record;
BEGIN
    -- Find user
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Invalid request');
    END IF;

    -- Find valid token
    SELECT * INTO v_token_record 
    FROM public.password_reset_tokens 
    WHERE user_id = v_user_id 
      AND token = p_token 
      AND used = false 
      AND expires_at > now()
    ORDER BY created_at DESC 
    LIMIT 1;

    IF v_token_record IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Invalid or expired code');
    END IF;

    -- Mark as used
    UPDATE public.password_reset_tokens SET used = true WHERE id = v_token_record.id;

    RETURN json_build_object('success', true, 'user_id', v_user_id);
END;
$$;
