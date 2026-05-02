@echo off
echo.
echo ==========================================
echo   Supabase Edge Functions Deployment
echo ==========================================
echo.

set PROJECT_ID=jcdaovmwmpkflccecsrg

echo [1/3] Deploying all functions to project %PROJECT_ID%...
call npx supabase functions deploy reset-password-flow --project-ref %PROJECT_ID% --no-verify-jwt
call npx supabase functions deploy add-domain --project-ref %PROJECT_ID% --no-verify-jwt
call npx supabase functions deploy send-email --project-ref %PROJECT_ID% --no-verify-jwt
call npx supabase functions deploy check-low-stock --project-ref %PROJECT_ID% --no-verify-jwt
call npx supabase functions deploy send-invite-credentials --project-ref %PROJECT_ID% --no-verify-jwt
call npx supabase functions deploy send-sms --project-ref %PROJECT_ID% --no-verify-jwt

echo.
echo [2/3] Setting secrets for email service...
echo (Note: You may need to provide your Gmail credentials if not already set)
echo call npx supabase secrets set GMAIL_USER="your-email@gmail.com" GMAIL_PASS="your-app-password" --project-ref %PROJECT_ID%

echo.
echo [3/3] Deployment complete!
echo Please check your browser console again.
echo.
pause
