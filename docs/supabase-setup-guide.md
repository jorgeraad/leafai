# Supabase Setup Guide: Local Development, Auth & Production Deployment

This document walks through setting up Supabase for Leaf AI — from local development to Google OAuth authentication to production deployment.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install the Supabase CLI](#2-install-the-supabase-cli)
3. [Initialize Supabase Locally](#3-initialize-supabase-locally)
4. [Start the Local Stack](#4-start-the-local-stack)
5. [Create a Supabase Cloud Project](#5-create-a-supabase-cloud-project)
6. [Link Local to Remote](#6-link-local-to-remote)
7. [Set Up Google OAuth](#7-set-up-google-oauth)
8. [Configure Auth in Next.js](#8-configure-auth-in-nextjs)
9. [Test Locally](#9-test-locally)
10. [Database Migrations](#10-database-migrations)
11. [Deploy to Production](#11-deploy-to-production)
12. [CI/CD with GitHub Actions](#12-cicd-with-github-actions)

---

## 1. Prerequisites

- **Docker Desktop** (or OrbStack / colima) — the Supabase CLI runs all services in Docker containers
- **Bun** — used as the package manager and runtime for this project
- **A Google Cloud account** — for setting up OAuth credentials
- **A Supabase account** — sign up at [supabase.com](https://supabase.com)

## 2. Install the Supabase CLI

Supabase CLI is installed globally via Bun:

```bash
bun add -g supabase
```

Then run commands directly with `supabase <command>`.

Verify installation:

```bash
supabase --version
```

## 3. Initialize Supabase Locally

From the project root:

```bash
supabase init
```

This creates a `supabase/` directory with a `config.toml` file. Commit this directory to version control.

## 4. Start the Local Stack

```bash
supabase start
```

The first run downloads Docker images and takes a while. Once running, you'll see output like:

| Service       | URL                                                        |
| ------------- | ---------------------------------------------------------- |
| API URL       | `http://localhost:54321`                                   |
| Studio UI     | `http://localhost:54323`                                   |
| Database      | `postgresql://postgres:postgres@localhost:54322/postgres`  |
| Mailpit       | `http://localhost:54324`                                   |
| Anon Key      | (printed in terminal)                                      |
| Service Role  | (printed in terminal)                                      |

To stop:

```bash
supabase stop
```

Add `--no-backup` to reset all local data on next start.

## 5. Create a Supabase Cloud Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project — pick a name, database password, and region
3. Note the **Project Reference ID** from the project URL: `https://supabase.com/dashboard/project/<project-ref>`
4. Go to **Settings → API** and note the **Project URL** and **Anon Key**

## 6. Link Local to Remote

```bash
supabase login
supabase link --project-ref <project-ref>
```

If the remote project already has schema changes (e.g. from the dashboard), pull them first:

```bash
supabase db pull
```

This generates a migration file capturing the remote schema.

## 7. Set Up Google OAuth

### 7a. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services → OAuth consent screen**
   - Choose **External** user type
   - Fill in app name, support email, and developer contact
   - Add scopes: `openid`, `email`, `profile`
4. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (local Next.js dev)
     - `https://your-production-domain.com` (production)
   - **Authorized redirect URIs**:
     - `http://127.0.0.1:54321/auth/v1/callback` (local Supabase)
     - `https://<project-ref>.supabase.co/auth/v1/callback` (production Supabase)
5. Copy the **Client ID** and **Client Secret**

### 7b. Configure Supabase Cloud Dashboard

1. Go to **Authentication → Providers → Google**
2. Enable Google
3. Paste the Client ID and Client Secret
4. Save

### 7c. Configure Local Supabase

Create a `.env` file (or add to your existing one) at the project root — **do not commit this file**:

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Edit `supabase/config.toml` and add:

```toml
[auth.external.google]
enabled = true
client_id = "your-google-client-id"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
skip_nonce_check = false
```

Restart the local stack for changes to take effect:

```bash
supabase stop && supabase start
```

## 8. Configure Auth in Next.js

### 8a. Install dependencies

```bash
bun add @supabase/supabase-js @supabase/ssr
```

### 8b. Environment variables

Add to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-start-output>
```

For production, these will point to your cloud project's URL and anon key.

### 8c. Create Supabase client utilities

Create `src/lib/supabase/client.ts` (browser client):

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `src/lib/supabase/server.ts` (server client):

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — ignore
          }
        },
      },
    }
  );
}
```

### 8d. Create the login action

Create `src/app/auth/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
```

### 8e. Create the OAuth callback route

Create `src/app/auth/callback/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
```

### 8f. Add middleware for session refresh

Create `src/middleware.ts`:

```ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

## 9. Test Locally

1. Make sure Docker is running
2. Start the local Supabase stack: `supabase start`
3. Start the Next.js dev server: `bun run dev`
4. Navigate to your login page and click "Sign in with Google"
5. You should be redirected to Google's consent screen, then back to your app
6. Check the Supabase Studio at `http://localhost:54323` → **Authentication** to see the new user

**Note:** Google OAuth requires internet access even in local development since the browser redirects to Google's servers. The local Supabase Auth service handles the callback at `http://127.0.0.1:54321/auth/v1/callback`.

## 10. Database Migrations

### Creating migrations

Option A — Write SQL manually:

```bash
supabase migration new create_profiles_table
```

Then edit the generated file in `supabase/migrations/`.

Option B — Use Studio UI and diff:

1. Make changes in Studio at `http://localhost:54323`
2. Generate migration: `supabase db diff -f create_profiles_table`

### Applying migrations locally

```bash
supabase db reset
```

This recreates the local database and applies all migration files in order.

### Pushing migrations to remote

```bash
supabase db push
```

## 11. Deploy to Production

### Checklist

- [ ] Update `.env.local` (or your hosting platform's env vars) with production values:
  - `NEXT_PUBLIC_SUPABASE_URL` → your cloud project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your cloud project anon key
  - `NEXT_PUBLIC_SITE_URL` → your production domain
- [ ] Ensure Google Cloud OAuth credentials include production redirect URIs
- [ ] Push all migrations to production: `supabase db push`
- [ ] Configure Google provider in Supabase Dashboard (cloud) with Client ID and Secret
- [ ] Add your production domain to **Authentication → URL Configuration → Redirect URLs** in the Supabase Dashboard

### Deploy migrations

```bash
supabase link --project-ref <project-ref>
supabase db push
```

## 12. CI/CD with GitHub Actions

For automated deployments, create `.github/workflows/supabase-deploy.yml`:

```yaml
name: Deploy Supabase Migrations

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
      SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - run: supabase link --project-ref $SUPABASE_PROJECT_ID

      - run: supabase db push
```

### Required GitHub Secrets

| Secret                   | Where to find it                                          |
| ------------------------ | --------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`  | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD`   | The password you set when creating the project            |
| `SUPABASE_PROJECT_ID`    | Project Settings → General → Reference ID                 |

---

## Quick Reference

| Command                           | Purpose                                    |
| --------------------------------- | ------------------------------------------ |
| `supabase init`               | Initialize local Supabase config           |
| `supabase start`              | Start all local services                   |
| `supabase stop`               | Stop all local services                    |
| `supabase login`              | Authenticate CLI with your account         |
| `supabase link --project-ref` | Link to a remote project                   |
| `supabase db pull`            | Pull remote schema as a migration          |
| `supabase db push`            | Push local migrations to remote            |
| `supabase db reset`           | Reset local DB and replay all migrations   |
| `supabase db diff -f <name>`  | Generate migration from Studio UI changes  |
| `supabase migration new`      | Create a new empty migration file          |

---

## Sources

- [Supabase CLI Getting Started](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Local Development & CLI](https://supabase.com/docs/guides/local-development)
- [Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
- [Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)
- [CLI Reference](https://supabase.com/docs/reference/cli/introduction)
