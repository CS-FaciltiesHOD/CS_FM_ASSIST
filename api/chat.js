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
    const d = session.data;
    const p = d.priority || {};
    const ticketId = d.ticketId || `FM-${Date.now().toString(36).toUpperCase()}`;

    const data = {
        ticketId,
        store: d.store || 'N/A',
        reporter: d.reporter || 'N/A',
        category: d.category || 'N/A',
        equipment: d.equipment || 'N/A',
        location: d.equipmentLocation || 'N/A',
        powerStatus: d.powerStatus || 'N/A',
        priority: p.label || 'Routine',
        brandModel: `${d.brand || 'N/A'} / ${d.model || 'N/A'}`,
        assetTag: d.assetTag || d.assetTag || 'N/A',
        serialNumber: d.serialNumber || 'N/A',
        history: session.history
    };

    // 1. Send Notification
    try {
        await sendFaultNotification(data, session.media || []);
    } catch (e) {
        console.error('[Chat] Notification failed:', e);
    }

    // 2. Database Persistence
    if (supabase) {
        try {
            // Insert Ticket
            const { error: tErr } = await supabase.from('tickets').insert([{
                ticket_id: ticketId,
                store: d.store,
                reporter: d.reporter,
                category: d.category,
                equipment: d.equipment,
                location: d.equipmentLocation,
                brand: d.brand,
                model: d.model,
                asset_tag: d.assetTag,
                serial_number: d.serialNumber,
                criticality: d.equipmentProfile?.criticality,
                power_status: d.powerStatus,
                fault_type: d.selectedSymptom,
                safety_risk: d.safetyRisk,
                emergency_type: d.emergencyType || 'None',
                operational_impact: d.operationalImpact,
                priority: p.label,
                priority_level: p.level,
                sla: p.sla,
                service_provider: d.equipmentProfile?.provider || 'FM Manager',
                photo_attached: !!d.photoAttached
            }]);
            if (tErr) throw tErr;

            // Insert Findings
            if (d.diagnosticResults) {
                const findings = Object.entries(d.diagnosticResults).map(([key, val]) => ({
                    ticket_id: ticketId,
                    finding_key: key,
                    finding_value: String(val)
                }));
                await supabase.from('ticket_findings').insert(findings);
            }

            // Insert Food Safety
            if (d.foodSafetyResults) {
                await supabase.from('ticket_food_safety').insert([{
                    ticket_id: ticketId,
                    cold_chain_compromised: d.foodSafetyResults.FS_COLDCHAIN === 'Yes',
                    product_above_temp: d.foodSafetyResults.FS_PRODTEMP === 'Yes',
                    contamination_risk: d.foodSafetyResults.FS_CONTAM === 'Yes',
                    production_stopped: d.foodSafetyResults.FS_PRODUCTION === 'Yes',
                    stock_at_risk: d.foodSafetyResults.FS_STOCK === 'Yes'
                }]);
            }

        } catch (dbErr) {
            console.error('[Chat] Database persistence failed:', dbErr);
        }
    }

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
