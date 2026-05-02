@echo off
echo Linking Supabase Project...
call npx supabase link --project-ref jcdaovmwmpkflccecsrg
if %errorlevel% neq 0 (
    echo.
    echo Linking failed. You might need to enter your database password above.
    echo If it asks for a password, please type it and press Enter.
)

echo.
echo Pushing Database Migrations...
call npx supabase db push

pause
