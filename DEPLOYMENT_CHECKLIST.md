# Deployment Checklist

## 1. Routing Configuration
- [x] **SPA Routing**: Ensure `vercel.json` (for Vercel) or `_redirects` (for Netlify) exists to rewrite all requests to `index.html`.
  - Created `vercel.json` with rewrite rule.
- [x] **Auth Redirection**: Verify `Auth.tsx` handles redirection for:
  - Super Admins -> `/super-admin`
  - Business Owners -> Business Dashboard (or Custom Domain)
  - New Users -> `/register`
  - *Action*: Check browser console logs with `[Auth]` prefix for debugging.

## 2. Environment Variables
Ensure the following variables are set in your deployment environment (e.g., Vercel Project Settings):
- `VITE_SUPABASE_URL`: Your Supabase Project URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anonymous Key.
- *Note*: Ensure these match the values in your local `.env` file (if applicable).

## 3. Build & Dependencies
- [ ] **Dependencies**: Run `npm install` to ensure all packages (including new ones like `recharts`) are installed.
- [ ] **Build**: Run `npm run build` locally to verify there are no compilation errors.
- [ ] **Type Check**: Ensure `src/integrations/supabase/types.ts` is up to date with your database schema.

## 4. Database & RLS
- [ ] **RLS Policies**: Verify Row Level Security policies on Supabase.
  - Super Admins should have `select`, `insert`, `update`, `delete` on `businesses`.
  - Super Admins should have `select` on `profiles`, `payments`, `user_roles`.
- [ ] **Data Integrity**: Ensure `user_roles` table contains the `super_admin` role for your admin user.

## 5. Domain Mapping (If applicable)
- [ ] **DNS Records**: If using custom domains, ensure CNAME/A records point to your deployment.
- [ ] **CORS**: Update Supabase Auth settings to allow redirects to your production domain.

## 6. Verification Steps
1. Deploy the application.
2. Navigate to `/auth`.
3. Login as Super Admin.
4. Verify redirection to `/super-admin`.
5. Check if "Overview", "Businesses", "Subscriptions", "Analytics", and "Users" tabs load data.
6. Refresh the page on a sub-route (e.g., `/super-admin`) to verify SPA routing works.
