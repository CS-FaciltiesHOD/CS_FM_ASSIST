// api/logic-engine.js
// FM ASSIST V2 — METADATA-DRIVEN LOGIC ENGINE

const { createClient } = require('@supabase/supabase-js');
const { calculatePriority } = require('./priority-engine');

const STORES = require('./stores.json');
const EQUIPMENT_METADATA = require('./equipment-metadata.json');
const DIAGNOSTIC_MODULES = require('./diagnostic-modules.json');
const QUESTIONS = require('./questions.json');

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const PHASES = {
  IDENTIFICATION: 'IDENTIFICATION',
  SAFETY: 'SAFETY',
  ASSET_DETAILS: 'ASSET_DETAILS',
  POWER_CHECK: 'POWER_CHECK',
  POWER_SUBPATH: 'POWER_SUBPATH',
  DIAGNOSTIC: 'DIAGNOSTIC',
  FOOD_SAFETY: 'FOOD_SAFETY',
  IMPACT: 'IMPACT',
  MEDIA: 'MEDIA',
  REPORT_CONFIRM: 'REPORT_CONFIRM',
  COMPLETED: 'COMPLETED'
};

const FOOD_SAFETY_QUESTIONS = [
  { id: 'FS_COLDCHAIN',  text: 'Has the cold chain been compromised?',                  type: 'options', options: ['Yes','No','Unknown'] },
  { id: 'FS_PRODTEMP',   text: 'Is product above the safe storage temperature?',        type: 'options', options: ['Yes','No','Unknown'] },
  { id: 'FS_CONTAM',     text: 'Is there a risk of contamination?',                     type: 'options', options: ['Yes','No','Unknown'] },
  { id: 'FS_PRODUCTION', text: 'Has production stopped due to this fault?',             type: 'options', options: ['Yes','No'] },
  { id: 'FS_STOCK',      text: 'Is stock at risk of spoilage or disposal?',             type: 'options', options: ['Yes','No','Unknown'] },
];

function getNextQuestion(session) {
  const state = session.state || { phase: PHASES.IDENTIFICATION, step: 'STORE' };
  session.state = state;
  const data = session.data || {};
  const meta = data.equipmentProfile || {};

  // --- PHASE 1: IDENTIFICATION ---
  if (state.phase === PHASES.IDENTIFICATION) {
    switch (state.step) {
      case 'STORE': return QUESTIONS.identification.STORE;
      case 'REPORTER': return QUESTIONS.identification.REPORTER;
      case 'CATEGORY':
        let catList = QUESTIONS.identification.CATEGORY + "\n";
        Object.keys(EQUIPMENT_METADATA).forEach((name, i) => { catList += `${i + 1}. ${name}\n`; });
        return catList;
      case 'EQUIPMENT':
        const equipList = Object.keys(EQUIPMENT_METADATA[data.category] || {});
        let eMsg = QUESTIONS.identification.EQUIPMENT.replace('[category]', data.category) + "\n";
        equipList.forEach((name, i) => { eMsg += `${i + 1}. ${name}\n`; });
        return eMsg;
      case 'LOCATION': return QUESTIONS.identification.LOCATION;
    }
  }

  // --- PHASE 2: SAFETY ---
  if (state.phase === PHASES.SAFETY) {
    if (state.step === 'RISK') return QUESTIONS.safety.RISK;
    if (state.step === 'EMERGENCY') return QUESTIONS.safety.EMERGENCY;
  }

  // --- PHASE 3: ASSET DETAILS ---
  if (state.phase === PHASES.ASSET_DETAILS) {
    return QUESTIONS.asset_details[state.step];
  }

  // --- PHASE 4: POWER CHECK ---
  if (state.phase === PHASES.POWER_CHECK) {
    return "Is there power to the unit? (Yes / No)";
  }

  if (state.phase === PHASES.POWER_SUBPATH) {
    const path = meta.powerPath || 'none';
    const subStep = parseInt(state.step);

    if (path === 'isolator') {
      if (subStep === 1) return "Switch the isolator OFF. Wait 10 seconds. Switch it back ON. Is there power now? (Yes / No)";
      if (subStep === 2) return "Check the DB board. Is the breaker for this unit tripped? (Yes / No)";
      if (subStep === 3) return "Reset the breaker. Is there power now? (Yes / No)";
    } else if (path === 'plug' || path === 'move_socket') {
      const verb = path === 'move_socket' ? 'Move' : 'Test';
      if (subStep === 1) return `${verb} the unit on an alternate plug socket. Is there power? (Yes / No)`;
      if (subStep === 2) return "Is the circuit breaker at the DB board tripped? (Yes / No)";
      if (subStep === 3) return "Reset it. Is there power now? (Yes / No)";
    } else if (path === 'db_board') {
      if (subStep === 1) return "Is the circuit breaker for this area tripped? (Yes / No)";
      if (subStep === 2) return "Reset it. Is power restored? (Yes / No)";
    }
    return "Proceeding to diagnostic.";
  }

  // --- PHASE 5: DIAGNOSTIC ---
  if (state.phase === PHASES.DIAGNOSTIC) {
    const questions = DIAGNOSTIC_MODULES[meta.module] || [];
    const qIndex = parseInt(state.step);
    const q = questions[qIndex];
    if (q) {
      let msg = q.text;
      if (q.options) msg += "\n" + q.options.map((o, i) => `${i+1}. ${o}`).join('\n');
      return msg;
    }
  }

  // --- PHASE 6: FOOD SAFETY ---
  if (state.phase === PHASES.FOOD_SAFETY) {
    const qIndex = parseInt(state.step);
    return FOOD_SAFETY_QUESTIONS[qIndex].text + "\n1. Yes\n2. No\n3. Unknown";
  }

  // --- PHASE 7: IMPACT ---
  if (state.phase === PHASES.IMPACT) {
    let msg = QUESTIONS.impact.OPERATIONAL + "\n";
    QUESTIONS.impact.OPTIONS.forEach((opt, i) => { msg += `${i+1}. ${opt}\n`; });
    return msg;
  }

  // --- PHASE 8: MEDIA ---
  if (state.phase === PHASES.MEDIA) {
    if (state.step === 'PHOTO') return QUESTIONS.media.PHOTO;
    if (state.step === 'PRIORITY') {
      const p = calculatePriority(data);
      return `Calculated Priority: ${p.label} (SLA: ${p.sla}). Is this acceptable? (Yes / No)`;
    }
    if (state.step === 'PRIORITY_REASON') return "Please provide the reason why the calculated priority is not acceptable:";
  }

  // --- PHASE 9: CONFIRMATION ---
  if (state.phase === PHASES.REPORT_CONFIRM) {
    const report = generateReportText(session);
    return report + "\n\nSubmit this report? (YES / NO to restart)";
  }

  return "Report submitted successfully!";
}

