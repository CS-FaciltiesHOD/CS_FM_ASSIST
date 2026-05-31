const TelegramBot = require('node-telegram-bot-api');
const { getLogicResponse } = require('../logic-engine.cjs');
const { sendFaultNotification } = require('../notify.cjs');

const sessions = {};
function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = { history: [], media: [], lastActive: Date.now() };
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
        history: session.history
    };
    await sendFaultNotification(data, session.media);
    session.media = [];
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();

    const { message } = req.body;
    if (!message || !message.text) return res.status(200).end();

    const chatId = message.chat.id;
    const session = getSession(`tg-${chatId}`);
    session.history.push({ role: 'user', content: message.text });

    try {
        const reply = await getLogicResponse(`tg-${chatId}`, message.text, session);
        session.history.push({ role: 'assistant', content: reply });

        const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
        await bot.sendMessage(chatId, reply);

        if (reply.includes('━━━ FM FAULT REPORT #')) {
            await handleCompletedReport(session, `tg-${chatId}`, reply);
            session.history = [];
        }
    } catch (e) {
        console.error('Telegram Error:', e);
    }
    res.status(200).end();
};
