# Email Setup (Application Form)

The backend sends application submissions to:

- `fabio.juranek@bhakwien13.at`

## Recommended: SMTP (works on most hosts)

Set these environment variables before starting `node server.js`:

```bash
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="465"
export SMTP_USER="your-smtp-user@example.com"
export SMTP_PASS="your-smtp-password-or-app-password"
export SMTP_FROM="Maygasse Finance Society <your-smtp-user@example.com>"
export SMTP_SECURE="true"
```

Then run:

```bash
node server.js
```

## Important provider notes

### Gmail
- Use an **App Password** (not your normal password) if 2FA is enabled.
- SMTP host/port: `smtp.gmail.com:465`

### Microsoft 365 / Outlook
- Typical host/port: `smtp.office365.com:587` (STARTTLS) or provider-specific SMTP relay.
- This project currently implements direct TLS SMTP best with port `465`.
- If your provider only allows 587 STARTTLS, use a relay that supports 465 TLS or add STARTTLS support.

## Fallback mode: sendmail

If `SMTP_HOST` is not set, backend falls back to `/usr/sbin/sendmail`.
This only works if sendmail/postfix is installed and configured on the server.

## Quick test with curl

```bash
curl -F 'name=Max Mustermann' \
     -F 'klasse=4A' \
     -F 'motivation=Ich möchte lernen' \
     -F 'nachricht=Bitte um Aufnahme' \
     -F 'cv=@/path/to/cv.pdf;type=application/pdf' \
     http://127.0.0.1:4173/api/apply
```

Expected successful response:

```json
{"ok":true}
```
