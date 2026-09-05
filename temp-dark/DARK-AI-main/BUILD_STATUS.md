# DARK AI build verification

Date: 2026-09-04

## Checks completed in the packaging environment

- All JavaScript/TypeScript source files were parsed/transpiled for syntax using the installed TypeScript compiler, excluding generated `.d.ts` files.
- The final changed routes were individually syntax-checked.
- `render-backend/server.mjs` passed `node --check`.
- `package.json`, `render-backend/package.json`, and `vercel.json` were parsed successfully as JSON.
- Required Premium/admin route files were checked for presence.
- No real secret `.env` or Firebase service-account file is included in the archive.

## Full dependency/build limitation

A true dependency install could not be completed in this packaging environment because outbound access to the npm registry/DNS was unavailable. Both Corepack/pnpm download and npm dependency installation timed out/failed at registry access.

Therefore this package must not be described as having a completed local `pnpm install` + `pnpm build` in this environment. The correct deployment environment (Vercel/Render or a machine with npm registry access) will perform the actual dependency installation and production build.

## Production build commands

Frontend:

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
