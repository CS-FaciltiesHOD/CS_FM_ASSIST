require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const TelegramBot = require('node-telegram-bot-api');
const nodemailer = require('nodemailer');

const FAULT_FLOW = {
    phases: [
        {
            name: "IDENTIFICATION",
            questions: [
                { id: "Q1", text: "Please provide the store or branch name you are reporting from.", key: "store" },
                { id: "Q2", text: "What is your full name?", key: "reporter" },
                { id: "Q3", text: "Please select the equipment category:\n1. Refrigeration\n2. Electrical\n3. Plumbing\n4. HVAC\n5. Other", key: "category" },
                { id: "Q4", text: "Where exactly is the unit located?", key: "location" },
                { id: "Q5", text: "Please provide equipment details (Brand/Asset Tag).", key: "equipment_details" }
            ]
        },
        {
            name: "POWER_CHECK",
            questions: [
                { id: "Q6", text: "Is there power to the unit? Options: Yes / No", key: "power_status" }
            ]
        },
        {
            name: "FAULT_DETAILS",
            questions: [
                { id: "Q9", text: "What is the equipment failing to do?", key: "failure_mode" },
                { id: "Q-PRIORITY", text: "How urgent is this fault? (1. Emergency, 2. Urgent, 3. High, 4. Routine)", key: "priority" }
            ]
        }
    ]
};

const MASTER_EMAIL = 'facilitieshod@gmail.com';

async function sendEmail(reportData) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    try {
        await transporter.sendMail({
            from: '"FM Assist Bot" <' + process.env.EMAIL_USER + '>',
            to: MASTER_EMAIL,
            subject: "[FAULT REPORT] " + reportData.store + " | #" + reportData.ticketId,
            text: JSON.stringify(reportData, null, 2)
        });
    } catch (e) { console.error("Email error", e); }
}

const app = express();
app.use(cors());
app.use(express.json());

const sessions = {};
function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = { history: [], data: {}, phaseIndex: 0, questionIndex: 0, isComplete: false };
    }
    return sessions[userId];
}

function getLocalFlowResponse(session, userMessage) {
    if (session.isComplete) return "Report already submitted.";
    const phases = FAULT_FLOW.phases;
    if (session.phaseIndex === 0 && session.questionIndex === 0 && Object.keys(session.data).length === 0) {
        if (!userMessage || !userMessage.toLowerCase().match(/hi|hello|start|hey/)) {
            // Initial prompt if no greeting
        } else {
            return phases[0].questions[0].text;
        }
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
        const ticketId = 'FM-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        session.data.ticketId = ticketId;
        sendEmail(session.data);
        return "━━━ FM FAULT REPORT #" + ticketId + " ━━━\n✅ Logged. Tech notified.";
    }
    return phases[session.phaseIndex].questions[session.questionIndex].text;
}

app.get('/', (req, res) => res.send("FM Assist Bot Active"));
app.post('/api/chat', async (req, res) => {
    const { sessionId, message } = req.body;
    const session = getSession(sessionId);
    const reply = getLocalFlowResponse(session, message) || "Hello! Type START to log a fault.";
    res.json({ reply });
});

// WhatsApp Handshake
app.get('/api/webhook/whatsapp', (req, res) => {
    if (req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) res.send(req.query['hub.challenge']);
    else res.sendStatus(403);
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') app.listen(PORT);
module.exports = app;