function handleInput(session, input) {
  const text = input.trim();
  const lowText = text.toLowerCase();
  if (!session.data) session.data = {};
  const data = session.data;
  const state = session.state;

  // Global Emergency Override Logic
  const currentModule = data.equipmentProfile?.module;
  const questions = DIAGNOSTIC_MODULES[currentModule] || [];
  if (state.phase === PHASES.DIAGNOSTIC) {
    const q = questions[parseInt(state.step)];
    if (q?.emergencyOn) {
      const match = q.options ? (q.options[parseInt(text)-1] || text) : text;
      if (q.emergencyOn.some(eo => match.toLowerCase().includes(eo.toLowerCase()))) {
        data.emergencyDetected = true;
        data.emergencyType = match;
        data.priority = calculatePriority(data);
        state.phase = PHASES.REPORT_CONFIRM;
        return null;
      }
    }
  }

  // --- PHASE 1: IDENTIFICATION ---
  if (state.phase === PHASES.IDENTIFICATION) {
    if (state.step === 'STORE') {
      const storeName = STORES[text];
      if (storeName) { data.store = `${text} Checksave ${storeName}`; state.step = 'REPORTER'; }
      else return "Invalid store code. Please retry with a valid 4-digit Checksave store code.";
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
      if (selected) {
        data.equipment = selected;
        data.equipmentProfile = equips[selected];
        state.step = 'LOCATION';
      } else return "Invalid equipment.";
    }
    else if (state.step === 'LOCATION') {
      data.equipmentLocation = text;
      state.phase = PHASES.SAFETY;
      state.step = 'RISK';
    }
  }

  // --- PHASE 2: SAFETY ---
  else if (state.phase === PHASES.SAFETY) {
    if (state.step === 'RISK') { data.safetyRisk = text; state.step = 'EMERGENCY'; }
    else if (state.step === 'EMERGENCY') {
      if (lowText.includes('yes')) {
        data.emergencyDetected = true;
        data.priority = calculatePriority(data);
        state.phase = PHASES.REPORT_CONFIRM;
        return null;
      }
      const meta = data.equipmentProfile;
      if (meta.assetTracked) { state.phase = PHASES.ASSET_DETAILS; state.step = 'BRAND'; }
      else if (meta.powered) { state.phase = PHASES.POWER_CHECK; state.step = 1; }
      else { state.phase = PHASES.DIAGNOSTIC; state.step = 0; }
    }
  }

  // --- PHASE 3: ASSET DETAILS ---
  else if (state.phase === PHASES.ASSET_DETAILS) {
    if (state.step === 'BRAND') { data.brand = text; state.step = 'MODEL'; }
    else if (state.step === 'MODEL') { data.model = text; state.step = 'TAG'; }
    else if (state.step === 'TAG') { data.assetTag = text; state.step = 'SERIAL'; }
    else if (state.step === 'SERIAL') {
      data.serialNumber = text;
      const meta = data.equipmentProfile;
      if (meta.powered) { state.phase = PHASES.POWER_CHECK; state.step = 1; }
      else { state.phase = PHASES.DIAGNOSTIC; state.step = 0; }
    }
  }

  // --- PHASE 4: POWER CHECK ---
  else if (state.phase === PHASES.POWER_CHECK) {
    if (lowText.includes('yes')) {
      data.powerStatus = 'Confirmed'; state.phase = PHASES.DIAGNOSTIC; state.step = 0;
    } else {
      data.powerStatus = 'No Power'; state.phase = PHASES.POWER_SUBPATH; state.step = 1;
    }
  }
  else if (state.phase === PHASES.POWER_SUBPATH) {
    const meta = data.equipmentProfile;
    const path = meta.powerPath;
    const currentStep = parseInt(state.step);

    // Identify restoration check steps
    const isRestoredCheck =
      (path === 'db_board' && currentStep === 2) ||
      (path === 'isolator' && (currentStep === 1 || currentStep === 3)) ||
      ((path === 'plug' || path === 'move_socket') && (currentStep === 1 || currentStep === 3));

    if (isRestoredCheck && lowText.includes('yes')) {
      data.powerStatus = 'Restored'; state.phase = PHASES.DIAGNOSTIC; state.step = 0;
    } else {
      let nextStep = currentStep + 1;

      // FIX BREAKER DECISION LOGIC: Only reset if Yes, else skip.
      if (path === 'db_board' && currentStep === 1 && lowText.includes('no')) nextStep = 3;
      if (path === 'isolator' && currentStep === 2 && lowText.includes('no')) nextStep = 4;
      if ((path === 'plug' || path === 'move_socket') && currentStep === 2 && lowText.includes('no')) nextStep = 4;

      const maxSteps = (path === 'isolator' || path === 'plug' || path === 'move_socket') ? 3 : 2;
      if (nextStep > maxSteps) {
        data.powerStatus = 'Electrical fault escalated'; state.phase = PHASES.DIAGNOSTIC; state.step = 0;
      } else {
        state.step = nextStep;
      }
    }
  }

  // --- PHASE 5: DIAGNOSTIC ---
  else if (state.phase === PHASES.DIAGNOSTIC) {
    if (!data.diagnosticResults) data.diagnosticResults = {};
    const questions = DIAGNOSTIC_MODULES[data.equipmentProfile.module] || [];
    let qIdx = parseInt(state.step);
    const q = questions[qIdx];

    if (q) {
      // INFO REUSE: Skip location if already known
      if (q.text.toLowerCase().includes("located") || q.text.toLowerCase().includes("where is the fault")) {
          data.diagnosticResults[q.id] = data.equipmentLocation;
          state.step = qIdx + 1;
          return handleInput(session, input);
      }
      data.diagnosticResults[q.id] = q.options ? (q.options[parseInt(text)-1] || text) : text;
    }

    // Dynamic Skipping (Conditionals)
    let nextQIdx = qIdx + 1;
    while (nextQIdx < questions.length) {
      const nextQ = questions[nextQIdx];
      if (nextQ.conditional) {
        const dependentValue = data.diagnosticResults[nextQ.conditional.field];
        if (dependentValue !== nextQ.conditional.value) {
          nextQIdx++; continue;
        }
      }
      break;
    }

    state.step = nextQIdx;
    if (state.step >= questions.length) {
      if (data.equipmentProfile.foodSafety) { state.phase = PHASES.FOOD_SAFETY; state.step = 0; }
      else { state.phase = PHASES.IMPACT; }
    }
  }

  // --- PHASE 6: FOOD SAFETY ---
  else if (state.phase === PHASES.FOOD_SAFETY) {
    if (!data.foodSafetyResults) data.foodSafetyResults = {};
    let qIdx = parseInt(state.step);
    const ans = ['Yes', 'No', 'Unknown'][parseInt(text)-1] || text;
    data.foodSafetyResults[FOOD_SAFETY_QUESTIONS[qIdx].id] = ans;
    state.step = qIdx + 1;
    if (state.step >= FOOD_SAFETY_QUESTIONS.length) state.phase = PHASES.IMPACT;
  }

  // --- PHASE 7: IMPACT ---
  else if (state.phase === PHASES.IMPACT) {
    data.operationalImpact = QUESTIONS.impact.OPTIONS[parseInt(text)-1] || text;
    state.phase = PHASES.MEDIA;
    state.step = 'PHOTO';
  }

  // --- PHASE 8: MEDIA ---
  else if (state.phase === PHASES.MEDIA) {
    if (state.step === 'PHOTO') { data.photoAttached = lowText.includes('yes'); state.step = 'PRIORITY'; }
    else if (state.step === 'PRIORITY') {
      if (lowText.includes('no')) state.step = 'PRIORITY_REASON';
      else {
        data.priority = calculatePriority(data);
        state.phase = PHASES.REPORT_CONFIRM;
      }
    }
    else if (state.step === 'PRIORITY_REASON') {
      data.priorityRejectionReason = text;
      data.priority = calculatePriority(data);
      state.phase = PHASES.REPORT_CONFIRM;
    }
  }

  // --- PHASE 9: CONFIRMATION ---
  else if (state.phase === PHASES.REPORT_CONFIRM) {
    if (lowText === 'yes') { state.phase = PHASES.COMPLETED; return "SUCCESS"; }
    else if (lowText === 'no') { data.userRequestedRestart = true; return "RESTART"; }
  }

  return null;
}

