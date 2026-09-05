# DARK AI — Easy Setup Guide

<p align="center">
  <img src="public/dark-ai-logo.svg" width="360" alt="DARK AI animated logo">
</p>

DARK AI has the **same UI/design** as the supplied project. The production setup is:

```text
DARK AI website (Vercel)
        ↓
DARK AI backend (Render)
        ↓
OpenRouter / Hugging Face + Tavily + Firebase
```

## 1. What you need

You only need these accounts:

1. GitHub — to keep the code.
2. Vercel — to host the website.
3. Render — to host the backend.
4. Firebase — to save users and Premium status.
5. OpenRouter — AI key.
6. Tavily — website-search key.
7. Hugging Face — optional backup AI key.

## 2. First: put the project on GitHub

1. Open GitHub.
2. Create a new repository.
3. Upload **all files from this ZIP**.
4. Make sure `package.json`, `pnpm-lock.yaml`, `render-backend/`, `render.yaml` and `public/` are present.

Do **not** upload your real `.env` files or secret keys.

## 3. Make Firebase

1. Open Firebase Console.
2. Click **Create a project**.
3. Give it any name, for example `dark-ai`.
4. Open the project.
5. Open **Build → Realtime Database**.
6. Click **Create Database**.
7. Choose a location.
8. For a first test, create the database and keep the database URL you see.

Now create a server credential:

1. Open **Project settings**.
2. Open **Service accounts**.
3. Create/download a private key JSON file.
4. Keep it private.
5. From the JSON file, copy:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
6. Your Realtime Database URL becomes `FIREBASE_DATABASE_URL`.

## 4. Make OpenRouter work

1. Open OpenRouter.
2. Create an API key.
3. Copy the key.
4. On Render, add:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=YOUR_KEY
OPENROUTER_MODEL=openrouter/free
```

`openrouter/free` is the default free-model router. Free model availability and limits can change.

## 5. Make website search work

1. Create a Tavily account.
2. Create an API key.
3. Copy it.
4. On Render add:

```env
TAVILY_API_KEY=YOUR_TAVILY_KEY
```

The backend uses Tavily for website search and returns up to 5 results.

## 6. Optional: Hugging Face backup AI

You can keep Hugging Face ready as a backup.

On Render:

```env
HF_TOKEN=YOUR_HF_TOKEN
HF_MODEL=openai/gpt-oss-120b
```

To use Hugging Face instead of OpenRouter:

```env
AI_PROVIDER=hf
```

Do not put these keys in a `NEXT_PUBLIC_*` variable.

## 7. Deploy the backend on Render

1. Open Render.
2. Click **New +**.
3. Click **Web Service**.
4. Connect your GitHub repository.
5. Select the DARK AI repository.
6. Use these settings:

```text
Root Directory: render-backend
Runtime: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /health
Plan: Free
```

7. Add these Render environment variables:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
OPENROUTER_MODEL=openrouter/free
HF_TOKEN=YOUR_HF_TOKEN
HF_MODEL=openai/gpt-oss-120b
TAVILY_API_KEY=YOUR_TAVILY_KEY
FRONTEND_URL=https://YOUR-DOMAIN.com
PREMIUM_TELEGRAM=@MrNewton_2
ADMIN_PASSWORD=MAKE_A_LONG_PASSWORD
ADMIN_TOKEN_SECRET=MAKE_ANOTHER_LONG_RANDOM_SECRET
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_CLIENT_EMAIL=YOUR_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY=YOUR_PRIVATE_KEY
FIREBASE_DATABASE_URL=https://YOUR-PROJECT-default-rtdb.firebaseio.com
OPENROUTER_SITE_URL=https://YOUR-DOMAIN.com
OPENROUTER_APP_NAME=DARK AI
```

8. Click **Create Web Service**.
9. Wait for Render to finish.
10. Open:

```text
https://YOUR-RENDER-NAME.onrender.com/health
```

You should see JSON containing `"ok": true`.

## 8. Deploy the website on Vercel

1. Open Vercel.
2. Click **Add New → Project**.
3. Import the same GitHub repository.
4. Keep it as a Next.js project.
5. Add this environment variable:

