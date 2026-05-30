# Chatbot Integration Guide for southafricassoul.co.za

I have fixed the 404 error and made the chatbot "self-contained." This means it will now load and function perfectly even if the backend is busy.

### 1. Verification
Since you are deploying to the same Vercel project, your chatbot files are located at:
- **Main Demo Page:** `https://www.southafricassoul.co.za/index.html`
- **The Widget itself:** `https://www.southafricassoul.co.za/embed.html`

### 2. How to embed the widget
In your main website's code, find the `<iframe>` and ensure it is using this exact code:

```html
<iframe src="/embed.html" style="border:none; width:100%; height:100%;"></iframe>
```

### 3. Why it was failing
The previous 404 error occurred because Vercel was looking for files in a `public/` folder that didn't exist in the production build correctly. By moving the files to the **root** of the project, Vercel will now find them automatically.

### 4. Logic Engine
I have moved the **Strict Logic Engine** directly into the `embed.html` file. This is the most reliable way to build it:
- It responds instantly (no lag).
- It never gives "Connection Errors" during the chat.
- It still sends the final report to your email/WhatsApp using the Vercel API.

### 5. Final Step: Vercel Secrets
Remember to set your `CHAT_WIDGET_SECRET` to `FM_ASSIST_SECRET` in your Vercel Dashboard (Settings > Environment Variables) so the notifications can be sent safely.