function generateReportText(session) {
  const d = session.data;
  const p = d.priority || calculatePriority(d);
  const ticketId = d.ticketId || `FM-${Date.now().toString(36).toUpperCase()}`;

  let findings = "";
  if (d.diagnosticResults) {
    const moduleQs = DIAGNOSTIC_MODULES[d.equipmentProfile.module] || [];
    findings = Object.entries(d.diagnosticResults)
      .map(([id, val]) => {
        const qText = moduleQs.find(mq => mq.id === id)?.text || id;
        return `• ${qText}: ${val}`;
      }).join('\n');
  }

  return `━━━ FM FAULT REPORT #${ticketId} ━━━
📍 Store:      ${d.store}
👤 Reporter:   ${d.reporter}
🔧 Asset:      ${d.equipment} (${d.category})
🏷️ Details:    ${d.brand || 'N/A'} | ${d.model || 'N/A'} | Tag: ${d.assetTag || 'N/A'}
🔖 S/N:        ${d.serialNumber || 'N/A'}
📍 Location:   ${d.equipmentLocation}

⚡ Power:      ${d.powerStatus || 'N/A'}
⚙️ Findings:
${findings || 'No specific findings recorded'}

🔴 Priority:   ${p.label} (${p.sla})
👷 Provider:   ${d.equipmentProfile?.provider}
━━━━━━━━━━━━━━━━━━━━━━━━`;
}

