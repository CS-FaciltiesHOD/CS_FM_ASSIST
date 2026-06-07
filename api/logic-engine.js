// api/logic-engine.js
// FM ASSIST V3 — DIAGNOSTIC ENGINE
// Metadata-driven state machine with Root Cause Calculation

const { createClient } = require('@supabase/supabase-js');
const { calculatePriority } = require('./priority-engine');

const STORES = require('./stores.json');
const EQUIPMENT_METADATA = require('./equipment-metadata.json');
const DIAGNOSTIC_MODULES = require('./diagnostic-modules.json');
const LIBRARY = require('./questionnaire-library.json');

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const PHASES = {
  IDENTIFICATION: 'ID',
  SAFETY: 'SAFETY',
  ASSET_DETAILS: 'ASSET',
  ELECTRICAL: 'ELEC',
  SYMPTOMS: 'SYMPTOM',
  DIAGNOSTIC: 'DIAG',
  FOOD_SAFETY: 'FOOD',
  IMPACT: 'IMPACT',
  MEDIA: 'MEDIA',
  CONFIRMATION: 'CONFIRM',
  COMPLETED: 'DONE'
};

function getNextQuestion(session) {
  const state = session.state || { phase: PHASES.IDENTIFICATION, step: 'STORE' };
  session.state = state;
  const data = session.data || {};
  const meta = data.equipmentProfile || {};

  // --- PHASE 1: IDENTIFICATION ---
  if (state.phase === PHASES.IDENTIFICATION) {
    switch (state.step) {
      case 'STORE': return LIBRARY.identification.STORE;
      case 'REPORTER': return LIBRARY.identification.REPORTER;
      case 'CATEGORY':
        let catList = LIBRARY.identification.CATEGORY + "\n";
        Object.keys(EQUIPMENT_METADATA).forEach((name, i) => { catList += `${i + 1}. ${name}\n`; });
        return catList;
      case 'EQUIPMENT':
        const equipList = Object.keys(EQUIPMENT_METADATA[data.category] || {});
        let eMsg = LIBRARY.identification.EQUIPMENT.replace('[category]', data.category) + "\n";
        equipList.forEach((name, i) => { eMsg += `${i + 1}. ${name}\n`; });
        return eMsg;
      case 'LOCATION': return LIBRARY.identification.LOCATION;
    }
  }

  // --- PHASE 2: SAFETY ---
  if (state.phase === PHASES.SAFETY) {
    if (state.step === 'RISK') return LIBRARY.safety.RISK;
    if (state.step === 'EMERGENCY') {
        let msg = LIBRARY.safety.EMERGENCY + "\n";
        LIBRARY.safety.EMERGENCY_OPTIONS.forEach((o, i) => { msg += `${i+1}. ${o}\n`; });
        return msg;
    }
  }

  // --- PHASE 3: ASSET DETAILS (Conditional) ---
  if (state.phase === PHASES.ASSET_DETAILS) {
    return LIBRARY.asset_details[state.step];
  }

  // --- PHASE 4: ELECTRICAL (Conditional) ---
  if (state.phase === PHASES.ELECTRICAL) {
    const pPath = meta.powerPath;
    if (state.step === 'START') {
      if (data.equipment === 'Lighting') return LIBRARY.electrical.LIGHTING_AREA.text + "\n1. Single Light\n2. Multiple Lights\n3. Entire Area";
      if (data.category === 'Refrigeration') return LIBRARY.electrical.REFRIG_CONTROLLER.text + "\n1. Yes\n2. No";
      if (pPath === 'plug' || pPath === 'move_socket') return "Is the appliance plugged in and the socket switched ON?\n1. Yes\n2. No";
      if (pPath === 'isolator') return "Is the equipment isolator switch in the ON position?\n1. Yes\n2. No";
      return "Is there power to the unit?\n1. Yes\n2. No";
    }
    if (state.step === 'BREAKER_TRIP') return LIBRARY.electrical.BREAKER_TRIPPED.text + "\n1. Yes\n2. No\n3. Unknown";
    if (state.step === 'BREAKER_RESET') return LIBRARY.electrical.BREAKER_RESET.text + "\n1. Yes\n2. No";
    if (state.step === 'SOCKET_TEST') return LIBRARY.electrical.SOCKET_TEST.text + "\n1. Yes - and it works\n2. Yes - it doesn't\n3. No";
    if (state.step === 'LAMP_DMG') return LIBRARY.electrical.LIGHTING_LAMP.text + "\n1. Yes\n2. No";
  }

  // --- PHASE 5: SYMPTOMS ---
  if (state.phase === PHASES.SYMPTOMS) {
    const module = DIAGNOSTIC_MODULES[meta.module];
    if (!module || !module.symptoms || module.symptoms.length === 0) {
      state.phase = PHASES.IMPACT;
      return getNextQuestion(session);
    }
    let msg = "What is the primary symptom?\n";
    module.symptoms.forEach((s, i) => { msg += `${i+1}. ${s.text}\n`; });
    return msg;
  }

  // --- PHASE 6: DIAGNOSTIC ---
  if (state.phase === PHASES.DIAGNOSTIC) {
    const module = DIAGNOSTIC_MODULES[meta.module];
    if (!module || !module.logic) {
      state.phase = PHASES.IMPACT;
      return getNextQuestion(session);
    }
    const qIndex = parseInt(state.step);
    const q = module.logic[qIndex];

    if (q) {
      // INFO REUSE: Skip location if already known
      if (q.text.toLowerCase().includes("located") || q.text.toLowerCase().includes("where is the fault")) {
        if (!data.diagnosticResults) data.diagnosticResults = {};
        data.diagnosticResults[q.id] = data.equipmentLocation;
        state.step = qIndex + 1;
        return getNextQuestion(session);
      }

      // CONDITIONAL SKIP
      if (q.conditional) {
        const dependentValue = data.diagnosticResults[q.conditional.field];
        if (dependentValue !== q.conditional.value) {
          state.step = qIndex + 1;
          return getNextQuestion(session);
        }
      }

      let msg = q.text;
      if (q.options) msg += "\n" + q.options.map((o, i) => `${i+1}. ${o}`).join('\n');
      return msg;
    } else {
      // Phase finished
      calculateRootCause(data, module);
      if (data.equipmentProfile.foodSafety) { state.phase = PHASES.FOOD_SAFETY; state.step = 0; }
      else { state.phase = PHASES.IMPACT; }
      return getNextQuestion(session);
    }
  }

  // --- PHASE 7: FOOD SAFETY (Conditional) ---
  if (state.phase === PHASES.FOOD_SAFETY) {
    const qIndex = parseInt(state.step);
    return LIBRARY.food_safety[qIndex].text + "\n1. Yes\n2. No\n3. Unknown";
  }

  // --- PHASE 8: IMPACT ---
  if (state.phase === PHASES.IMPACT) {
    let msg = LIBRARY.impact.OPERATIONAL + "\n";
    LIBRARY.impact.OPTIONS.forEach((opt, i) => { msg += `${i+1}. ${opt}\n`; });
    return msg;
  }

  // --- PHASE 9: MEDIA ---
  if (state.phase === PHASES.MEDIA) {
    return LIBRARY.media.PHOTO;
  }

  // --- PHASE 10: CONFIRMATION ---
  if (state.phase === PHASES.CONFIRMATION) {
    return generateReportText(session) + "\n\nSubmit this report? (YES / NO to restart)";
  }

  return "Report submitted!";
}

