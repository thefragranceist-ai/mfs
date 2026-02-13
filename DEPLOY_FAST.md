# Go Live Fast (Public URL)

This project is ready to deploy quickly. Fastest path is **Render** (free tier available) or **Railway**.

## Option A — Render (recommended fastest no-CLI path)

1. Push this repo to GitHub.
2. Go to https://render.com and click **New +** → **Blueprint**.
3. Select your GitHub repo.
4. Render auto-detects `render.yaml` in this project and prepares the web service.
5. Set environment variables in Render dashboard:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`
   - `SMTP_SECURE` (`true` recommended)
6. Deploy. You get a public URL like:
   - `https://maygasse-finance-society.onrender.com`

## Option B — Railway (very quick)

1. Push repo to GitHub.
2. Go to https://railway.app → **New Project** → **Deploy from GitHub repo**.
3. Select this repository.
4. Railway uses `npm start` (already configured) to run `node server.js`.
5. Add same SMTP env vars as above.
6. Open generated Railway domain.

## SMTP must be configured for application emails

Recipient is hardcoded as:

- `fabio.juranek@bhakwien13.at`

Without SMTP (or installed sendmail), `/api/apply` returns a helpful setup error.

## Quick Gmail SMTP values

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=youraddress@gmail.com
SMTP_PASS=your_google_app_password
SMTP_FROM=Maygasse Finance Society <youraddress@gmail.com>
```

> Use a Google **App Password** (not your normal password).

## Health check

After deployment, visit:

- `/` for website
- submit the modal application form
- ensure backend returns success and email arrives
