// api/chat.js
const { getLogicResponse } = require('./logic-engine.js');
const { sendFaultNotification } = require('./notify.js');

// Simple in-memory session store (Note: cleared on Vercel spin-down,
// for production integration with a main site, a DB like Upstash/Redis is better,
// but for a deterministic flow it usually survives the session length).
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
        brandModel: 'See Details', // Logic engine combines these
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
    session.media = [];
}

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-fm-secret');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const secret = process.env.CHAT_WIDGET_SECRET || 'FM_ASSIST_SECRET';
    if (req.headers['x-fm-secret'] !== secret) return res.status(403).json({ error: 'Unauthorized' });

    const { sessionId, message } = req.body;
    if (!sessionId || !message) return res.status(400).json({ error: 'Missing' });

    // AI MODE TOGGLE (Set to true to use Anthropic instead of Logic Engine)
    const USE_AI_BRAIN = false;

    const session = getSession(`web-${sessionId}`);
    session.history.push({ role: 'user', content: message });

    try {
        console.log(`[Chat] Message from ${sessionId}: ${message}`);
        let reply;

        if (USE_AI_BRAIN) {
            reply = "AI Brain is currently disabled. Please use the Logic Engine.";
        } else {
            reply = await getLogicResponse(`web-${sessionId}`, message, session);
        }

        session.history.push({ role: 'assistant', content: reply });

        // Only send the notification when the report is actually SUBMITTED (Success message)
        if (reply.includes('submitted successfully')) {
            console.log(`[Chat] Report submitted for ${sessionId}. Sending notifications...`);
            try {
                await handleCompletedReport(session, `web-${sessionId}`, reply);
            } catch (notifyErr) {
                console.error('[Chat] Notification failed:', notifyErr);
                // We don't crash the response if notification fails,
                // but the log will show it.
            }
            session.history = [];
        }

        res.status(200).json({ reply });
    } catch (e) {
        console.error('[Chat] Error:', e);
        res.status(500).json({ error: e.message });
    }
};
