# Supabase Auth Custom SMTP Setup — Gmail

This guide documents how to configure **Supabase Auth** to use **Gmail SMTP** for all authentication-related emails in RecoverAI.

---

## Architecture Overview

RecoverAI uses Gmail SMTP in **two separate contexts**:

```
┌──────────────────────────────────────────────────────────────────┐
│                        Gmail SMTP                                │
│                    smtp.gmail.com:587                             │
│                       (STARTTLS)                                 │
└──────────────┬──────────────────────────┬────────────────────────┘
               │                          │
    ┌──────────▼──────────┐    ┌──────────▼──────────────┐
    │   Supabase Auth     │    │  RecoverAI EmailService  │
    │   (Dashboard SMTP)  │    │  (Backend Python SMTP)   │
    └──────────┬──────────┘    └──────────┬──────────────┘
               │                          │
    ┌──────────▼──────────┐    ┌──────────▼──────────────┐
    │  Authentication     │    │  Transactional Business  │
    │  Emails:            │    │  Emails:                 │
    │  • Email verify     │    │  • Payment failed        │
    │  • Password reset   │    │  • Recovery reminder     │
    │  • Email change     │    │  • Retry scheduled       │
    │  • Recovery links   │    │  • Payment recovered     │
    └─────────────────────┘    │  • Human review notice   │
                               └─────────────────────────┘
```

> **Important**: Both use the same Gmail account, but their responsibilities are completely separate. Do NOT send authentication emails through the backend `EmailService`.

---

## Prerequisites

### 1. Enable 2-Step Verification on Gmail

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Under **"How you sign in to Google"**, click **2-Step Verification**
3. Follow the prompts to enable it

### 2. Generate a Google App Password

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Enter `RecoverAI Supabase Auth`
4. Click **Generate**
5. Copy the 16-character App Password (e.g., `abcd efgh ijkl mnop`)
6. **Store this securely** — you will not be able to see it again

> **⚠️ Do NOT use your regular Gmail account password. Only the App Password will work with SMTP.**

---

## Supabase Dashboard Configuration

This is a **manual step** that cannot be performed programmatically from the application code.

### Steps

1. Log in to [app.supabase.com](https://app.supabase.com)
2. Select your RecoverAI project
3. Navigate to: **Authentication** → **Email Templates** → **SMTP Settings**
4. Toggle **Enable Custom SMTP** to **ON**
5. Enter the following configuration:

| Field | Value |
|---|---|
| **Sender email** | Your Gmail address (e.g., `recoverai.project@gmail.com`) |
| **Sender name** | `RecoverAI` |
| **Host** | `smtp.gmail.com` |
| **Port** | `587` |
| **Minimum interval** | `60` |
| **Username** | Your Gmail address (same as sender email) |
| **Password** | Your **Google App Password** (16-character code from above) |

6. Click **Save**

### Critical Rules

- The **Username** must be the actual Gmail address used to authenticate — NOT a random value
- The **Password** must be the Google App Password — NOT the regular Gmail password
- The **Sender email** should match the **Username** to avoid Gmail rejecting the message

### Example Configuration

If your Gmail account is `recoverai.project@gmail.com`:

```
Sender email:    recoverai.project@gmail.com
Sender name:     RecoverAI
Host:            smtp.gmail.com
Port:            587
Minimum interval: 60
Username:        recoverai.project@gmail.com
Password:        abcd efgh ijkl mnop     ← Google App Password
```

---

## Backend Environment Variables

The backend `.env` file uses the **same Gmail credentials** for transactional emails (dunning, recovery, etc.).

These are configured in `backend/.env`:

```env
GMAIL_SMTP_HOST=smtp.gmail.com
GMAIL_SMTP_PORT=587
GMAIL_SMTP_USER=recoverai.project@gmail.com
GMAIL_SMTP_PASSWORD=abcdefghijklmnop
GMAIL_SENDER_EMAIL=recoverai.project@gmail.com
GMAIL_SENDER_NAME=RecoverAI
```

> **⚠️ Never commit `backend/.env` to Git.** The `.gitignore` already excludes it.

---

## Authentication Flow

All authentication emails flow through Supabase Auth APIs — the backend does NOT send auth emails:

### Sign Up

```
Frontend: authStore.signup(name, email, password)
    → supabase.auth.signUp({ email, password, options: { emailRedirectTo } })
    → Supabase Auth generates verification email
    → Gmail SMTP delivers email (via Dashboard Custom SMTP config)
    → User clicks verification link
    → Supabase verifies the user
    → Authenticated session → RecoverAI Dashboard
```

### Password Reset

```
Frontend: authStore.resetPasswordForEmail(email)
    → supabase.auth.resetPasswordForEmail(email, { redirectTo })
    → Supabase Auth generates reset email
    → Gmail SMTP delivers email
    → User clicks recovery link
    → authStore.updateUserPassword(newPassword)
    → supabase.auth.updateUser({ password })
```

### Resend Verification

```
Frontend: authStore.resendVerificationEmail(email)
    → supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })
    → Gmail SMTP delivers verification email
```

### Email Change

```
Frontend: supabase.auth.updateUser({ email: newEmail })
    → Supabase Auth generates confirmation email
    → Gmail SMTP delivers email
```

---

## Security Checklist

- [ ] Gmail App Password is stored **only** in:
  - `backend/.env` (for transactional emails)
  - Supabase Dashboard SMTP Settings (for auth emails)
- [ ] `backend/.env` is listed in `.gitignore`
- [ ] No `GMAIL_SMTP_PASSWORD` or `GMAIL_SMTP_USER` in any frontend file
- [ ] No `VITE_GMAIL_*` environment variables exist
- [ ] Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are exposed to the frontend
- [ ] Supabase service-role key is never exposed to the frontend
- [ ] No Gmail credentials appear in API responses

---

## Testing Checklist

After completing the Supabase Dashboard configuration:

- [ ] Register a new user → verification email arrives from `RecoverAI <your-gmail@gmail.com>`
- [ ] Verification email is delivered through Gmail SMTP (check email headers for `smtp.gmail.com`)
- [ ] Verification link redirects to `/auth/callback` and works
- [ ] User can log in after verification
- [ ] Forgot Password → reset email arrives from Gmail SMTP
- [ ] Password reset link works and redirects to `/auth/callback?type=recovery`
- [ ] New password can be set successfully
- [ ] Resend verification email works (respects 60-second minimum interval)
- [ ] Email change confirmation works
- [ ] No custom authentication email is generated by FastAPI backend
- [ ] Gmail credentials are not visible in browser DevTools / Network tab
- [ ] Existing payment recovery transactional emails continue working via `EmailService`
- [ ] Rate limit error message displays correctly when sending too frequently

---

## Troubleshooting

### "Invalid login credentials" on SMTP

- Verify you are using the **App Password**, not the regular Gmail password
- Verify **2-Step Verification** is enabled on the Gmail account
- Regenerate the App Password if needed

### Emails not arriving

- Check Gmail "Sent" folder — Gmail SMTP saves sent emails there
- Check recipient's spam/junk folder
- Verify the sender email matches the SMTP username
- Check Supabase Dashboard → Authentication → Logs for delivery errors

### "Over email send rate limit"

- Supabase enforces the minimum interval (60 seconds) per user
- The frontend `authStore` already handles this error with a user-friendly message

### Verification link not working

- Ensure `emailRedirectTo` in the frontend matches your deployed URL
- Check that your Supabase project's **Site URL** is configured correctly in Dashboard → Authentication → URL Configuration
