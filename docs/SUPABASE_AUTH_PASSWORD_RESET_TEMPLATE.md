# Supabase Auth Password Reset Email Template

This template styles the Supabase Auth **Reset Password** email to match the RecoverAI brand design, using the premium dark mode layout with an off-white header banner and custom badges.

To configure this:
1. Log in to [app.supabase.com](https://app.supabase.com).
2. Go to **Authentication** -> **Email Templates** -> **Reset Password**.
3. Replace the default email body with the HTML code below.

---

### Email Subject
`Reset your password`

### Email Body (HTML)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #0f172a; border-radius: 24px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);">
    
    <!-- Brand Header (Off-White Light Banner) -->
    <tr>
      <td style="background-color: #f8fafc; padding: 26px 32px; border-bottom: 1px solid #e2e8f0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                <span style="color: #eab308;">⚡</span> RECOVERAI
              </div>
              <div style="font-size: 11px; color: #64748b; font-family: monospace; margin-top: 3px; font-weight: bold;">
                Account Security Notice &bull; RecoverAI
              </div>
            </td>
            <td align="right" valign="middle">
              <span style="display: inline-block; background-color: #fef3c7; color: #d97706; font-size: 10px; font-family: monospace; font-weight: 800; padding: 5px 12px; border-radius: 9999px; text-transform: uppercase; border: 1px solid #fde68a;">
                Password Reset
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content (Dark Slate Layout) -->
    <tr>
      <td style="padding: 40px 32px;">
        
        <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.3; letter-spacing: -0.02em;">
          Account Recovery: Reset Your Password
        </h1>

        <p style="font-size: 15px; line-height: 1.6; color: #e2e8f0; margin: 0 0 16px 0;">
          Hi there,
        </p>

        <p style="font-size: 14px; line-height: 1.65; color: #94a3b8; margin: 0 0 24px 0;">
          We received a request to reset your password for your RecoverAI admin account linked to <strong>{{ .Email }}</strong>. Follow the link below to choose a new password.
        </p>

        <!-- Details Summary Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #090d16; border: 1px solid #1e293b; border-radius: 16px; margin-bottom: 32px;">
          <tr>
            <td style="padding: 24px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 10px; font-family: monospace; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                      REQUEST TYPE
                    </div>
                    <div style="font-size: 18px; font-weight: 900; color: #ffffff; margin-top: 4px;">
                      Password Reset
                    </div>
                  </td>
                  <td align="right">
                    <div style="font-size: 10px; font-family: monospace; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                      SECURITY STATUS
                    </div>
                    <div style="font-size: 12px; font-family: monospace; color: #f59e0b; font-weight: 800; margin-top: 6px; text-transform: uppercase;">
                      PENDING VERIFICATION
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 16px; border-top: 1px solid #1e293b; margin-top: 16px;">
                    <div style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
                      <strong>Note:</strong> For security reasons, this reset link is only valid for a limited time. If you did not initiate this request, you can safely ignore this email.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Primary CTA Button (Lime Green Highlight) -->
        <div style="text-align: center; margin: 36px 0 28px 0;">
          <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #a3e635; color: #0b0f19; padding: 15px 36px; border-radius: 14px; text-decoration: none; font-weight: 900; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 4px 14px rgba(163, 230, 53, 0.25);">
            Reset Password &rarr;
          </a>
        </div>

        <!-- Direct Link Backup -->
        <div style="background-color: #090d16; border: 1px solid #1e293b; border-radius: 12px; padding: 14px; margin-top: 24px; font-size: 11px; color: #64748b; line-height: 1.5; word-break: break-all;">
          <strong>Secure link not working? Copy and paste this URL into your browser:</strong><br>
          <a href="{{ .ConfirmationURL }}" style="color: #38bdf8; text-decoration: underline; margin-top: 4px; display: inline-block;">{{ .ConfirmationURL }}</a>
        </div>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #090d16; padding: 24px 32px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; text-align: center; line-height: 1.6;">
        RecoverAI Platform &bull; Autonomous Revenue Recovery Engine<br>
        Built for Razorpay Ecosystem &bull; Strict Tenant Isolation
      </td>
    </tr>

  </table>
</body>
</html>
```
