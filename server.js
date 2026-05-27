require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const TelegramBot = require('node-telegram-bot-api');
const { SYSTEM_PROMPT, FAULT_FLOW } = require('./knowledge-base');
const { sendFaultNotification } = require('./notify');

const app = express();
app.use(cors());
app.use(express.json());

let anthropic;
if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const sessions = {};

function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = { history: [], data: {}, phaseIndex: 0, questionIndex: 0, media: [], isComplete: false };
    }
    return sessions[userId];
}

function getLocalFlowResponse(session, userMessage) {
    if (session.isComplete) return null;
    const phases = FAULT_FLOW.phases;
    if (session.phaseIndex === 0 && session.questionIndex === 0 && Object.keys(session.data).length === 0) {
        const text = userMessage ? userMessage.toLowerCase() : "";
        if (text.match(/hi|hello|start|hey|help/)) return phases[0].questions[0].text;
    }
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
        return "Report Captured. Thank you!";
    }
    return phases[session.phaseIndex].questions[session.questionIndex].text;
}

app.get('/', (req, res) => res.send("FM Assist Bot is Live"));

app.post('/api/chat', async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });
        const session = getSession(`web-${sessionId}`);
        const reply = getLocalFlowResponse(session, message) || "Flow complete.";
        res.json({ reply });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Minimal WhatsApp/Telegram placeholders to avoid crashes
app.get('/api/webhook/whatsapp', (req, res) => {
    if (req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) res.send(req.query['hub.challenge']);
    else res.sendStatus(403);
});
app.post('/api/webhook/whatsapp', (req, res) => res.sendStatus(200));

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server on ${PORT}`));
}
module.exports = app;