async function getLogicResponse(userId, userMessage, session) {
  if (userMessage.toLowerCase() === 'reset' || userMessage.toLowerCase() === 'restart' || userMessage.toLowerCase() === 'log a fault') {
    session.state = { phase: PHASES.IDENTIFICATION, step: 'STORE' };
    session.data = { ticketId: `FM-${Date.now().toString(36).toUpperCase()}` };
    return "Good day! I'm FM Assist V2. Let's log your fault.\n\n" + getNextQuestion(session);
  }
  if (!session.state || session.state.phase === PHASES.COMPLETED) {
    session.state = { phase: PHASES.IDENTIFICATION, step: 'STORE' };
    session.data = { ticketId: `FM-${Date.now().toString(36).toUpperCase()}` };
    return "Good day! Let's get started.\n\n" + getNextQuestion(session);
  }

  const result = handleInput(session, userMessage);
  if (result === "SUCCESS") { session.state = { phase: PHASES.COMPLETED }; return "Thank you! Your report has been submitted successfully.\n\n" + generateReportText(session); }
  if (result === "RESTART") { session.state = { phase: PHASES.IDENTIFICATION, step: 'STORE' }; session.data = { ticketId: `FM-${Date.now().toString(36).toUpperCase()}` }; return "Okay, opening a new report.\n\n" + getNextQuestion(session); }
  if (typeof result === 'string') return result;

  let response = getNextQuestion(session);
  if (session.data?.emergencyDetected) response = "⚠️ EMERGENCY: Please have someone call the Facilities Manager immediately.\n\n" + response;
  return response;
}

module.exports = { getLogicResponse };
