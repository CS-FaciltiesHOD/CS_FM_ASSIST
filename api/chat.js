const { getLogicResponse } = require('./logic-engine');
const { getSession, saveSession, processCompletedReport } = require('./persistence');
const supabase = require('./supabase-client');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-fm-secret');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method === 'GET') return res.status(200).json({ status: 'FM Assist V2 API Online', supabase: !!supabase });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const secret = process.env.CHAT_WIDGET_SECRET || 'FM_ASSIST_SECRET';
    if (req.headers['x-fm-secret'] !== secret) return res.status(403).json({ error: 'Unauthorized' });

    const { sessionId, message } = req.body;
    if (!sessionId || !message) return res.status(400).json({ error: 'Missing sessionId or message' });

    const fullSessionId = `web-${sessionId}`;
    const session = await getSession(fullSessionId);

    try {
        const reply = await getLogicResponse(fullSessionId, message, session);

        if (!session.history) session.history = [];
        session.history.push({ role: 'user', content: message });
        session.history.push({ role: 'assistant', content: reply });

        await saveSession(fullSessionId, session);

        if (reply.includes('submitted successfully')) {
            try {
                await processCompletedReport(session, fullSessionId, reply);
                session.data = {}; // Clear session data after successful report
                session.media = [];
                await saveSession(fullSessionId, session, 'web');
            } catch (notifyErr) {
                console.error('[Chat] Notification failed:', notifyErr);
            }
        }

        res.status(200).json({ reply });
    } catch (e) {
        console.error('[Chat] Error:', e);
        res.status(500).json({ error: e.message });
    }
};
