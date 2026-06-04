const { getLogicResponse } = require('./logic-engine');
const { sendFaultNotification } = require('./notify');
const { createClient } = require('@supabase/supabase-js');

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Fallback in-memory store if Supabase is not configured
const memorySessions = {};

async function getSession(sessionId) {
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('chat_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (data) {
                return {
                    state: data.state_json.state,
                    data: data.state_json.data,
                    history: data.state_json.history || []
                };
            }
        } catch (e) {
            console.error('Error fetching session from Supabase:', e);
        }
    }

    if (!memorySessions[sessionId]) {
        memorySessions[sessionId] = {
            history: [],
            media: [],
            lastActive: Date.now(),
            state: null,
            data: {}
        };
    }
    return memorySessions[sessionId];
}

async function saveSession(sessionId, session) {
    if (supabase) {
        try {
            const sessionData = {
                session_id: sessionId,
                state_json: {
                    state: session.state,
                    data: session.data,
                    history: session.history
                },
                last_active: new Date().toISOString()
            };

            const { error } = await supabase
                .from('chat_sessions')
                .upsert(sessionData, { onConflict: 'session_id' });

            if (error) console.error('Error saving session to Supabase:', error);
        } catch (e) {
            console.error('Error in saveSession:', e);
        }
    }
}

async function handleCompletedReport(session, userId, reportText) {
    // The report text is already formatted in logic-engine.js
    // We can extract basic info for the notification
    const d = session.data;
    const p = d.priority || {};

    const data = {
        ticketId: d.ticketId || 'UNKNOWN',
        store: d.store || 'N/A',
        reporter: d.reporter || 'N/A',
        category: d.category || 'N/A',
        equipment: d.equipment || 'N/A',
        location: d.equipmentLocation || 'N/A',
        powerStatus: d.powerStatus || 'N/A',
        priority: p.label || 'Routine',
        brandModel: `${d.brand || 'N/A'} / ${d.model || 'N/A'}`,
        assetTag: d.assetTag || d.tag || 'N/A',
        serialNumber: d.serialNumber || 'N/A',
        history: session.history
    };

    await sendFaultNotification(data, session.media || []);
    if (session.media) session.media = [];
}

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
                await handleCompletedReport(session, fullSessionId, reply);
            } catch (notifyErr) {
                console.error('[Chat] Notification failed:', notifyErr);
            }
            // Clear data for next session but keep some history if desired
            // For now, let's keep it simple
        }

        res.status(200).json({ reply });
    } catch (e) {
        console.error('[Chat] Error:', e);
        res.status(500).json({ error: e.message });
    }
};
