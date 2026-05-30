// api/chat.js
const { getLogicResponse } = require('./logic-engine.js');
const { sendFaultNotification } = require('./notify.js');

// Session store (cleared on Vercel spin-down)
const sessions = {};
function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = {
            history: [],
            data: {},
            state: null,
            media: [],
            lastActive: Date.now()
        };
    }
    sessions[userId].lastActive = Date.now();
    return sessions[userId];
}

async function handleCompletedReport(session, userId, reportText) {
    const lines = reportText.split('\n');
    const getValue = (label) => {
        const line = lines.find(l => l.toLowerCase().includes(label.toLowerCase()));
        if (!line) return 'N/A';
        const parts = line.split(':');
        if (parts.length < 2) return 'N/A';
        return parts.slice(1).join(':').trim();
    };

    const data = {
        ticketId: reportText.match(/#([A-Z0-9-]+)/)?.[1] || 'UNKNOWN',
        store: getValue('Store'),
        reporter: getValue('Reported by') !== 'N/A' ? getValue('Reported by') : getValue('Reporter'),
        category: getValue('Category'),
        equipment: getValue('Equipment'),
        brandModel: 'See Details',
        assetTag: 'See Details',
        serialNumber: 'See Details',
        location: getValue('Location'),
        powerStatus: getValue('Power status'),
        failingTo: getValue('Failing to'),
        failureMode: getValue('Failing to'),
        faultType: getValue('Category'),
        priority: getValue('Priority'),
        diagnostic: getValue('Other findings'),
        technicianNeeded: 'Yes',
        history: session.history
    };

    await sendFaultNotification(data, session.media);
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-fm-secret');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const secret = process.env.CHAT_WIDGET_SECRET || 'FM_ASSIST_SECRET';
    if (req.headers['x-fm-secret'] !== secret) return res.status(403).json({ error: 'Unauthorized' });

    const { sessionId, message } = req.body;
    if (!sessionId || !message) return res.status(400).json({ error: 'Missing sessionId or message' });

    // AI MODE TOGGLE (Rendered invalid for future activation as requested)
    const USE_AI_BRAIN = false;

    const session = getSession(`web-${sessionId}`);
    session.history.push({ role: 'user', content: message });

    try {
        let reply;

        if (USE_AI_BRAIN) {
            /*
               --- ANTHROPIC AI PATH (Preserved but currently disabled) ---
               const Anthropic = require('@anthropic-ai/sdk');
               const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
               const response = await anthropic.messages.create({
                   model: 'claude-3-5-sonnet-20240620',
                   max_tokens: 1024,
                   system: require('./knowledge-base.js').SYSTEM_PROMPT,
                   messages: session.history
               });
               reply = response.content[0].text;
            */
            reply = "The AI Brain is currently deactivated. Please use the Logic Engine.";
        } else {
            reply = await getLogicResponse(`web-${sessionId}`, message, session);
        }

        session.history.push({ role: 'assistant', content: reply });

        if (reply.includes('submitted successfully')) {
            await handleCompletedReport(session, `web-${sessionId}`, reply);
            session.history = [];
        }

        res.status(200).json({ reply });
    } catch (e) {
        console.error("[Backend] Error:", e);
        res.status(500).json({ error: e.message });
    }
};
