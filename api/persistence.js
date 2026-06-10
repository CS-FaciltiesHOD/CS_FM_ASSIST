const supabase = require('./supabase-client');
const { sendFaultNotification } = require('./notify');

async function getSession(sessionId, channel = 'web') {
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
                    media: data.state_json.media || []
                };
            }
        } catch (e) {
            console.error('Error fetching session from Supabase:', e);
        }
    }
    return {
        history: [],
        media: [],
        lastActive: Date.now(),
        state: null,
        data: {}
    };
}

async function saveSession(sessionId, session, channel = 'web') {
    if (supabase) {
        try {
            const sessionData = {
                session_id: sessionId,
                channel: channel,
                state_json: {
                    state: session.state,
                    data: session.data,
                    history: session.history,
                    media: session.media || []
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

async function processCompletedReport(session, sessionId, reportText) {
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
        history: session.history
    };

    // 1. Send Notification
    try {
        await sendFaultNotification(data, session.media || []);
    } catch (e) {
        console.error('[Persistence] Notification failed:', e);
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
            console.error('[Persistence] Database persistence failed:', dbErr);
        }
    }
}

module.exports = { getSession, saveSession, processCompletedReport };
