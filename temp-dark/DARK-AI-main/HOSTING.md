# DARK AI — Simple Hosting Guide

This file is the same deployment process as the README, but written as a quick checklist.

## A. Render first

Create a Render Web Service from GitHub.

```text
Root Directory = render-backend
Build Command = npm install
Start Command = npm start
Health Check = /health
Plan = Free
```

Add the environment variables from `render-backend/.env.example`.

Minimum working set:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=YOUR_KEY
OPENROUTER_MODEL=openrouter/free
TAVILY_API_KEY=YOUR_KEY
FRONTEND_URL=https://YOUR-DOMAIN.com
PREMIUM_TELEGRAM=@MrNewton_2
ADMIN_PASSWORD=YOUR_PASSWORD
ADMIN_TOKEN_SECRET=YOUR_RANDOM_SECRET
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_CLIENT_EMAIL=YOUR_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY=YOUR_PRIVATE_KEY
FIREBASE_DATABASE_URL=https://YOUR-PROJECT-default-rtdb.firebaseio.com
```

Copy the Render URL, for example:

```text
https://dark-ai-backend.onrender.com
```

Test:

```text
https://dark-ai-backend.onrender.com/health
```

It must return `ok: true`.

## B. Vercel second

Import the same GitHub repo into Vercel.

Add:

```env
RENDER_BACKEND_URL=https://dark-ai-backend.onrender.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

Deploy.

## C. Domain third

In Vercel → Settings → Domains → add your domain.

Follow the DNS record Vercel gives you.

## D. Admin

Open:

```text
https://yourdomain.com/admin
```

Use `ADMIN_PASSWORD`.

## E. Manual Premium

User sends a Telegram message to:

```text
@MrNewton_2
```

You verify payment yourself.

Then:

```text
/admin
→ search user
→ Give 30d
```

or:

```text
/admin
→ search user
→ +30d
```

To remove:

```text
/admin
→ search user
→ Remove
```

## F. If Premium user is missing

Ask the user to sign in to DARK AI once. The account is then synced to Firebase and appears in the admin panel.

## G. No secrets on Vercel

Do not put these on Vercel:

```text
OPENROUTER_API_KEY
HF_TOKEN
TAVILY_API_KEY
FIREBASE_PRIVATE_KEY
ADMIN_PASSWORD
ADMIN_TOKEN_SECRET
```

Keep them on Render.
