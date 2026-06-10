const axios = require('axios');
const { getLogicResponse } = require('../logic-engine');
const { getSession, saveSession, processCompletedReport } = require('../persistence');

const API_VERSION = 'v21.0';

async function downloadWhatsAppMedia(mediaId) {
    try {
        const response = await axios.get(`https://graph.facebook.com/${API_VERSION}/${mediaId}`, {
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
    } catch (e) { console.error('Media download error:', e.response?.data || e.message); return null; }
}

function formatWhatsAppPayload(to, text) {
    // 1. Check for simple Yes/No buttons
    if (text.includes('1. Yes') && text.includes('2. No')) {
        const bodyText = text.split('\n1. Yes')[0].trim();
        const buttons = [
            { type: 'reply', reply: { id: 'yes', title: 'Yes' } },
            { type: 'reply', reply: { id: 'no', title: 'No' } }
        ];
        // Note: Check for 'Unknown' if applicable
        if (text.includes('3. Unknown')) {
            buttons.push({ type: 'reply', reply: { id: 'unknown', title: 'Unknown' } });
        }

        return {
            messaging_product: 'whatsapp', to, type: 'interactive',
            interactive: {
                type: 'button', body: { text: bodyText || "Select:" },
                action: { buttons }
            }
        };
    }

    // 2. Check for List/Menu (2 to 10 options)
    const lines = text.split('\n');
    const listItems = lines.filter(l => /^\d+\.\s+.+/.test(l.trim()));
    if (listItems.length >= 2 && listItems.length <= 10) {
        const bodyText = lines.filter(l => !/^\d+\.\s+.+/.test(l.trim())).join('\n').trim();
        const rows = listItems.map((item, index) => {
            const label = item.replace(/^\d+\.\s+/, '').trim();
            return {
                id: `opt_${index + 1}`,
                title: label.length > 24 ? label.substring(0, 21) + '...' : label
            };
        });
        return {
            messaging_product: 'whatsapp', to, type: 'interactive',
            interactive: {
                type: 'list', header: { type: 'text', text: 'FM Assist' },
                body: { text: bodyText || "Please choose an option:" },
                action: { button: 'View Options', sections: [{ title: 'Selections', rows }] }
            }
        };
    }

    // 3. Fallback to standard text
    return { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
}

module.exports = async (req, res) => {
    const projectHost = req.headers.host || 'unknown';
    const isSouthAfricasSoul = projectHost.includes('southafricassoul');

    // 1. Health Check & Handshake
    if (req.method === "GET") {
        if (req.query["hub.verify_token"]) {
            const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
            if (!verifyToken) {
                console.error(`WA Webhook [${projectHost}]: Verification Failed - WHATSAPP_VERIFY_TOKEN not set in Vercel.`);
                return res.status(500).send('Configuration Error: WHATSAPP_VERIFY_TOKEN missing');
            }

            if (req.query["hub.verify_token"] === verifyToken) {
                console.log(`WA Webhook [${projectHost}]: Verification Successful`);
                return res.status(200).send(req.query["hub.challenge"]);
            }
            console.error(`WA Webhook [${projectHost}]: Verification Failed - Tokens do not match. Received: ${req.query["hub.verify_token"]}`);
            return res.status(403).end();
        }
        return res.status(200).json({
            status: 'FM Assist WhatsApp Webhook Online',
            version: API_VERSION,
            project: projectHost,
            ready: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_VERIFY_TOKEN)
        });
    }

    if (req.method !== 'POST') return res.status(405).end();

    console.log(`WA Webhook [${projectHost}]: Incoming POST request:`, JSON.stringify(req.body));

    // 2. Check for missing critical environment variables
    const missing = [];
    if (!process.env.WHATSAPP_ACCESS_TOKEN) missing.push('WHATSAPP_ACCESS_TOKEN');
    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) missing.push('WHATSAPP_PHONE_NUMBER_ID');
    if (!process.env.WHATSAPP_VERIFY_TOKEN) missing.push('WHATSAPP_VERIFY_TOKEN');

    if (missing.length > 0) {
        console.error(`WA Webhook [${projectHost}]: CRITICAL ERROR - Missing variables:`, missing.join(', '));
        return res.status(500).json({
            error: 'Missing configuration',
            missing,
            host: projectHost,
            instruction: "Ensure these variables are set in Vercel for this project."
        });
    }

    try {
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];
        if (!message) return res.status(200).end();

        const from = message.from;
        console.log(`WA Webhook: Message from ${from}`);

        const sessionId = `wa-${from}`;
        const session = await getSession(sessionId, 'whatsapp');

        let userText = "";
        if (message.type === 'text') {
            userText = message.text.body;
        } else if (message.type === 'interactive') {
            userText = message.interactive.button_reply?.title || message.interactive.list_reply?.title;
        } else if (message.type === 'image' || message.type === 'video') {
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

            const reply = await getLogicResponse(sessionId, userText, session);
            session.history.push({ role: 'assistant', content: reply });

            // Save session state to Supabase
            await saveSession(sessionId, session, 'whatsapp');

            // Send reply via WhatsApp
            console.log(`WA Webhook: Sending reply to ${from}`);
            await axios.post(`https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, formatWhatsAppPayload(from, reply), {
                headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
            });
            console.log(`WA Webhook: Reply sent successfully`);

            // If report is completed, trigger notifications and database logging
            if (reply.includes('submitted successfully')) {
                await processCompletedReport(session, sessionId, reply);
                // Reset session data for next fault but keep a bit of history or just reset fully
                session.data = {};
                session.media = [];
                await saveSession(sessionId, session, 'whatsapp');
            }
        }
    } catch (e) {
        console.error('WhatsApp Webhook Error:', e.response?.data || e.message);
    }
    res.status(200).end();
};
