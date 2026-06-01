const { getLogicResponse } = require('./logic-engine');
const { sendFaultNotification } = require('./notify');

// Simple in-memory session store
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
        location: getValue('Location'),
        powerStatus: getValue('Power status'),
        failingTo: getValue('Failing to'),
        priority: getValue('Priority'),
        diagnostic: getValue('Other findings'),
        history: session.history
    };

    await sendFaultNotification(data, session.media);
    session.media = [];
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-fm-secret');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method === 'GET') return res.status(200).json({ status: 'FM Assist API Online', brain: 'Logic Engine (Zero Cost)' });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const secret = process.env.CHAT_WIDGET_SECRET || 'FM_ASSIST_SECRET';
    if (req.headers['x-fm-secret'] !== secret) return res.status(403).json({ error: 'Unauthorized' });

    const { sessionId, message } = req.body;
    if (!sessionId || !message) return res.status(400).json({ error: 'Missing' });

    const session = getSession(`web-${sessionId}`);

    try {
        const reply = await getLogicResponse(`web-${sessionId}`, message, session);
        session.history.push({ role: 'user', content: message });
        session.history.push({ role: 'assistant', content: reply });

        if (reply.includes('submitted successfully') || reply.includes('FM FAULT REPORT')) {
            try {
                await handleCompletedReport(session, `web-${sessionId}`, reply);
            } catch (notifyErr) {
                console.error('[Chat] Notification failed:', notifyErr);
            }
            session.history = [];
        }

        res.status(200).json({ reply });
    } catch (e) {
        console.error('[Chat] Error:', e);
        res.status(500).json({ error: e.message });
    }
};
