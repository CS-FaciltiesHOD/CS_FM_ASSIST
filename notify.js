// notify.js
const nodemailer = require('nodemailer');
const axios = require('axios');

const MASTER_EMAIL = 'facilitieshod@gmail.com';
const MASTER_WHATSAPP = '27605521872';

/**
 * Sends a notification to the relevant service provider and the facilities manager.
 * @param {Object} reportData - The structured report data.
 * @param {Array} media - Array of media objects { url, type, filename, buffer }
 */
async function sendFaultNotification(reportData, media = []) {
    console.log(`Processing notification for ticket #${reportData.ticketId}`);
    
    // 1. Send Email
    await sendEmail(reportData, media);

    // 2. Send WhatsApp Notification to Manager
    await sendWhatsAppManagerNotification(reportData, media);
}

async function sendEmail(reportData, media) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('WARNING: Email credentials missing. Notification skipped.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const subject = `[${reportData.priority.toUpperCase()}] ${reportData.category} Fault — ${reportData.store} | #${reportData.ticketId}`;
    
    // Build conversation transcript if available
    let transcript = "";
    if (reportData.history) {
        transcript = "\n\n━━━ CONVERSATION TRANSCRIPT ━━━\n" + 
            reportData.history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    }

    const body = `
━━━ FM FAULT REPORT #${reportData.ticketId} ━━━
📍 Store / Branch:     ${reportData.store}
👤 Reported by:        ${reportData.reporter}
📅 Date & time:        ${new Date().toLocaleString()}

🔧 Category:           ${reportData.category}
📦 Equipment:          ${reportData.equipment}
🏷️ Brand / Model:      ${reportData.brandModel}
🔖 Asset tag:          ${reportData.assetTag}
🔢 Serial number:      ${reportData.serialNumber}
📍 Location:           ${reportData.location}

⚡ Power status:       ${reportData.powerStatus}
🌡️ Temperature:        ${reportData.temperature}
⚙️ Failing to:         ${reportData.failureMode}
⚠️ Fault type:         ${reportData.faultType}
🔴 Priority / SLA:       ${reportData.priority}
👷 Technician needed:  ${reportData.technicianNeeded}
📸 Media attached:     ${media.length > 0 ? media.length : 'None'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${transcript}
    `;

    const attachments = media.map(m => ({
        filename: m.filename,
        content: m.buffer,
        contentType: m.mime_type
    }));

    try {
        await transporter.sendMail({
            from: `"FM Assist Bot" <${process.env.EMAIL_USER}>`,
            to: MASTER_EMAIL,
            subject: subject,
            text: body,
            attachments: attachments
        });
        console.log(`Email sent to ${MASTER_EMAIL}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

async function sendWhatsAppManagerNotification(reportData, media) {
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
        console.warn('WhatsApp credentials missing for manager notification.');
        return;
    }

    const url = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const headers = { 
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
    };

    const textBody = `🚨 *NEW FAULT REPORT #${reportData.ticketId}*\n\n` +
        `*Store:* ${reportData.store}\n` +
        `*Category:* ${reportData.category}\n` +
        `*Priority:* ${reportData.priority}\n` +
        `*Reported by:* ${reportData.reporter}\n\n` +
        `Check email for full details and attachments.`;

    try {
        // Send Summary Text
        await axios.post(url, {
            messaging_product: 'whatsapp',
            to: MASTER_WHATSAPP,
            type: 'text',
            text: { body: textBody }
        }, { headers });

        // Forward Media if any (Note: In a real environment, we'd upload and send media objects)
        // For now, we notify the manager that media is in the email.
        if (media.length > 0) {
            await axios.post(url, {
                messaging_product: 'whatsapp',
                to: MASTER_WHATSAPP,
                type: 'text',
                text: { body: `📸 ${media.length} photo(s)/video(s) were received and forwarded to ${MASTER_EMAIL}` }
            }, { headers });
        }
    } catch (error) {
        console.error('WhatsApp Manager Notification Error:', error.response?.data || error.message);
    }
}

module.exports = { sendFaultNotification };
