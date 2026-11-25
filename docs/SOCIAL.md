# Cliporo AI — Connecting Social Accounts

This guide sets up "Connections" in **Account** so you (and your users) can link
TikTok, YouTube, and Instagram. Each platform is a separate free developer app.
You only need to set up the ones you want — the rest show **"Set up needed"**
and stay disabled until their keys are present.

> **Status:** connecting accounts (OAuth login + storing the token) is done.
> **Auto-posting the rendered clip** to each platform is the next phase — this
> step gets the accounts linked and the permissions granted.

---

## How it works (plain version)

1. User taps **Connect** on a platform in Account.
2. We send them to that platform's login/permission screen.
3. They approve, the platform sends them back to
   `/<your-app>/api/social/<provider>/callback`, and we store a token that lets
   us post on their behalf later.

For every provider you must register **one redirect URL**:

```
http://localhost:3000/api/social/<provider>/callback          (local testing)
https://YOUR-APP.vercel.app/api/social/<provider>/callback    (production)
```

`<provider>` is `youtube`, `tiktok`, or `instagram`. Register **both** the
local and production URLs so it works in both places.

After adding keys to `.env.local`, **restart** `npm run dev`. On Vercel, add the
same keys under **Settings → Environment Variables** and redeploy.

---

## 1. YouTube (easiest — you already use Google for login)

1. Go to **https://console.cloud.google.com** → your project.
2. **APIs & Services → Library →** enable **"YouTube Data API v3"**.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID →**
   **Web application** (or reuse your login client).
4. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/social/youtube/callback`
   - `https://YOUR-APP.vercel.app/api/social/youtube/callback`
5. Copy the **Client ID** and **Client secret** into `.env.local`:
   ```
   GOOGLE_OAUTH_CLIENT_ID=...
   GOOGLE_OAUTH_CLIENT_SECRET=...
   ```
6. On the **OAuth consent screen**, add the scope
   `.../auth/youtube.upload` and add yourself as a **Test user** while in
   testing.

> Publishing to real channels beyond test users requires Google's OAuth
> **verification** (a review). Fine for your own channel while testing.

---

## 2. TikTok

1. Go to **https://developers.tiktok.com** → **Manage apps → Connect an app**.
2. Add products: **Login Kit** and **Content Posting API**.
3. In **Login Kit**, add the redirect URIs:
   - `http://localhost:3000/api/social/tiktok/callback`
   - `https://YOUR-APP.vercel.app/api/social/tiktok/callback`
4. Request the scopes: `user.info.basic`, `video.upload`, `video.publish`.
5. Copy the **Client key** and **Client secret** into `.env.local`:
   ```
   TIKTOK_CLIENT_KEY=...
   TIKTOK_CLIENT_SECRET=...
   ```

> TikTok requires **app review** before you can post for accounts other than
> your own test accounts. You can connect and test with your own sandbox
> account immediately.

---

## 3. Instagram (via Meta / Facebook)

Instagram publishing runs through the Facebook Graph API and is the most
involved.

1. Go to **https://developers.facebook.com** → **Create App → Business**.
2. Add products: **Facebook Login** and **Instagram**.
3. In **Facebook Login → Settings → Valid OAuth Redirect URIs**, add:
   - `http://localhost:3000/api/social/instagram/callback`
   - `https://YOUR-APP.vercel.app/api/social/instagram/callback`
4. Copy the **App ID** and **App secret** into `.env.local`:
   ```
   META_APP_ID=...
   META_APP_SECRET=...
   ```
5. The Instagram account must be a **Business or Creator** account linked to a
   **Facebook Page**.

> Meta requires **App Review** for `instagram_content_publish` before non-test
> users can post. You can test with accounts that have a **role** on your app
> (admin/developer/tester) right away.

---

## Troubleshooting

- **"Set up needed" won't go away** → both keys for that provider must be in the
  environment, and you must restart the dev server (or redeploy on Vercel).
- **redirect_uri_mismatch** → the URL you registered must match exactly,
  including `http` vs `https` and the `/api/social/<provider>/callback` path.
- **"Couldn't connect … : bad_state"** → you took longer than 10 minutes, or
  cookies are blocked. Try again.
- **Connected but no name shown** → harmless; the token is saved, we just
  couldn't fetch the display name.

---

## Security notes

- Tokens are stored in the `social_connections` table (migration
  `0009_social_connections.sql`), protected by row-level security so each user
  only sees their own. The app never sends tokens to the browser.
- `.env.local` holds your app secrets and is git-ignored — never commit it.
