# Supabase Setup

Health Knowhow is currently built with mock/static CSV data and browser localStorage. This guide prepares the future Supabase migration.

## 1. Create a Supabase Project

1. Go to the Supabase dashboard.
2. Create a new project.
3. Choose a region close to your expected users.
4. Save the database password securely.

## 2. Find Project URL and anon key

In the Supabase dashboard:

1. Open Project Settings.
2. Go to API.
3. Copy the Project URL.
4. Copy the anon public key.

## 3. Create `.env.local`

Do not commit `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it in Client Components, browser code, logs, or public repositories.

## 4. Run `schema.sql`

1. Open Supabase SQL Editor.
2. Copy the contents of `supabase/schema.sql`.
3. Run the SQL.
4. Confirm that the tables were created.

## 5. RLS cautions

The schema enables Row Level Security for all planned tables. The policies in `schema.sql` are examples only.

Before production:

- Define who can read approved experiences.
- Define who can create draft experiences.
- Define who can read and write symptom records.
- Define admin-only review policies.
- Test policies with user and admin accounts.

## 6. Service role key

The service role key bypasses RLS and must only be used on the server.

Use it only in server-only files such as `lib/supabase/admin.ts`. Never import that file from a Client Component.

## 7. Vercel environment variables

In Vercel:

1. Open Vercel Dashboard.
2. Select the project.
3. Open Project Settings.
4. Open Environment Variables.
5. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser.

## 8. Verify after deploy

1. Deploy the project.
2. Open `/admin`.
3. Confirm the database connection status card shows Supabase as configured.
4. Test `/submit`, `/records`, `/experiences`, and `/diseases/diabetes`.
5. Confirm medical and privacy warning text remains visible.
