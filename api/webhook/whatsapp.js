const axios = require('axios');
const { getLogicResponse } = require('../logic-engine.js');
const { sendFaultNotification } = require('../notify.js');

const sessions = {};
function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = { history: [], media: [], lastActive: Date.now() };
    }
    sessions[userId].lastActive = Date.now();
    return sessions[userId];
}

async function downloadWhatsAppMedia(mediaId) {
    try {
        const response = await axios.get(`https://graph.facebook.com/v17.0/${mediaId}`, {
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
    const lines = reportText.split('\n');
    const getValue = (label) => {
        const line = lines.find(l => l.toLowerCase().includes(label.toLowerCase()));
        if (!line) return 'N/A';
        const parts = line.split(':');
        return parts.length < 2 ? 'N/A' : parts.slice(1).join(':').trim();
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
        const session = getSession(`wa-${from}`);
        let userText = "";
        if (message.type === 'text') userText = message.text.body;
        else if (message.type === 'interactive') userText = message.interactive.button_reply?.title || message.interactive.list_reply?.title;
        else if (message.type === 'image' || message.type === 'video') {
            const mediaId = message.image?.id || message.video?.id;
            const mediaData = await downloadWhatsAppMedia(mediaId);
            if (mediaData) { session.media.push(mediaData); userText = "[Sent " + message.type + "]"; }
        }
        if (userText) {
            session.history.push({ role: 'user', content: userText });
            const reply = await getLogicResponse(`wa-${from}`, userText, session);
            session.history.push({ role: 'assistant', content: reply });
            await axios.post(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, formatWhatsAppPayload(from, reply), {
                headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
            });
            if (reply.includes('━━━ FM FAULT REPORT #')) {
                await handleCompletedReport(session, `wa-${from}`, reply);
                session.history = [];
            }
        }
    } catch (e) { console.error('WA Error:', e.response?.data || e.message); }
    res.status(200).end();
};
