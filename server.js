require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const TelegramBot = require('node-telegram-bot-api');

const FAULT_FLOW = {
    phases: [
        {
            name: "IDENTIFICATION",
            questions: [
                { id: "Q1", text: "Please provide the store or branch name you are reporting from.", key: "store" },
                { id: "Q2", text: "What is your full name?", key: "reporter" },
                { id: "Q3", text: "Please select the equipment category:\n1. Refrigeration — Upright fridge\n2. Refrigeration — Cold room\n3. Refrigeration — Freezer room\n4. Refrigeration — Island freezer\n5. Refrigeration — Serve over (cold display)\n6. Electrical\n7. Plumbing\n8. HVAC / Aircon\n9. Other", key: "category" },
                { id: "Q4", text: "Where exactly is the unit located? (e.g. Aisle 3, Dairy section, Bakery, Loading bay)", key: "location" },
                { id: "Q5", text: "Please provide the equipment details (Name, Brand, Model, Asset Tag, Serial). Type 'unknown' for anything missing.", key: "equipment_details" }
            ]
        },
        {
            name: "POWER_CHECK",
            questions: [
                { id: "Q6", text: "Is there power to the unit? (Check display/lights)\nOptions: Yes / No", key: "power_status" }
            ]
        },
        {
            name: "FAULT_DETAILS",
            questions: [
                { id: "Q9", text: "What is the equipment failing to do? (e.g., Not cooling, Leaking, Unusual noise, Won't start)", key: "failure_mode" },
                { id: "Q-PRIORITY", text: "How urgent is this fault?\n1. Emergency (1h)\n2. Urgent (4h)\n3. High (24h)\n4. Routine", key: "priority" }
            ]
        }
    ]
};

const SYSTEM_PROMPT = "FM Assist Bot Logic";

const app = express();
app.use(cors());
app.use(express.json());

const sessions = {};

function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = { history: [], data: {}, phaseIndex: 0, questionIndex: 0, media: [], isComplete: false };
    }
    return sessions[userId];
}

function getLocalFlowResponse(session, userMessage) {
    if (session.isComplete) return "Report already submitted.";
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
        return "Thank you. Your fault report has been captured.";
    }
    return phases[session.phaseIndex].questions[session.questionIndex].text;
}

app.get('/', (req, res) => res.send("FM Assist Bot is Live (All-in-one)"));

app.post('/api/chat', async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });
        const session = getSession(`web-${sessionId}`);
        const reply = getLocalFlowResponse(session, message) || "Hello! I am FM Assist. Type START to begin logging a fault.";
        res.json({ reply });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server on ${PORT}`));
}
module.exports = app;
