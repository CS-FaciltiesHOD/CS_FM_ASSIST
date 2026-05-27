// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const TelegramBot = require('node-telegram-bot-api');
const { SYSTEM_PROMPT, FAULT_FLOW } = require('./knowledge-base');
const { sendFaultNotification } = require('./notify');

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-fm-secret']
}));
app.use(express.json());

let anthropic;
if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });
}

const sessions = {};

function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = {
            history: [],
            data: {},
            phaseIndex: 0,
            questionIndex: 0,
            media: [],
            isComplete: false,
            lastActive: Date.now()
        };
    }
    sessions[userId].lastActive = Date.now();
    return sessions[userId];
}

function getLocalFlowResponse(session, userMessage) {
    if (session.isComplete) return null;

    const phases = FAULT_FLOW.phases;
    
    // Initial greeting
    if (session.phaseIndex === 0 && session.questionIndex === 0 && Object.keys(session.data).length === 0) {
        const text = userMessage ? userMessage.toLowerCase() : "";
        if (text.match(/hi|hello|start|hey|help/)) {
            return phases[0].questions[0].text;
        }
    }

    // Save answer and move forward
    const currentPhase = phases[session.phaseIndex];
    const currentQuestion = currentPhase.questions[session.questionIndex];
    
    if (userMessage) {
        session.data[currentQuestion.key] = userMessage;
        session.questionIndex++;
    }

    if (session.questionIndex >= currentPhase.questions.length) {
        session.phaseIndex++;
        session.questionIndex = 0;
    }

    if (session.phaseIndex >= phases.length) {
        session.isComplete = true;
        const report = generateReport(session.data);
        handleCompletedReport(session, report);
        return report + "\n\n✅ Your report has been logged and the technician has been notified.";
    }

    return phases[session.phaseIndex].questions[session.questionIndex].text;
}

function generateReport(data) {
    const ticketId = 'FM-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    return `━━━ FM FAULT REPORT #${ticketId} ━━━
📍 Store: ${data.store || 'Unknown'}
👤 Reporter: ${data.reporter || 'Unknown'}
🔧 Category: ${data.category || 'Unknown'}
📍 Location: ${data.location || 'Unknown'}
📦 Equipment: ${data.equipment_details || 'Unknown'}
⚡ Power Status: ${data.power_status || 'Unknown'}
⚠️ Fault: ${data.failure_mode || 'Unknown'}
🔴 Priority: ${data.priority || 'Unknown'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

async function handleCompletedReport(session, reportText) {
    try {
        const data = {
            ticketId: reportText.match(/#([A-Z0-9-]+)/)?.[1] || 'UNKNOWN',
            store: session.data.store,
            reporter: session.data.reporter,
            category: session.data.category,
            location: session.data.location,
            equipment: session.data.equipment_details,
            powerStatus: session.data.power_status,
            failureMode: session.data.failure_mode,
            priority: session.data.priority,
            history: session.history,
            technicianNeeded: 'Yes'
        };
        await sendFaultNotification(data, session.media);
    } catch (e) { console.error("Notification Error:", e); }
}

async function getAIResponse(userId, userMessage) {
    const session = getSession(userId);
    
    const flowReply = getLocalFlowResponse(session, userMessage);
    if (flowReply) {
        session.history.push({ role: 'assistant', content: flowReply });
        return flowReply;
    }

    if (!anthropic) return "Report complete. Thank you.";

    try {
        session.history.push({ role: 'user', content: userMessage });
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: session.history.filter(m => m.role !== 'system'),
        });
        const aiReply = response.content[0].text;
        session.history.push({ role: 'assistant', content: aiReply });
        return aiReply;
    } catch (error) {
        return "I encountered an error, but your report progress is saved. Please continue providing details.";
    }
}

// ==========================================
// ROUTES
// ==========================================

app.get('/api/webhook/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

app.post('/api/webhook/whatsapp', async (req, res) => {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (message) {
        const from = message.from;
        const text = message.text?.body || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title;
        if (text) {
            const reply = await getAIResponse(`wa-${from}`, text);
            await axios.post(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                messaging_product: 'whatsapp', to: from, type: 'text', text: { body: reply }
            }, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } }).catch(e => console.error("WA Send Error", e.message));
        }
    }
    res.sendStatus(200);
});

// Disable polling in production for Vercel
if (process.env.TELEGRAM_BOT_TOKEN && process.env.NODE_ENV !== 'production') {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    bot.on('message', async (msg) => {
        if (msg.text) {
            const reply = await getAIResponse(`tg-${msg.chat.id}`, msg.text);
            bot.sendMessage(msg.chat.id, reply);
        }
    });
}

app.post('/api/chat', async (req, res) => {
    if (req.headers['x-fm-secret'] !== process.env.CHAT_WIDGET_SECRET) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { sessionId, message } = req.body;
    const reply = await getAIResponse(`web-${sessionId}`, message);
    res.json({ reply });
});

// Export for Vercel, but also listen for local dev
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Local server on ${PORT}`));
}

module.exports = app;
