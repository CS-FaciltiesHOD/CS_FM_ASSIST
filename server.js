// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const TelegramBot = require('node-telegram-bot-api');
const { SYSTEM_PROMPT } = require('./knowledge-base');
const { sendFaultNotification } = require('./notify');

const app = express();
app.use(cors({
    origin: ['https://www.southafricassoul.co.za', 'https://southafricassoul.co.za'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-fm-secret']
}));
app.use(express.json());

let anthropic;
if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });
} else {
    console.warn('WARNING: ANTHROPIC_API_KEY is missing. AI features will be disabled.');
}

// Simple in-memory session storage
// In production, use Redis
const sessions = {};

/**
 * Gets or creates a session for a user.
 */
function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = {
            history: [],
            lastActive: Date.now()
        };
    }
    sessions[userId].lastActive = Date.now();
    return sessions[userId];
}

/**
 * Handles communication with Claude AI.
 */
async function getAIResponse(userId, userMessage) {
    const session = getSession(userId);
    
    // Add user message to history
    session.history.push({ role: 'user', content: userMessage });

    if (!anthropic) {
        return "I'm currently in 'offline mode' because my API key is not configured. Please contact the administrator.";
    }

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-latest',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: session.history,
        });

        const aiReply = response.content[0].text;
        
        // Add AI reply to history
        session.history.push({ role: 'assistant', content: aiReply });

        // Check if a report was completed (simple heuristic)
        if (aiReply.includes('━━━ FM FAULT REPORT #')) {
            handleCompletedReport(userId, aiReply);
        }

        return aiReply;
    } catch (error) {
        console.error('Claude AI Error:', error);
        return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.";
    }
}

/**
 * Parses the AI's report and triggers notifications.
 */
function handleCompletedReport(userId, reportText) {
    // Basic parsing logic to extract fields from the text report
    // A more robust version would use Regex or ask Claude for JSON
    const lines = reportText.split('\n');
    const data = {
        ticketId: reportText.match(/#([A-Z0-9-]+)/)?.[1] || 'UNKNOWN',
        store: lines.find(l => l.includes('Store'))?.split(':')[1]?.trim(),
        reporter: lines.find(l => l.includes('Reported by'))?.split(':')[1]?.trim(),
        category: lines.find(l => l.includes('Category'))?.split(':')[1]?.trim(),
        equipment: lines.find(l => l.includes('Equipment'))?.split(':')[1]?.trim(),
        brandModel: lines.find(l => l.includes('Brand'))?.split(':')[1]?.trim(),
        assetTag: lines.find(l => l.includes('Asset tag'))?.split(':')[1]?.trim(),
        serialNumber: lines.find(l => l.includes('Serial number'))?.split(':')[1]?.trim(),
        location: lines.find(l => l.includes('Location'))?.split(':')[1]?.trim(),
        powerStatus: lines.find(l => l.includes('Power status'))?.split(':')[1]?.trim(),
        temperature: lines.find(l => l.includes('Temperature'))?.split(':')[1]?.trim(),
        failureMode: lines.find(l => l.includes('Failing to'))?.split(':')[1]?.trim(),
        priority: lines.find(l => l.includes('Priority'))?.split(':')[1]?.trim(),
        faultType: lines.find(l => l.includes('Fault type'))?.split(':')[1]?.trim(),
    };

    // Trigger email/SLA notification
    sendFaultNotification(data);
}

// ==========================================
// WHATSAPP CLOUD API (META)
// ==========================================

// Verification endpoint for Meta
app.get('/api/webhook/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
            console.log('WhatsApp Webhook Verified');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Message handling endpoint
app.post('/api/webhook/whatsapp', async (req, res) => {
    try {
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message && message.type === 'text') {
            const from = message.from; // User's phone number
            const text = message.text.body;

            const aiReply = await getAIResponse(`wa-${from}`, text);

            // Send reply back via WhatsApp Cloud API
            await axios.post(
                `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: from,
                    text: { body: aiReply },
                },
                {
                    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
                }
            );
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('WhatsApp Webhook Error:', error.response?.data || error.message);
        res.sendStatus(500);
    }
});

// ==========================================
// TELEGRAM BOT API
// ==========================================
if (process.env.TELEGRAM_BOT_TOKEN) {
    // Only use polling if NOT on Vercel
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
        const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
        bot.on('message', async (msg) => {
            if (msg.text) {
                const chatId = msg.chat.id;
                const aiReply = await getAIResponse(`tg-${chatId}`, msg.text);
                bot.sendMessage(chatId, aiReply);
            }
        });
        console.log('Telegram Bot Active (Polling)');
    } else {
        // Vercel Webhook endpoint for Telegram
        app.post('/api/webhook/telegram', async (req, res) => {
            const { message } = req.body;
            if (message && message.text) {
                const chatId = message.chat.id;
                const aiReply = await getAIResponse(`tg-${chatId}`, message.text);
                const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
                await bot.sendMessage(chatId, aiReply);
            }
            res.sendStatus(200);
        });
    }
}

// ==========================================
// WEBSITE CHAT API
// ==========================================
app.post('/api/chat', async (req, res) => {
    // Simple protection: Check for a secret header
    if (req.headers['x-fm-secret'] !== process.env.CHAT_WIDGET_SECRET) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { sessionId, message } = req.body;
    if (!sessionId || !message) return res.status(400).json({ error: 'Missing sessionId or message' });

    const aiReply = await getAIResponse(`web-${sessionId}`, message);
    res.json({ reply: aiReply });
});

// Serve static files (for embed.html testing)
app.use(express.static('.'));

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`FM Assist Server running on port ${PORT}`);
    });
}

module.exports = app;
