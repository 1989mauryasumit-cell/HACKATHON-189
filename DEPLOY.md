# Production Deployment Guide

This guide explains how to deploy the Kraken Criminal Network Analysis System to production hosting (Vercel and Supabase).

## 1. Supabase PostgreSQL Deployment

1. Create a free account at [Supabase](https://supabase.com/).
2. Create a new project named `Kraken-CNA`.
3. Open the **SQL Editor** in the left sidebar.
4. Copy the entire content of the database migration file:
   [`supabase/migrations/20260827_init.sql`](file:///c:/Users/1989m/OneDrive/Desktop/SIH/HACKATHON%20189/supabase/migrations/20260827_init.sql).
5. Paste the code into the SQL Editor and click **Run**.
6. Go to **Project Settings** > **API** and copy your `Project URL` and `anon public key`.

## 2. Vercel Hosting Deployment

1. Create a free account at [Vercel](https://vercel.com/).
2. Click **Add New** > **Project**.
3. Import your GitHub repository containing the project files.
4. Expand the **Environment Variables** panel and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Your Supabase Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Your Supabase Anon Key)
   - `GEMINI_API_KEY` = (Your Google AI Studio API Key)
5. Click **Deploy**. Vercel will build the production bundle and assign a public `.vercel.app` URL.

## 3. Production Security Hardening

- **Row Level Security (RLS):** Policies are pre-applied via the migration script to ensure investigators can only read their respective operational logs.
- **Append-only Audit Log:** SQL triggers block `UPDATE` and `DELETE` queries on the `audit_logs` table, ensuring records cannot be tampered with.
- **Security Headers:** The `src/middleware.ts` file automatically applies Content Security Policy (CSP), clickjacking defenses, and cross-origin controls on Vercel edge routers.
