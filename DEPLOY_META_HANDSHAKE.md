# Meta Handshake: Linking WhatsApp to Vercel

Once your Vercel site is live at `https://www.southafricassoul.co.za`, follow these steps to finish the link.

### 1. Update the Webhook
1. Go to [Meta for Developers](https://developers.facebook.com/apps/).
2. Select your app and go to **WhatsApp > Configuration**.
3. Click **Edit** next to "Webhook".
4. **Callback URL:** `https://www.southafricassoul.co.za/api/webhook/whatsapp`
5. **Verify Token:** `FM_ASSIST_VERIFY_TOKEN`
6. Click **Verify and Save**.

### 2. Subscribe to Messages
1. On the same Configuration page, click **Manage** in the "Webhook fields" section.
2. Find the row for **messages**.
3. Click **Subscribe**.

### 3. Test the Bot
1. Open WhatsApp on your phone.
2. Send a message to the "Test number" shown on your Meta **API Setup** page.
3. The bot should reply immediately!