function handleInput(session, input) {
  const text = input.trim();
  const lowText = text.toLowerCase();
  if (!session.data) session.data = {};
  const data = session.data;
  const state = session.state;

  // --- PHASE 1: IDENTIFICATION ---
  if (state.phase === PHASES.IDENTIFICATION) {
    if (state.step === 'STORE') {
      const storeName = STORES[text];
      if (storeName) { data.store = `${text} Checksave ${storeName}`; state.step = 'REPORTER'; }
      else return "Invalid store code.";
    }
    else if (state.step === 'REPORTER') { data.reporter = text; state.step = 'CATEGORY'; }
    else if (state.step === 'CATEGORY') {
      const cats = Object.keys(EQUIPMENT_METADATA);
      const selected = cats[parseInt(text)-1] || cats.find(c => c.toLowerCase() === lowText);
      if (selected) { data.category = selected; state.step = 'EQUIPMENT'; }
      else return "Invalid category.";
    }
    else if (state.step === 'EQUIPMENT') {
      const equips = EQUIPMENT_METADATA[data.category];
      const keys = Object.keys(equips);
      const selected = keys[parseInt(text)-1] || keys.find(k => k.toLowerCase() === lowText);
      if (selected) { data.equipment = selected; data.equipmentProfile = equips[selected]; state.step = 'LOCATION'; }
      else return "Invalid equipment.";
    }
    else if (state.step === 'LOCATION') { data.equipmentLocation = text; state.phase = PHASES.SAFETY; state.step = 'RISK'; }
  }

  // --- PHASE 2: SAFETY ---
  else if (state.phase === PHASES.SAFETY) {
    if (state.step === 'RISK') { data.safetyRisk = text; state.step = 'EMERGENCY'; }
    else if (state.step === 'EMERGENCY') {
      const opt = LIBRARY.safety.EMERGENCY_OPTIONS[parseInt(text)-1] || text;
      if (opt.toLowerCase() !== 'none') {
        data.emergencyDetected = true;
        data.emergencyType = opt;
        data.priority = calculatePriority(data);
        state.phase = PHASES.CONFIRMATION;
        return null;
      }
      const meta = data.equipmentProfile;
      if (meta.assetTracked) { state.phase = PHASES.ASSET_DETAILS; state.step = 'BRAND'; }
      else if (meta.powered) { state.phase = PHASES.ELECTRICAL; state.step = 'START'; }
      else { state.phase = PHASES.SYMPTOMS; }
    }
  }

  // --- PHASE 3: ASSET DETAILS ---
  else if (state.phase === PHASES.ASSET_DETAILS) {
    if (state.step === 'BRAND') { data.brand = text; state.step = 'MODEL'; }
    else if (state.step === 'MODEL') { data.model = text; state.step = 'TAG'; }
    else if (state.step === 'TAG') { data.assetTag = text; state.step = 'SERIAL'; }
    else if (state.step === 'SERIAL') {
      data.serialNumber = text;
      if (data.equipmentProfile.powered) { state.phase = PHASES.ELECTRICAL; state.step = 'START'; }
      else { state.phase = PHASES.SYMPTOMS; }
    }
  }

  // --- PHASE 4: ELECTRICAL ---
  else if (state.phase === PHASES.ELECTRICAL) {
    const meta = data.equipmentProfile;
    const path = meta.powerPath;

    if (state.step === 'START') {
      if (data.equipment === 'Lighting') {
        data.elecArea = ['Single Light', 'Multiple Lights', 'Entire Area'][parseInt(text)-1] || text;
        if (data.elecArea === 'Single Light') state.step = 'LAMP_DMG';
        else state.step = 'BREAKER_TRIP';
      } else {
        const isSwitchOn = lowText.includes('yes') || text === '1';
        if (isSwitchOn) {
            // Power is switched on, but is it actually working?
            if (path === 'plug' || path === 'move_socket') state.step = 'SOCKET_TEST';
            else if (path === 'isolator') state.step = 'BREAKER_TRIP';
            else { data.powerStatus = 'Switched ON'; state.phase = PHASES.SYMPTOMS; }
        } else {
            data.powerStatus = 'Switched OFF';
            return "Please switch the power ON and let me know if the unit starts.";
        }
      }
    }
    else if (state.step === 'BREAKER_TRIP') {
      const tripped = lowText.includes('yes') || text === '1';
      if (tripped) state.step = 'BREAKER_RESET';
      else { data.powerStatus = 'Supply Fault (Breaker OK)'; state.phase = PHASES.SYMPTOMS; }
    }
    else if (state.step === 'BREAKER_RESET') {
      const restored = lowText.includes('yes') || text === '1';
      if (restored) { data.powerStatus = 'Restored'; state.phase = PHASES.SYMPTOMS; }
      else { data.powerStatus = 'Electrical fault escalated'; state.phase = PHASES.SYMPTOMS; }
    }
    else if (state.step === 'SOCKET_TEST') {
      data.socketTest = text;
      if (lowText.includes('works') || text === '1') {
          data.powerStatus = 'Socket Verified - Appliance Fault Likely';
          state.phase = PHASES.SYMPTOMS;
      } else if (text === '2') {
          data.powerStatus = 'Defective Socket';
          // Follow socket path: jump to dedicated socket module diagnostic phase
          data.category = 'Electrical';
          data.equipment = 'Plug Points / Sockets';
          data.equipmentProfile = EQUIPMENT_METADATA['Electrical']['Plug Points / Sockets'];
          state.phase = PHASES.SYMPTOMS; // Will load socket symptoms next
      } else {
          state.phase = PHASES.SYMPTOMS;
      }
    }
    else if (state.step === 'LAMP_DMG') {
      data.lampDmg = text;
      state.phase = PHASES.SYMPTOMS;
    }
  }

  // --- PHASE 5: SYMPTOMS ---
  else if (state.phase === PHASES.SYMPTOMS) {
    const module = DIAGNOSTIC_MODULES[data.equipmentProfile.module];
    if (!module) {
      state.phase = PHASES.IMPACT;
      return handleInput(session, input);
    }
    data.selectedSymptom = module.symptoms[parseInt(text)-1]?.text || text;
    state.phase = PHASES.DIAGNOSTIC;
    state.step = 0;
  }

  // --- PHASE 6: DIAGNOSTIC ---
  else if (state.phase === PHASES.DIAGNOSTIC) {
    if (!data.diagnosticResults) data.diagnosticResults = {};
    const module = DIAGNOSTIC_MODULES[data.equipmentProfile.module];
    if (!module) {
      state.phase = PHASES.IMPACT;
      return handleInput(session, input);
    }
    let qIdx = parseInt(state.step);
    const q = module.logic[qIdx];

    if (q) {
      const val = q.options ? (q.options[parseInt(text)-1] || text) : text;
      data.diagnosticResults[q.id] = val;

      // Emergency Termination check
      if (q.emergencyOn && q.emergencyOn.includes(val)) {
        data.emergencyDetected = true;
        data.emergencyType = `${q.text}: ${val}`;
        data.priority = calculatePriority(data);
        state.phase = PHASES.CONFIRMATION;
        return null;
      }
    }

    state.step = qIdx + 1;
  }

  // --- PHASE 7: FOOD SAFETY ---
  else if (state.phase === PHASES.FOOD_SAFETY) {
    if (!data.foodSafetyResults) data.foodSafetyResults = {};
    const q = LIBRARY.food_safety[parseInt(state.step)];
    data.foodSafetyResults[q.id] = ['Yes', 'No', 'Unknown'][parseInt(text)-1] || text;
    state.step = parseInt(state.step) + 1;
    if (state.step >= LIBRARY.food_safety.length) state.phase = PHASES.IMPACT;
  }

  // --- PHASE 8: IMPACT ---
  else if (state.phase === PHASES.IMPACT) {
    data.operationalImpact = LIBRARY.impact.OPTIONS[parseInt(text)-1] || text;
    state.phase = PHASES.MEDIA;
  }

  // --- PHASE 9: MEDIA ---
  else if (state.phase === PHASES.MEDIA) {
    data.photoAttached = lowText.includes('yes');
    data.priority = calculatePriority(data);
    state.phase = PHASES.CONFIRMATION;
  }

  // --- PHASE 10: CONFIRMATION ---
  else if (state.phase === PHASES.CONFIRMATION) {
    if (lowText === 'yes') { state.phase = PHASES.COMPLETED; return "SUCCESS"; }
    else if (lowText === 'no') { return "RESTART"; }
  }

  return null;
}

