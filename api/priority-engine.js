// api/priority-engine.js
// FM Assist — Metadata-driven Priority & SLA Calculation

function calculatePriority(sessionData) {
  const { equipmentProfile, safetyRisk, emergencyDetected, foodSafetyResults, operationalImpact } = sessionData;
  const criticality = equipmentProfile?.criticality || 'Routine';

  // Priority 1 — Emergency
  // Triggered by safety risks, explicit emergencies, cold chain failure, or trading stop
  const lowRisk = (safetyRisk || '').toLowerCase();
  const isEmergency =
    emergencyDetected === true ||
    lowRisk.includes('yes') ||
    lowRisk.includes('risk') ||
    lowRisk.includes('danger') ||
    foodSafetyResults?.FS_COLDCHAIN === 'Yes' ||
    operationalImpact === 'Trading Stopped' ||
    operationalImpact === 'Store Wide Impact';

  if (isEmergency) {
    return { level: 1, label: 'Emergency', sla: '1 Hour', colour: '#E53935' };
  }

  // Priority 2 — Urgent
  // Triggered by critical equipment, multiple departments impacted, or general food safety risk
  const isUrgent =
    criticality === 'Critical' ||
    operationalImpact === 'Multiple Departments Impacted' ||
    foodSafetyResults?.FS_PRODTEMP === 'Yes' ||
    foodSafetyResults?.FS_STOCK === 'Yes' ||
    foodSafetyResults?.FS_CONTAM === 'Yes';

  if (isUrgent) {
    return { level: 2, label: 'Urgent', sla: '4 Hours', colour: '#F7B731' };
  }

  // Priority 3 — High
  // Triggered by important equipment or department impact
  const isHigh =
    criticality === 'Important' ||
    operationalImpact === 'Department Impact';

  if (isHigh) {
    return { level: 3, label: 'High', sla: '24 Hours', colour: '#028090' };
  }

  // Priority 4 — Routine
  return { level: 4, label: 'Routine', sla: 'Next Available Slot', colour: '#1DB954' };
}

module.exports = { calculatePriority };
