const axios = require('axios');
const { getLogicResponse } = require('../logic-engine');
const { sendFaultNotification } = require('../notify');
const { createClient } = require('@supabase/supabase-js');

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

if (!supabase) {
    console.warn('WARNING: Supabase credentials missing in WhatsApp Webhook. Falling back to in-memory (limited).');
}

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
                    history: data.state_json.history || [],
                    media: [] // Media is usually transient for the session
                };
            }
        } catch (e) {
            console.error('Error fetching session from Supabase:', e);
        }
    }
    return { history: [], media: [], lastActive: Date.now(), state: null, data: {} };
}

async function saveSession(sessionId, session) {
    if (supabase) {
        try {
            const sessionData = {
                session_id: sessionId,
                channel: 'whatsapp',
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

async function downloadWhatsAppMedia(mediaId) {
    try {
        const response = await axios.get(`https://graph.facebook.com/v21.0/${mediaId}`, {
            headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
        });
        const mediaUrl = response.data.url;
        const mimeType = response.data.mime_type;
        const extension = mimeType.split('/')[1] || 'bin';
        const mediaFile = await axios.get(mediaUrl, {
            headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
            responseType: 'arraybuffer'
        });
        return { buffer: Buffer.from(mediaFile.data), mime_type: mimeType, filename: `media_${mediaId}.${extension}` };
    } catch (e) { console.error('Media download error:', e.message); return null; }
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
        assetTag: d.assetTag || 'N/A',
        serialNumber: d.serialNumber || 'N/A',
        temperature: d.diagnosticResults?.C_TEMP || d.diagnosticResults?.F_TEMP || 'N/A',
        failureMode: d.selectedSymptom || 'N/A',
        faultType: d.likelyCause || 'N/A',
        technicianNeeded: d.emergencyDetected ? 'YES (Emergency)' : 'TBC (Technician Required)',
        history: session.history
    };

    // 1. Send Notification
    try {
        await sendFaultNotification(data, session.media || []);
    } catch (e) {
        console.error('[WhatsApp] Notification failed:', e);
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
                photo_attached: !!(session.media && session.media.length > 0)
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
            console.error('[WhatsApp] Database persistence failed:', dbErr);
        }
    }
    session.media = [];
}

function formatWhatsAppPayload(to, text) {
    if (text.includes('Options: Yes / No')) {
        const bodyText = text.replace(/Options:\s*Yes\s*\/\s*No/gi, '').trim();
        return {
            messaging_product: 'whatsapp', to, type: 'interactive',
            interactive: {
                type: 'button', body: { text: bodyText || "Select:" },
                action: { buttons: [{ type: 'reply', reply: { id: 'yes', title: 'Yes' } }, { type: 'reply', reply: { id: 'no', title: 'No' } }] }
            }
        };
    }
    const lines = text.split('\n');
    const listItems = lines.filter(l => /^\d+\.\s+.+/.test(l.trim()));
    if (listItems.length >= 2 && listItems.length <= 10) {
        const bodyText = lines.filter(l => !/^\d+\.\s+.+/.test(l.trim())).join('\n').trim();
        const rows = listItems.map((item, index) => ({ id: `opt_${index + 1}`, title: item.replace(/^\d+\.\s+/, '').substring(0, 24) }));
        return {
            messaging_product: 'whatsapp', to, type: 'interactive',
            interactive: {
                type: 'list', header: { type: 'text', text: 'Select Option' },
                body: { text: bodyText || "Please choose:" },
                action: { button: 'Options', sections: [{ title: 'Available', rows }] }
            }
        };
    }
    return { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
}

module.exports = async (req, res) => {
    if (req.method === "GET") {
        if (req.query["hub.verify_token"] === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(req.query["hub.challenge"]);
        return res.status(403).end();
    }
    if (req.method !== 'POST') return res.status(405).end();
    try {
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];
        if (!message) return res.status(200).end();
        const from = message.from;
        const session = await getSession(from);
        let userText = "";
        if (message.type === 'text') userText = message.text.body;
        else if (message.type === 'interactive') userText = message.interactive.button_reply?.title || message.interactive.list_reply?.title;
        else if (message.type === 'image' || message.type === 'video') {
            const mediaId = message.image?.id || message.video?.id;
            const mediaData = await downloadWhatsAppMedia(mediaId);
            if (mediaData) {
                if (!session.media) session.media = [];
                session.media.push(mediaData);
                userText = "[Sent " + message.type + "]";
            }
        }
        if (userText) {
            if (!session.history) session.history = [];
            session.history.push({ role: 'user', content: userText });
            const reply = await getLogicResponse(from, userText, session);
            session.history.push({ role: 'assistant', content: reply });

            await saveSession(from, session);

            await axios.post(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, formatWhatsAppPayload(from, reply), {
                headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
            });
            if (reply.includes('submitted successfully')) {
                await handleCompletedReport(session, from, reply);
                session.history = [];
                await saveSession(from, session);
            }
        }
    } catch (e) { console.error('WA Error:', e.response?.data || e.message); }
    res.status(200).end();
};