function calculateRootCause(data, module) {
  if (!module.resolutions) return;
  let bestMatch = null;
  let maxScore = -1;

  module.resolutions.forEach(res => {
    let match = true;
    for (const [key, value] of Object.entries(res.condition)) {
      const userVal = data.diagnosticResults[key];
      // Simple range check for temperature
      if (value.startsWith('>') && key.includes('TEMP')) {
          const limit = parseFloat(value.substring(1));
          if (!(parseFloat(userVal) > limit)) { match = false; break; }
      }
      else if (userVal !== value) { match = false; break; }
    }
    if (match && res.score > maxScore) {
      bestMatch = res;
      maxScore = res.score;
    }
  });

  if (bestMatch) {
    data.likelyCause = bestMatch.cause;
    data.confidenceScore = bestMatch.score;
    data.recommendation = bestMatch.recommendation;
  }
}

function generateReportText(session) {
  const d = session.data;
  const p = d.priority || calculatePriority(d);
  const ticketId = d.ticketId || `FM-${Date.now().toString(36).toUpperCase()}`;

  return `━━━ FM FAULT REPORT #V3 ━━━
📍 Store:      ${d.store}
👤 Reporter:   ${d.reporter}
🔧 Asset:      ${d.equipment} (${d.category})
📍 Location:   ${d.equipmentLocation}

⚡ Power:      ${d.powerStatus || 'N/A'}
⚠️ Symptom:    ${d.selectedSymptom}

🔍 DIAGNOSIS:
• Likely Cause:  ${d.likelyCause || 'Further investigation required'}
• Confidence:    ${d.confidenceScore ? d.confidenceScore + '%' : 'N/A'}
• Action:        ${d.recommendation || 'Technician to investigate on-site'}

🔴 Priority:   ${p.label} (${p.sla})
👷 Provider:   ${d.equipmentProfile?.provider}
━━━━━━━━━━━━━━━━━━━━━━━━`;
}

