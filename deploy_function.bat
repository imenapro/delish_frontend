@echo off
echo Deploying Edge Function...
cd bake-sync\bake-sync
call npx supabase functions deploy add-domain --no-verify-jwt
pause
