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

const sessions = {};

function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = {
            history: [],
            media: [],
            lastActive: Date.now()
        };
    }
    sessions[userId].lastActive = Date.now();
    return sessions[userId];
}

async function getAIResponse(userId, userMessage) {
    const session = getSession(userId);
    session.history.push({ role: 'user', content: userMessage });

    if (!anthropic) {
        return "I'm currently in 'offline mode' because my API key is not configured. Please contact the administrator.";
    }

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: session.history,
        });

        const aiReply = response.content[0].text;
        session.history.push({ role: 'assistant', content: aiReply });

        if (aiReply.includes('━━━ FM FAULT REPORT #')) {
            handleCompletedReport(userId, aiReply);
        }

        return aiReply;
    } catch (error) {
        console.error('Claude AI Error:', error);
        return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.";
    }
}

async function handleCompletedReport(userId, reportText) {
    const session = getSession(userId);
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
        history: session.history,
        technicianNeeded: reportText.includes('Technician needed:  Yes') ? 'Yes' : 'No'
    };
    
    await sendFaultNotification(data, session.media);
    
    // Clear session media after submission
    session.media = [];
}

/**
 * Downloads a media file from Meta's servers.
 */
async function downloadWhatsAppMedia(mediaId) {
    try {
        const response = await axios.get(`https://graph.facebook.com/v17.0/${mediaId}`, {
            headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
        });
        
        const mediaUrl = response.data.url;
        const mimeType = response.data.mime_type;
        const extension = mimeType.split('/')[1] || 'bin';
        const filename = `media_${mediaId}.${extension}`;

        const mediaFile = await axios.get(mediaUrl, {
            headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
            responseType: 'arraybuffer'
        });

        return {
            buffer: Buffer.from(mediaFile.data),
            mime_type: mimeType,
            filename: filename
        };
    } catch (error) {
        console.error('Error downloading WhatsApp media:', error.message);
        return null;
    }
}

// ==========================================
// WHATSAPP CLOUD API (META)
// ==========================================

app.get('/api/webhook/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

function formatWhatsAppMessage(to, text) {
    if (text.toLowerCase().includes('options: yes / no')) {
        const bodyText = text.replace(/options:\s*yes\s*\/\s*no/gi, '').trim();
        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text: bodyText || "Please select an option:" },
                action: {
                    buttons: [
                        { type: 'reply', reply: { id: 'yes', title: 'Yes' } },
                        { type: 'reply', reply: { id: 'no', title: 'No' } }
                    ]
                }
            }
        };
    }

    const lines = text.split('\n');
    const listItems = lines.filter(l => /^\d+[\.\)]\s+.+/.test(l.trim()));

    if (listItems.length >= 2 && listItems.length <= 10) {
        const bodyText = lines.filter(l => !/^\d+[\.\)]\s+.+/.test(l.trim())).join('\n').trim();
        const rows = listItems.map((item, index) => {
            const cleanTitle = item.replace(/^\d+[\.\)]\s+/, '').trim().substring(0, 24);
            return {
                id: `option_${index + 1}`,
                title: cleanTitle,
                description: item.length > 24 ? item.substring(0, 72) : ""
            };
        });

        return {
            messaging_product: 'whatsapp',
            to,
            type: 'interactive',
            interactive: {
                type: 'list',
                header: { type: 'text', text: 'Selection Required' },
                body: { text: bodyText || "Please choose from the list below:" },
                footer: { text: "FM Assist Diagnostic" },
                action: {
                    button: 'View Options',
                    sections: [{ title: 'Available Options', rows }]
                }
            }
        };
    }

    return {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text }
    };
}

app.post('/api/webhook/whatsapp', async (req, res) => {
    try {
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (!message) return res.sendStatus(200);

        const from = message.from;
        const session = getSession(`wa-${from}`);
        let userText = "";

        if (message.type === 'text') {
            userText = message.text.body;
        } else if (message.type === 'interactive') {
            const interactive = message.interactive;
            if (interactive.type === 'button_reply') {
                userText = interactive.button_reply.title;
            } else if (interactive.type === 'list_reply') {
                userText = interactive.list_reply.title;
            }
        } else if (message.type === 'image' || message.type === 'video') {
            const mediaId = message.image?.id || message.video?.id;
            const mediaData = await downloadWhatsAppMedia(mediaId);
            if (mediaData) {
                session.media.push(mediaData);
                userText = "[User sent a " + message.type + "]";
            }
        }

        if (userText) {
            const aiReply = await getAIResponse(`wa-${from}`, userText);
            const whatsappPayload = formatWhatsAppMessage(from, aiReply);

            await axios.post(
                `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
                whatsappPayload,
                {
                    headers: { 
                        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
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
    } else {
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
    if (req.headers['x-fm-secret'] !== process.env.CHAT_WIDGET_SECRET) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { sessionId, message } = req.body;
    if (!sessionId || !message) return res.status(400).json({ error: 'Missing sessionId or message' });
    const aiReply = await getAIResponse(`web-${sessionId}`, message);
    res.json({ reply: aiReply });
});

app.use(express.static('.'));

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`FM Assist Server running on port ${PORT}`);
    });
}

module.exports = app;