async function getLogicResponse(userId, userMessage, session) {
  if (userMessage.toLowerCase() === 'reset' || userMessage.toLowerCase() === 'restart' || userMessage.toLowerCase() === 'log a fault') {
    session.state = { phase: PHASES.IDENTIFICATION, step: 'STORE' };
    session.data = { ticketId: `FM-${Date.now().toString(36).toUpperCase()}` };
    return "Good day! FM Assist V3 Diagnostic Engine online.\n\n" + getNextQuestion(session);
  }
  if (!session.state || session.state.phase === PHASES.COMPLETED) {
    session.state = { phase: PHASES.IDENTIFICATION, step: 'STORE' };
    session.data = {};
    return "Good day! Let's diagnose your fault.\n\n" + getNextQuestion(session);
  }

  const result = handleInput(session, userMessage);
  if (result === "SUCCESS") { session.state = { phase: PHASES.COMPLETED }; return "Submitted successfully!\n\n" + generateReportText(session); }
  if (result === "RESTART") { session.state = { phase: PHASES.IDENTIFICATION, step: 'STORE' }; session.data = {}; return "Restarting...\n\n" + getNextQuestion(session); }
  if (typeof result === 'string') return result;

  let response = getNextQuestion(session);
  if (session.data?.emergencyDetected) response = "⚠️ EMERGENCY ESCALATION ACTIVATED\n\n" + response;
  return response;
}

module.exports = { getLogicResponse };
