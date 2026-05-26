// notify.js
const nodemailer = require('nodemailer');

/**
 * Sends a notification to the relevant service provider and the facilities manager.
 * @param {Object} reportData - The structured report data.
 */
async function sendFaultNotification(reportData) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('WARNING: Email credentials missing. Notification for ticket #' + reportData.ticketId + ' skipped.');
        return false;
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

    const providerEmail = getServiceProviderEmail(reportData.category);
    const subject = `[${reportData.priority.toUpperCase()}] ${reportData.category} Fault — ${reportData.store} | #${reportData.ticketId}`;
    
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
🌀 Fan status:           ${reportData.fanStatus}
❄️ Ice build-up:         ${reportData.iceBuildUp}
🔩 Compressor fan:       ${reportData.compressorFan}
💧 Water / leak:         ${reportData.leakStatus}
🔊 Noise / vibration:    ${reportData.noiseStatus}
🛠️ Visible damage:       ${reportData.damageStatus}
⚙️ Failing to:         ${reportData.failureMode}
📝 Other findings:     ${reportData.additionalInfo}

⚠️ Fault type:         ${reportData.faultType}
🔴 Priority / SLA:       ${reportData.priority}
👷 Technician needed:  ${reportData.technicianNeeded}
📸 Photo attached:     ${reportData.photoAttached ? 'Yes' : 'No'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    try {
        await transporter.sendMail({
            from: `"FM Assist Bot" <${process.env.EMAIL_USER}>`,
            to: [providerEmail, process.env.FACILITIES_MANAGER_EMAIL].join(','),
            subject: subject,
            text: body,
        });
        console.log(`Notification sent for ticket #${reportData.ticketId}`);
        return true;
    } catch (error) {
        console.error('Error sending email notification:', error);
        return false;
    }
}

/**
 * Maps categories to service provider emails.
 */
function getServiceProviderEmail(category) {
    const mapping = {
        'Refrigeration — Upright fridge': 'refrig.contractor@example.com',
        'Refrigeration — Cold room': 'refrig.contractor@example.com',
        'Refrigeration — Freezer room': 'refrig.contractor@example.com',
        'Refrigeration — Island freezer': 'refrig.contractor@example.com',
        'Refrigeration — Serve over (cold display)': 'refrig.contractor@example.com',
        'Electrical — Lighting': 'electric.contractor@example.com',
        'Electrical — Plug points / sockets': 'electric.contractor@example.com',
        'Electrical — Switches / DB board': 'electric.contractor@example.com',
        'Backup power — Generator / UPS': 'power.contractor@example.com',
        'Plumbing': 'plumbing.contractor@example.com',
        'Building & Civil — Tiling / fixtures / fittings': 'civil.contractor@example.com',
        'Building & Civil — Roof / ceiling / structure': 'civil.contractor@example.com',
        'Trolleys — Customer trolleys': 'trolley.team@example.com',
        'Trolleys — Basket / pallet / flatbed': 'trolley.team@example.com',
        'Bakery equipment': 'bakery.tech@example.com',
        'Butchery equipment': 'butchery.tech@example.com',
        'Deli / Pie shop equipment': 'deli.tech@example.com',
        'Fruit & Veg equipment — sealers / wrappers': 'fv.tech@example.com',
        'HVAC / Aircon': 'hvac.contractor@example.com',
        'Fire safety equipment': 'fire.safety@example.com',
        'Pest & Hygiene': 'pest.control@example.com',
    };

    return mapping[category] || process.env.FACILITIES_MANAGER_EMAIL;
}

module.exports = { sendFaultNotification };
