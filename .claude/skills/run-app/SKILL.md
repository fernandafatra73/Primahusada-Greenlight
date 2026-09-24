---
name: run-app
description: Launch the Primahusada (LabPrima) dev app — Fastify API plus the Vite web client — and drive it in a real browser to screenshot a change. Use when asked to run, start, open, or screenshot the app, or to confirm a change works in the running app rather than only in tests.
---

# Run the Primahusada app

Web client on `http://localhost:1973`, Fastify API on `http://127.0.0.1:3001`,
SQLite at `apps/api/dev.db`. No database server to start.

## 1. Launch

One command from the repo root starts both, via `concurrently`:

```bash
npm run dev
```

Run it in the background — it stays up for the session.

**The first start is slow (~40 s).** The API's `predev` runs
`prisma generate && prisma migrate deploy` before `tsx watch` boots. Until the
API binds, Vite logs `http proxy error: /api/... AggregateError [ECONNREFUSED]`.
That is expected, not a failure — the web server is already up and the browser
is polling an API that has not started yet. Only treat it as a problem if it
persists after the API logs `request completed`.

This also means `npm run dev` applies any migrations that arrived with a `git
pull`. There is no separate migrate step to remember.

## 2. Wait for readiness

Poll the API rather than guessing at a delay. It is the slow one; if it answers,
both are up.

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:3001/api/dashboard" -UseBasicParsing -TimeoutSec 20
```

## 3. Drive it in a browser

```powershell
$d = "$HOME\.claude\tools\playwright"
node "$d\shot.mjs" "http://localhost:1973/" "<out.png>"
```

Then **read the PNG**. A blank frame means it never rendered.

`shot.mjs` takes `--wait <selector>`, `--click <selector>` and `--full`, and
prints the HTTP status, the page title, and any browser console errors.

The app opens on the login screen ("Masuk ke sistem", email prefilled with
`admin@primahusada.local`). To reach a page behind it, fill the password and
`--click` the submit button.

## Setup (first time on a machine)

`shot.mjs` needs a playwright install. It lives outside the repo so the
project's `package.json` stays clean:

```powershell
$d = "$HOME\.claude\tools\playwright"
New-Item -ItemType Directory -Force $d | Out-Null
'{ "name": "claude-playwright-tools", "private": true, "version": "1.0.0", "type": "module" }' |
  Out-File -FilePath "$d\package.json" -Encoding utf8
npm install --prefix $d playwright
node "$d\node_modules\playwright\cli.js" install chromium
Copy-Item ".claude\skills\run-app\shot.mjs" $d -Force
```

Copy `shot.mjs` there again whenever the repo copy changes — the bare
`import 'playwright'` only resolves next to that install, and `NODE_PATH` does
not apply to ESM.

The chromium download is ~310 MB and takes minutes. If a stale browser build is
already cached under `%LOCALAPPDATA%\ms-playwright`, playwright ignores it and
downloads the build its own version pins; the error names the exact path it
wanted.

## Gotchas

- **Use `localhost:1973`, not `127.0.0.1:1973`.** Vite binds the hostname, so
  the numeric address is refused. The API is fine on either.
- **`curl` from the Bash tool returns `000` for both ports** — the sandbox
  blocks loopback. Use PowerShell `Invoke-WebRequest` for smoke tests.
- **`| Select-Object -Last N` buffers**, so a long PowerShell command shows no
  output until it exits. Drop it if you want to watch progress.
- `Job pivot harian XAU/USD gagal ... status 503` in the API log is an external
  price feed being down. It retries the next day and blocks nothing.