```env
RENDER_BACKEND_URL=https://YOUR-RENDER-NAME.onrender.com
NEXT_PUBLIC_BASE_URL=https://YOUR-DOMAIN.com
```

6. Deploy.
7. Open the Vercel website.

## 9. Connect your own domain

1. Open the Vercel project.
2. Open **Settings → Domains**.
3. Add your domain.
4. Vercel will show the DNS record you need.
5. Add that record at your domain provider.
6. Wait for the domain to become active.

After that your admin panel will be:

```text
https://YOUR-DOMAIN.com/admin
```

## 10. Admin password

Go to:

```text
https://YOUR-DOMAIN.com/admin
```

Enter the `ADMIN_PASSWORD` you created on Render.

After login, the admin panel can search users and manually change Premium status.

## 11. How Premium payment works

There is **no automatic payment gateway** in this version.

User does this:

```text
User wants Premium
        ↓
User messages @MrNewton_2 on Telegram
        ↓
User sends account email/UID + payment proof
        ↓
You verify the payment yourself
        ↓
Open https://YOUR-DOMAIN.com/admin
        ↓
Search that user
        ↓
Click Give 30d / +30d / Remove
```

The Premium status is stored in Firebase.

The admin panel supports:

```text
Give Premium
Extend Premium
Remove Premium
```

The backend automatically treats an expired Premium account as Free.

## 12. Very important: user must sign in first

A user appears in the Firebase users list after they sign in and the website syncs their account.

So if you cannot find a user in the admin panel, tell the user:

```text
Please sign in to DARK AI once, then send me your account email/UID on Telegram.
```

## 13. Where the secret keys go

### Render only

Put these on Render:

```env
OPENROUTER_API_KEY
HF_TOKEN
TAVILY_API_KEY
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_DATABASE_URL
ADMIN_PASSWORD
ADMIN_TOKEN_SECRET
```

### Vercel

Only put:

```env
RENDER_BACKEND_URL
NEXT_PUBLIC_BASE_URL
```

Never put your secret provider keys in `NEXT_PUBLIC_*` variables.

## 14. Test everything

### Test backend

Open:

```text
https://YOUR-RENDER-NAME.onrender.com/health
```

You want:

```json
{"ok":true,"service":"dark-ai-backend"}
```

### Test website

Open:

```text
https://YOUR-DOMAIN.com
```

Sign in and send a message.

### Test website search

Ask DARK AI a current question that needs web information.

### Test admin

Open:

```text
https://YOUR-DOMAIN.com/admin
```

Login → search user → give Premium.

## 15. Local build test on your phone/PC

Install Node.js 20+ and pnpm.

Then run:

```bash
corepack enable
corepack prepare pnpm@10.33.2 --activate
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

Backend:

```bash
cd render-backend
npm install
node --check server.mjs
npm start
```

## 16. If Render sleeps

The Free Render service may sleep when idle. The first request after inactivity can therefore take longer.

This is normal for a free hobby deployment.

## 17. If something says "API key missing"

Check Render → your service → **Environment**.

Make sure the variable name is exactly correct.

For example:

```text
OPENROUTER_API_KEY
```

not:

```text
OPENROUTER_KEY
```

Then save and redeploy.

## 18. Final checklist

```text
[ ] GitHub uploaded
[ ] Firebase Realtime Database created
[ ] Firebase service account created
[ ] OpenRouter key added to Render
[ ] Tavily key added to Render
[ ] HF token added to Render (optional)
[ ] Admin password added
[ ] Admin token secret added
[ ] Render backend is live
[ ] /health returns ok:true
[ ] Vercel frontend is live
[ ] RENDER_BACKEND_URL added to Vercel
[ ] Custom domain connected
[ ] /admin opens
[ ] User can sign in
[ ] User appears in admin panel
[ ] Premium can be given manually
```

## 19. Files you should read

- `README.md` — this easy guide.
- `HOSTING.md` — extra hosting details.
- `render-backend/.env.example` — Render variables.
- `.env.vercel.example` — Vercel variables.
- `render.yaml` — Render Blueprint.

## 20. DARK AI logo

The animated logo is included in:

```text
public/dark-ai-logo.svg
```

It is also shown at the top of this README.
