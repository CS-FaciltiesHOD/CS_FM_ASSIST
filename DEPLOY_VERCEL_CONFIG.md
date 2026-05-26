# Vercel Configuration & Secrets Guide

After you have imported the repository into Vercel, you must set up the "Environment Variables" (Secrets) so the bot can "talk" to Claude and WhatsApp.

### 1. Add Environment Variables
1. Go to your project in the **Vercel Dashboard**.
2. Click **Settings > Environment Variables**.
3. Add the following (Copy these from your Meta Dashboard and Anthropic account):

| Variable Name | Description |
| :--- | :--- |
| `ANTHROPIC_API_KEY` | Your key from console.anthropic.com |
| `WHATSAPP_ACCESS_TOKEN` | Permanent token from Meta Business Settings |
| `WHATSAPP_PHONE_NUMBER_ID` | `1117458988121543` (from your screenshot) |
| `WHATSAPP_VERIFY_TOKEN` | `FM_ASSIST_VERIFY_TOKEN` |
| `CHAT_WIDGET_SECRET` | Create a random password (e.g. `secret123`) |
| `EMAIL_USER` | Your Gmail address |
| `EMAIL_PASS` | Your Gmail "App Password" |

### 2. Set up the Custom Domain
1. Go to **Settings > Domains**.
2. Click **Add**.
3. Type `api.southafricassoul.co.za`.
4. Vercel will give you a "CNAME" record. Copy this and add it to your domain's DNS settings (where you bought your domain).

**Your new API address will be:**
`https://api.southafricassoul.co.za`
