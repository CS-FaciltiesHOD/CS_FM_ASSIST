# FM Assist Chatbot - Multi-Repo Deployment Guide

This repository contains the AI logic and API engine for the FM Assist Chatbot. It is designed to be hosted on Vercel and integrated into `www.southafricassoul.co.za`.

## 🛠️ Deployment Instructions

### 1. GitHub Setup (Account B)
- Push these files to your separate GitHub account dedicated to the chatbot.
- In Vercel, link this repository to the project named `southafricassoul`.

### 2. Vercel Environment Variables
Add the following keys to your Vercel Dashboard (Settings > Environment Variables):
- `ANTHROPIC_API_KEY`: Your key from console.anthropic.com
- `WHATSAPP_ACCESS_TOKEN`: From Meta Developer Dashboard
- `WHATSAPP_PHONE_NUMBER_ID`: `1117458988121543`
- `WHATSAPP_VERIFY_TOKEN`: `FM_ASSIST_VERIFY_TOKEN`
- `CHAT_WIDGET_SECRET`: Create a secret key for your website chat
- `EMAIL_USER` & `EMAIL_PASS`: Your Gmail/App Password for notifications

### 3. Meta Webhook Configuration
- **Callback URL:** `https://www.southafricassoul.co.za/api/webhook/whatsapp`
- **Verify Token:** `FM_ASSIST_VERIFY_TOKEN`
- **Fields:** Subscribe to `messages`.

## 🔒 Security & Privacy
The chatbot is hidden from public view. To show it on your website:
1. Add a hidden page (e.g., `/support`).
2. Embed the `embed.html` file or use the `/api/chat` endpoint with the correct `x-fm-secret` header.

## 📁 File Structure
- `server.js`: API Engine (WhatsApp, Telegram, Web)
- `knowledge-base.js`: AI Diagnostic Logic
- `notify.js`: Email Notification System
- `embed.html`: Web Chat Interface
- `vercel.json`: Vercel Deployment Config
