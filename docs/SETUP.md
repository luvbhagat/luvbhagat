# Cliporo AI — Setup & Deploy Guide

This guide is written for someone new to coding. Follow it top to bottom.
Every command goes in your terminal (the black box where you type), run from
inside the project folder.

---

## 0. What you have right now

A working **auth skeleton** — the foundation of Cliporo AI. No video features
yet. It includes:

- A landing page (`/`)
- A login page (`/login`) with **email/password** and **Google** sign-in
- A protected dashboard (`/dashboard`) that says "Welcome, <your email>"
- A navbar with the app name and a **Sign out** button

---

## 1. Run it on your own computer

### 1.1 Install the dependencies (only needed once)

```bash
npm install
```

### 1.2 Create your secrets file

The app needs to know your Supabase keys. Copy the example file:

```bash
cp .env.example .env.local
```

Now open `.env.local` and fill in the real values. Section 2 below explains
where to get them. (`.env.local` is private and never uploaded to GitHub.)

### 1.3 Start the app

```bash
npm run dev
```

Open **http://localhost:3000** in your browser. To stop the app, press
`Ctrl + C` in the terminal.

---

## 2. Set up Supabase (your login system + database)

Supabase is a free service that handles user accounts for you.

### 2.1 Create the project

1. Go to **https://supabase.com** and sign up (free).
2. Click **New project**. Give it a name (e.g. "cliporo"), pick a strong
   database password (save it somewhere), choose a region near you, **Create**.
3. Wait ~2 minutes for it to finish setting up.

### 2.2 Copy your two keys into `.env.local`

1. In your Supabase project, click **Settings** (gear icon) → **API**.
2. Copy **Project URL** → paste into `NEXT_PUBLIC_SUPABASE_URL`.
3. Under **Project API keys**, copy the **`anon` / `public`** key → paste into
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Leave `NEXT_PUBLIC_SITE_URL` as `http://localhost:3000` for now.

> ⚠️ Never copy the **`service_role`** key into this app — that one is a
> master key and must stay secret on a server only.

### 2.3 Turn on email/password login

1. In Supabase: **Authentication** → **Providers** → **Email**.
2. Make sure **Enable Email provider** is ON.
3. (Optional, easier while testing) Turn **Confirm email** OFF so new accounts
   work instantly without clicking an email link. Turn it back ON before
   launch.

---

## 3. Set up Google login

This has two parts: get Google credentials, then paste them into Supabase.

### 3.1 Get a Google OAuth Client ID + Secret

1. Go to **https://console.cloud.google.com**.
2. Create a new project (top bar → project dropdown → New Project).
3. Go to **APIs & Services** → **OAuth consent screen**. Choose **External**,
   fill in the app name ("Cliporo AI"), your email, and save. Add yourself as
   a **Test user** while developing.
4. Go to **APIs & Services** → **Credentials** → **Create Credentials** →
   **OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized redirect URIs** → Add this URL (get the exact one from
     Supabase: **Authentication → Providers → Google**, it shows a "Callback
     URL" like below):
     ```
     https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback
     ```
5. Click **Create**. Copy the **Client ID** and **Client secret**.

### 3.2 Paste them into Supabase

1. In Supabase: **Authentication** → **Providers** → **Google**.
2. Turn **Enable** ON.
3. Paste the **Client ID** and **Client Secret**. **Save**.

### 3.3 Tell Supabase where to send users after login

1. In Supabase: **Authentication** → **URL Configuration**.
2. Set **Site URL** to `http://localhost:3000` (while developing).
3. Under **Redirect URLs**, add both:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-APP-NAME.vercel.app/auth/callback` (add this once you deploy
     — see Section 5).

Now restart the app (`Ctrl + C`, then `npm run dev`) and try
**Continue with Google** on the login page.

---

## 4. Push the code to GitHub

If this project is not already connected to a GitHub repo of your own:

```bash
# Stage and commit your work
git add .
git commit -m "Cliporo AI auth foundation"

# Push to your branch
git push -u origin claude/auraclip-foundation-setup-q5x450
```

> Your real secrets in `.env.local` are **not** uploaded — `.gitignore` blocks
> them. Only `.env.example` (with placeholder text) is committed. 👍

---

## 5. Deploy to Vercel (put it live on the internet)

Vercel hosts Next.js apps for free.

### 5.1 Import the project

1. Go to **https://vercel.com** and sign up with your **GitHub** account.
2. Click **Add New… → Project**.
3. Find your repository in the list and click **Import**.
4. Vercel auto-detects Next.js — you don't need to change build settings.

### 5.2 Add your environment variables (IMPORTANT)

Before clicking Deploy, open **Environment Variables** and add these three.
Use the SAME values from your `.env.local`, EXCEPT the site URL:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon/public key |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR-APP-NAME.vercel.app` |

Then click **Deploy** and wait a minute or two.

### 5.3 Point Supabase + Google at the live URL

After deploying, Vercel gives you a URL like `https://cliporo.vercel.app`.

1. **Supabase** → **Authentication** → **URL Configuration**:
   - Add `https://cliporo.vercel.app/auth/callback` to **Redirect URLs**.
   - (Optionally update **Site URL** to the Vercel URL.)
2. **Google Cloud Console** → your OAuth client → **Authorized redirect URIs**
   already points at Supabase's callback, so no change needed there — Google
   only ever talks to Supabase, and Supabase talks to your app.

That's it — your app is live with working email and Google login. 🎉

---

## 6. Quick troubleshooting

- **Google login loops back to /login** → your `/auth/callback` URL isn't in
  Supabase's **Redirect URLs** list, or `NEXT_PUBLIC_SITE_URL` is wrong.
- **"Invalid login credentials"** → wrong email/password, or the account was
  created with "Confirm email" ON and hasn't been confirmed yet.
- **Dashboard always redirects to /login** → your Supabase keys in
  `.env.local` (or Vercel) are missing or wrong.
- **Changes to `.env.local` don't take effect** → restart `npm run dev`.
