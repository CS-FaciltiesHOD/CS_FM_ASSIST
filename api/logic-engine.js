// api/logic-engine.js
// FM ASSIST V2 — LOGIC ENGINE
// Implements all 12 layers from the FM Assist V2 Logic Engine Specification
// Refined for granular 1-by-1 interactions.

const { createClient } = require('@supabase/supabase-js');

const STORES = {
  "1002": "uMzinyathi",
  "1003": "Westham",
  "1005": "Plaza",
  "1008": "Woodview",
  "1009": "Edendale",
  "1010": "Bayview",
  "1012": "Nuwest",
  "1022": "Bizana",
  "1024": "Moorcross",
  "1035": "Westcliff",
  "1037": "Montford",
  "1038": "Himalaya",
  "1043": "Melmoth",
  "1058": "Kwadukuza",
  "1060": "Marianhill",
  "3001": "Victoria",
  "3002": "Queen",
  "3003": "Citygate",
  "3004": "Isipingo",
  "3007": "Merebank",
  "3008": "West Street",
  "3010": "Verulam",
  "3011": "Stanger",
  "3013": "Bridgecity",
  "3014": "Starwood",
  "3015": "Newlands",
  "3016": "Greytown",
  "3017": "Mbazwana",
  "3018": "Brickfield",
  "3020": "Alpine",
  "3021": "Ginginlovo",
  "3022": "Brookdale",
  "3023": "Kenterton",
  "3024": "Pietermaritzburg",
  "3025": "Raisthorpe",
  "3026": "Shallcross",
  "3027": "Richmond",
  "3029": "Woodhurst",
  "3030": "Mooiriver",
  "3031": "Ladysmith",
  "3032": "Newcastle",
  "3033": "Moorton",
  "3034": "Tongaat Rank",
  "3035": "Ixopo",
  "3036": "Umlazi V",
  "3037": "Dundee",
  "3039": "Vryheid",
  "3040": "Estcourt",
  "3041": "Harding",
  "3042": "Umlazi D",
  "3043": "Truro Plaza",
  "3044": "Osizweni",
  "3045": "Paulpietersburg",
  "3046": "Mthatha",
  "3047": "Kingsburgh",
  "3048": "North Coast Road",
  "3049": "Highflats",
  "3009": "Folweni"
};

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3 — ASSET CLASSIFICATION TABLE
// ─────────────────────────────────────────────────────────────────────────────
const ASSET_PROFILES = {
  'Upright Fridge': {
    category: 'Refrigeration',
    diagnosticProfile: 'REFRIG_UPRIGHT',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Cold Chain',
    foodSafety: true,
    targetTemp: { min: 0, max: 5, unit: '°C' },
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Cold Room': {
    category: 'Refrigeration',
    diagnosticProfile: 'REFRIG_COLDROOM',
    criticality: 'Critical',
    requiresPower: true,
    provider: 'Cold Chain',
    foodSafety: true,
    powerPath: 'A',
    targetTemp: { min: 1, max: 5, unit: '°C' },
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Freezer Room': {
    category: 'Refrigeration',
    diagnosticProfile: 'REFRIG_FREEZER',
    criticality: 'Critical',
    requiresPower: true,
    provider: 'Cold Chain',
    foodSafety: true,
    powerPath: 'A',
    targetTemp: { min: -25, max: -18, unit: '°C' },
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Island Freezer': {
    category: 'Refrigeration',
    diagnosticProfile: 'REFRIG_ISLAND',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Cold Chain',
    foodSafety: true,
    powerPath: 'C',
    targetTemp: { min: -25, max: -18, unit: '°C' },
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Serve Over': {
    category: 'Refrigeration',
    diagnosticProfile: 'REFRIG_SERVEOVER',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Cold Chain',
    foodSafety: true,
    powerPath: 'B',
    targetTemp: { min: 0, max: 5, unit: '°C' },
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Lighting': {
    category: 'Electrical',
    diagnosticProfile: 'ELECTRICAL_LIGHTING',
    criticality: 'Routine',
    requiresPower: true,
    provider: 'Electrical Contractor',
    foodSafety: false,
    powerPath: 'D',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Plug Points / Sockets': {
    category: 'Electrical',
    diagnosticProfile: 'ELECTRICAL_SOCKETS',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Electrical Contractor',
    foodSafety: false,
    powerPath: 'D',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'DB Board / Switches': {
    category: 'Electrical',
    diagnosticProfile: 'ELECTRICAL_DB',
    criticality: 'Critical',
    requiresPower: true,
    provider: 'Electrical Contractor',
    foodSafety: false,
    powerPath: 'D',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Generator': {
    category: 'Backup Power',
    diagnosticProfile: 'BACKUP_GENERATOR',
    criticality: 'Critical',
    requiresPower: false,
    provider: 'Generator Contractor',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'UPS': {
    category: 'Backup Power',
    diagnosticProfile: 'BACKUP_UPS',
    criticality: 'Critical',
    requiresPower: false,
    provider: 'Generator Contractor',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Burst Pipe': {
    category: 'Plumbing',
    diagnosticProfile: 'PLUMBING_GENERAL',
    criticality: 'Critical',
    requiresPower: false,
    provider: 'Plumbing Services',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Blocked Drain': {
    category: 'Plumbing',
    diagnosticProfile: 'PLUMBING_GENERAL',
    criticality: 'Important',
    requiresPower: false,
    provider: 'Plumbing Services',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Geyser / Water Heater': {
    category: 'Plumbing',
    diagnosticProfile: 'PLUMBING_GENERAL',
    criticality: 'Important',
    requiresPower: false,
    provider: 'Plumbing Services',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'General Plumbing': {
    category: 'Plumbing',
    diagnosticProfile: 'PLUMBING_GENERAL',
    criticality: 'Routine',
    requiresPower: false,
    provider: 'Plumbing Services',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Roof Leak': {
    category: 'Building & Civil',
    diagnosticProfile: 'BUILDING_GENERAL',
    criticality: 'Important',
    requiresPower: false,
    provider: 'Building Maintenance',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Floor / Tiling': {
    category: 'Building & Civil',
    diagnosticProfile: 'BUILDING_GENERAL',
    criticality: 'Routine',
    requiresPower: false,
    provider: 'Building Maintenance',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Door / Lock': {
    category: 'Building & Civil',
    diagnosticProfile: 'BUILDING_GENERAL',
    criticality: 'Routine',
    requiresPower: false,
    provider: 'Building Maintenance',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'General Building': {
    category: 'Building & Civil',
    diagnosticProfile: 'BUILDING_GENERAL',
    criticality: 'Routine',
    requiresPower: false,
    provider: 'Building Maintenance',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Customer Trolley': {
    category: 'Trolleys',
    diagnosticProfile: 'TROLLEY',
    criticality: 'Routine',
    requiresPower: false,
    provider: 'Workshop Team',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Basket / Pallet Jack / Flatbed': {
    category: 'Trolleys',
    diagnosticProfile: 'TROLLEY',
    criticality: 'Routine',
    requiresPower: false,
    provider: 'Workshop Team',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Bakery Oven': {
    category: 'Bakery',
    diagnosticProfile: 'BAKERY',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Bakery Services',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Dough Divider': {
    category: 'Bakery',
    diagnosticProfile: 'BAKERY',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Bakery Services',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Dough Mixer': {
    category: 'Bakery',
    diagnosticProfile: 'BAKERY',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Bakery Services',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'General Bakery Equipment': {
    category: 'Bakery',
    diagnosticProfile: 'BAKERY',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Bakery Services',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Bandsaw': {
    category: 'Butchery',
    diagnosticProfile: 'BUTCHERY',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Butchery Technician',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Mincer': {
    category: 'Butchery',
    diagnosticProfile: 'BUTCHERY',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Butchery Technician',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Vacuum Machine': {
    category: 'Butchery',
    diagnosticProfile: 'BUTCHERY',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Butchery Technician',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Slicer': {
    category: 'Butchery',
    diagnosticProfile: 'BUTCHERY',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Butchery Technician',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'General Butchery Equipment': {
    category: 'Butchery',
    diagnosticProfile: 'BUTCHERY',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Butchery Technician',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Fryer': {
    category: 'Deli',
    diagnosticProfile: 'DELI',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Deli Services',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Grill': {
    category: 'Deli',
    diagnosticProfile: 'DELI',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Deli Services',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Bain Marie': {
    category: 'Deli',
    diagnosticProfile: 'DELI',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Deli Services',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Combi Oven': {
    category: 'Deli',
    diagnosticProfile: 'DELI',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Deli Services',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'General Deli Equipment': {
    category: 'Deli',
    diagnosticProfile: 'DELI',
    criticality: 'Important',
    requiresPower: true,
    provider: 'Deli Services',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Sealer': {
    category: 'Fruit & Veg',
    diagnosticProfile: 'FV',
    criticality: 'Routine',
    requiresPower: true,
    provider: 'F&V Team',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Wrapper': {
    category: 'Fruit & Veg',
    diagnosticProfile: 'FV',
    criticality: 'Routine',
    requiresPower: true,
    provider: 'F&V Team',
    foodSafety: true,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Aircon Unit': {
    category: 'HVAC',
    diagnosticProfile: 'HVAC',
    criticality: 'Important',
    requiresPower: true,
    provider: 'HVAC Contractor',
    foodSafety: false,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'General HVAC': {
    category: 'HVAC',
    diagnosticProfile: 'HVAC',
    criticality: 'Important',
    requiresPower: true,
    provider: 'HVAC Contractor',
    foodSafety: false,
    powerPath: 'B',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Fire Extinguisher': {
    category: 'Fire Safety',
    diagnosticProfile: 'FIRE',
    criticality: 'Critical',
    requiresPower: false,
    provider: 'Fire Services',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Smoke Detector': {
    category: 'Fire Safety',
    diagnosticProfile: 'FIRE',
    criticality: 'Critical',
    requiresPower: true,
    provider: 'Fire Services',
    foodSafety: false,
    powerPath: 'D',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Fire Door': {
    category: 'Fire Safety',
    diagnosticProfile: 'FIRE',
    criticality: 'Critical',
    requiresPower: false,
    provider: 'Fire Services',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Hose Reel': {
    category: 'Fire Safety',
    diagnosticProfile: 'FIRE',
    criticality: 'Critical',
    requiresPower: false,
    provider: 'Fire Services',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Fire Panel / Alarm': {
    category: 'Fire Safety',
    diagnosticProfile: 'FIRE',
    criticality: 'Critical',
    requiresPower: true,
    provider: 'Fire Services',
    foodSafety: false,
    powerPath: 'D',
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Rodent Activity': {
    category: 'Pest & Hygiene',
    diagnosticProfile: 'PEST',
    criticality: 'Important',
    requiresPower: false,
    provider: 'Pest Contractor',
    foodSafety: true,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Insect Infestation': {
    category: 'Pest & Hygiene',
    diagnosticProfile: 'PEST',
    criticality: 'Important',
    requiresPower: false,
    provider: 'Pest Contractor',
    foodSafety: true,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'Hygiene Station': {
    category: 'Pest & Hygiene',
    diagnosticProfile: 'PEST',
    criticality: 'Routine',
    requiresPower: false,
    provider: 'Pest Contractor',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'General Pest': {
    category: 'Pest & Hygiene',
    diagnosticProfile: 'PEST',
    criticality: 'Routine',
    requiresPower: false,
    provider: 'Pest Contractor',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  },
  'General Equipment / Other': {
    category: 'General',
    diagnosticProfile: 'GENERAL',
    criticality: 'Routine',
    requiresPower: false,
    provider: 'FM Manager',
    foodSafety: false,
    sla: { emergency: 1, urgent: 4, high: 24, routine: null }
  }
};

const CATEGORY_EQUIPMENT = {
  'Refrigeration':    ['Upright Fridge','Cold Room','Freezer Room','Island Freezer','Serve Over'],
  'Electrical':       ['Lighting','Plug Points / Sockets','DB Board / Switches'],
  'Backup Power':     ['Generator','UPS'],
  'Plumbing':         ['Burst Pipe','Blocked Drain','Geyser / Water Heater','General Plumbing'],
  'Building & Civil': ['Roof Leak','Floor / Tiling','Door / Lock','General Building'],
  'Trolleys':         ['Customer Trolley','Basket / Pallet Jack / Flatbed'],
  'Bakery':           ['Bakery Oven','Dough Divider','Dough Mixer','General Bakery Equipment'],
  'Butchery':         ['Bandsaw','Mincer','Vacuum Machine','Slicer','General Butchery Equipment'],
  'Deli':             ['Fryer','Grill','Bain Marie','Combi Oven','General Deli Equipment'],
  'Fruit & Veg':      ['Sealer','Wrapper'],
  'HVAC':             ['Aircon Unit','General HVAC'],
  'Fire Safety':      ['Fire Extinguisher','Smoke Detector','Fire Door','Hose Reel','Fire Panel / Alarm'],
  'Pest & Hygiene':   ['Rodent Activity','Insect Infestation','Hygiene Station','General Pest'],
  'General':          ['General Equipment / Other'],
};

// ─────────────────────────────────────────────────────────────────────────────
// EMERGENCY DETECTION
// ─────────────────────────────────────────────────────────────────────────────
const EMERGENCY_TRIGGERS = [
  'fire', 'flames', 'burning', 'smoke',
  'flooding', 'flood', 'water pouring',
  'sparking', 'sparks', 'electrical spark',
  'exposed wire', 'exposed wiring', 'live wire',
  'gas leak', 'smell gas',
  'structural collapse', 'ceiling falling', 'wall collapse',
  'person injured', 'staff injured', 'customer injured',
  'emergency', 'evacuate',
];

function detectEmergency(text = '') {
  const lower = text.toLowerCase();
  return EMERGENCY_TRIGGERS.some(t => lower.includes(t));
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 9 — PRIORITY ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function calculatePriority(state) {
  const { safetyRisk, emergencyType, foodSafetyRisk, operationalImpact, assetProfile, faultType } = state;

  // Priority 1 — Emergency
  if (
    safetyRisk?.includes('at risk') ||
    (emergencyType && emergencyType !== 'None') ||
    (foodSafetyRisk?.coldChainCompromised === true) ||
    operationalImpact === 'Trading Stopped' ||
    operationalImpact === 'Store Wide Impact'
  ) return { level: 1, label: 'Emergency', sla: '1 Hour', colour: '#E53935' };

  // Priority 2 — Urgent
  if (
    assetProfile?.criticality === 'Critical' ||
    operationalImpact === 'Multiple Departments Impacted' ||
    faultType === 'No Power' ||
    (foodSafetyRisk?.productAboveTemp === true)
  ) return { level: 2, label: 'Urgent', sla: '4 Hours', colour: '#F7B731' };

  // Priority 3 — High
  if (
    operationalImpact === 'Department Impact' ||
    assetProfile?.criticality === 'Important'
  ) return { level: 3, label: 'High', sla: '24 Hours', colour: '#028090' };

  // Priority 4 — Routine
  return { level: 4, label: 'Routine', sla: 'Next Available Slot', colour: '#1DB954' };
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 6 — CATEGORY DIAGNOSTIC ENGINE
// ─────────────────────────────────────────────────────────────────────────────
const DIAGNOSTIC_QUESTIONS = {

  REFRIG_UPRIGHT: [
    { id: 'R_TEMP',    text: 'What is the current temperature reading on the display?', type: 'number' },
    { id: 'R_ALARM',   text: 'Is there an active alarm or warning on the unit?',         type: 'options', options: ['Yes','No'] },
    { id: 'R_VENT',    text: 'Is there airflow blowing from the vents at eye level?',    type: 'options', options: ['Yes','No'] },
    { id: 'R_BASEFAN', text: 'How many base fans underneath the unit are spinning?',     type: 'options', options: ['All spinning','Some spinning — enter count','None spinning'] },
    { id: 'R_FANCOUNT',text: 'How many fans are spinning out of the total installed?',  type: 'text',    conditional: (d) => d.R_BASEFAN === 'Some spinning — enter count' },
    { id: 'R_WATER',   text: 'Is there stagnant water visible near the base fans?',     type: 'options', options: ['Yes','No'] },
    { id: 'R_DAMAGE',  text: 'Is there visible damage at the base — broken fan or burnt motor smell?', type: 'options', options: ['Yes — describe','No'] },
    { id: 'R_DOORSEAL',text: 'Are the door seals closing and sealing correctly?',       type: 'options', options: ['Yes','No — damaged','No — not closing fully'] },
    { id: 'R_PRODTEMP',text: 'Is product temperature acceptable?',                      type: 'options', options: ['Yes','No — product warm','Unknown'] },
    { id: 'R_AHT',     text: 'Is this an AHT Freor unit?',                              type: 'options', options: ['Yes','No'] },
    { id: 'R_AHTFAN',  text: 'Are the fans on top of the AHT Freor unit spinning?',    type: 'options', options: ['Yes','No'], conditional: (d) => d.R_AHT === 'Yes' },
  ],

  REFRIG_COLDROOM: [
    { id: 'C_TEMP',    text: 'What is the current temperature reading on the display?', type: 'number' },
    { id: 'C_ALARM',   text: 'Is there an active alarm or warning on the unit?',         type: 'options', options: ['Yes','No'] },
    { id: 'C_FANS',    text: 'Are the blower fans inside the cold room spinning?',       type: 'options', options: ['All spinning','Some spinning','None spinning'] },
    { id: 'C_FANCOUNT',text: 'How many fans are spinning out of the total installed? (e.g. 2 of 4)', type: 'text', conditional: (d) => d.C_FANS === 'Some spinning' },
    { id: 'C_ICE',     text: 'Is there ice build-up on the blower unit?',               type: 'options', options: ['Yes — front','Yes — back','Yes — both','No'] },
    { id: 'C_DOOR',    text: 'Are the cold room door seals intact and closing properly?', type: 'options', options: ['Yes','No — damaged','No — not closing'] },
    { id: 'C_COMP',    text: 'Is the compressor fan spinning on the exterior unit?',    type: 'options', options: ['Yes','No','Not visible'] },
    { id: 'C_PRODTEMP',text: 'Is product temperature acceptable?',                      type: 'options', options: ['Yes','No — product warm','Unknown'] },
    { id: 'C_FOODRISK',text: 'Is stock at risk due to this fault?',                     type: 'options', options: ['Yes','No','Unknown'] },
  ],

  REFRIG_FREEZER: [
    { id: 'F_TEMP',    text: 'What is the current temperature reading on the display?', type: 'number' },
    { id: 'F_ALARM',   text: 'Is there an active alarm or warning on the unit?',         type: 'options', options: ['Yes','No'] },
    { id: 'F_FANS',    text: 'Are the blower fans inside the freezer room spinning?',   type: 'options', options: ['All spinning','Some spinning','None spinning'] },
    { id: 'F_FANCOUNT',text: 'How many fans are spinning out of the total installed? (e.g. 1 of 3)', type: 'text', conditional: (d) => d.F_FANS === 'Some spinning' },
    { id: 'F_ICE',     text: 'Is there ice build-up on the blower unit?',               type: 'options', options: ['Yes — front','Yes — back','Yes — both','No'] },
    { id: 'F_DOOR',    text: 'Are the freezer room door seals intact and closing properly?', type: 'options', options: ['Yes','No — damaged','No — not closing'] },
    { id: 'F_COMP',    text: 'Is the compressor fan spinning on the exterior unit?',    type: 'options', options: ['Yes','No','Not visible'] },
    { id: 'F_PRODTEMP',text: 'Is frozen stock at risk due to this fault?',              type: 'options', options: ['Yes','No','Unknown'] },
  ],

  REFRIG_ISLAND: [
    { id: 'I_TEMP',    text: 'What is the current temperature reading on the display?', type: 'number' },
    { id: 'I_ALARM',   text: 'Is there an active alarm or warning on the unit?',         type: 'options', options: ['Yes','No'] },
    { id: 'I_FANS',    text: 'Are the interior fans inside the island unit spinning?',  type: 'options', options: ['All spinning','Some spinning — enter count','None spinning'] },
    { id: 'I_FANCOUNT',text: 'How many fans are spinning out of the total?',            type: 'text',    conditional: (d) => d.I_FANS === 'Some spinning — enter count' },
    { id: 'I_ICE',     text: 'Is there ice build-up on the interior evaporator?',       type: 'options', options: ['Yes','No'] },
    { id: 'I_COMP',    text: 'Is the compressor fan spinning on the exterior or base unit?', type: 'options', options: ['Yes','No','Not visible'] },
    { id: 'I_FOODRISK',text: 'Is frozen stock at risk due to this fault?',              type: 'options', options: ['Yes','No','Unknown'] },
  ],

  REFRIG_SERVEOVER: [
    { id: 'S_TEMP',    text: 'What is the current temperature reading on the display?', type: 'number' },
    { id: 'S_ALARM',   text: 'Is there an active alarm or warning on the unit?',         type: 'options', options: ['Yes','No'] },
    { id: 'S_FANS',    text: 'Are the interior fans inside the serve-over spinning?',   type: 'options', options: ['All spinning','Some spinning — enter count','None spinning'] },
    { id: 'S_FANCOUNT',text: 'How many fans are spinning out of the total?',            type: 'text',    conditional: (d) => d.S_FANS === 'Some spinning — enter count' },
    { id: 'S_ICE',     text: 'Is there ice build-up on any internal surface?',          type: 'options', options: ['Yes — describe location','No'] },
    { id: 'S_COMP',    text: 'Is the compressor fan spinning on the exterior or base unit?', type: 'options', options: ['Yes','No','Not visible'] },
    { id: 'S_FOODRISK',text: 'Is chilled product at risk due to this fault?',           type: 'options', options: ['Yes','No','Unknown'] },
  ],

  ELECTRICAL_LIGHTING: [
    { id: 'EL_AREA',   text: 'Which area or circuit is affected?', type: 'text' },
    { id: 'EL_BREAK',  text: 'Is the circuit breaker at the DB board tripped for this area?', type: 'options', options: ['Yes — tripped','No — all breakers on','Not checked'] },
    { id: 'EL_DAMAGE', text: 'Is there visible damage to fittings, wiring, or the light itself?', type: 'options', options: ['Yes — describe','No'] },
    { id: 'EL_FLICKER',text: 'Are the lights flickering or intermittently cutting out?', type: 'options', options: ['Yes','No'] },
    { id: 'EL_SMELL',  text: 'Is there a burning smell from any fitting?',               type: 'options', options: ['Yes — EMERGENCY','No'] },
  ],

  ELECTRICAL_SOCKETS: [
    { id: 'ES_AREA',   text: 'Which socket or area is affected?', type: 'text' },
    { id: 'ES_BREAK',  text: 'Is the circuit breaker at the DB board tripped?', type: 'options', options: ['Yes — tripped','No','Not checked'] },
    { id: 'ES_DAMAGE', text: 'Is there visible damage to the socket — burn marks, cracks, or exposed parts?', type: 'options', options: ['Yes — describe','No'] },
    { id: 'ES_SPARK',  text: 'Is the socket sparking?',           type: 'options', options: ['Yes — EMERGENCY','No'] },
    { id: 'ES_SMELL',  text: 'Is there a burning smell from this socket?', type: 'options', options: ['Yes — EMERGENCY','No'] },
  ],

  ELECTRICAL_DB: [
    { id: 'ED_TRIPPED',text: 'Is a breaker at the DB board tripped or off?',            type: 'options', options: ['Yes','No','Multiple breakers tripped'] },
    { id: 'ED_CIRCUIT',text: 'Which circuit or label is the tripped breaker for?',     type: 'text' },
    { id: 'ED_DAMAGE', text: 'Is there visible damage inside the DB board — burn marks, scorch, or exposed wiring?', type: 'options', options: ['Yes — EMERGENCY','No'] },
    { id: 'ED_SPARK',  text: 'Is there any sparking or arcing visible at the board?',  type: 'options', options: ['Yes — EMERGENCY','No'] },
    { id: 'ED_SMELL',  text: 'Is there a burning smell from the DB board area?',        type: 'options', options: ['Yes — EMERGENCY','No'] },
  ],

  BACKUP_GENERATOR: [
    { id: 'G_START',   text: 'Is the generator starting and running?',                  type: 'options', options: ['Yes — running normally','No — will not start','Starts then shuts down'] },
    { id: 'G_FUEL',    text: 'What is the current fuel level?',                          type: 'options', options: ['Full','Three quarter','Half','Low','Empty — refuel immediately'] },
    { id: 'G_BATTERY', text: 'Is the battery charged and all connections secure?',      type: 'options', options: ['Yes','No — battery low','No — loose connection visible','Unknown'] },
    { id: 'G_ERRORS',  text: 'Are there error codes or warning lights on the display?', type: 'options', options: ['Yes — describe code','No'] },
    { id: 'G_OUTPUT',  text: 'Is the output power stable when the generator is running?', type: 'options', options: ['Yes','No — fluctuating','Not reaching connected equipment'] },
    { id: 'G_LEAK',    text: 'Is there a visible oil, fuel, or coolant leak?',           type: 'options', options: ['Yes','No'] },
    { id: 'G_TRANSFER',text: 'Is the automatic transfer switch (changeover) activating correctly during a power cut?', type: 'options', options: ['Yes','No','Not tested'] },
  ],

  BACKUP_UPS: [
    { id: 'U_STATUS',  text: 'What is the UPS status indicator showing?',               type: 'options', options: ['Normal — green','Warning — amber','Fault — red','No display'] },
    { id: 'U_BATTERY', text: 'Is the battery charged and healthy?',                     type: 'options', options: ['Yes','No — low','Unknown'] },
    { id: 'U_OUTPUT',  text: 'Is the UPS providing stable output power?',               type: 'options', options: ['Yes','No — dropping','Not powering equipment'] },
    { id: 'U_ERRORS',  text: 'Are there any alarm beeps or error codes?',               type: 'options', options: ['Yes — describe','No'] },
  ],

  PLUMBING_GENERAL: [
    { id: 'P_TYPE',    text: 'What is the plumbing fault?',                              type: 'options', options: ['Burst pipe','Active leak','Blocked drain','Geyser / water heater fault','Low water pressure','Valve failure','Sewage backup','Borehole / pump fault','Other'] },
    { id: 'P_ACTIVE',  text: 'Is there active water flow causing immediate damage or a safety risk?', type: 'options', options: ['Yes — water isolated already','Yes — water NOT yet isolated','No'] },
    { id: 'P_SEVERITY',text: 'How severe is the leak?',                                 type: 'options', options: ['Drip','Steady flow','Heavy flow','Burst — major flow'] },
    { id: 'P_LOCATION',text: 'What is the exact location of the fault?',               type: 'text' },
    { id: 'P_DAMAGE',  text: 'Has the water caused damage to property, stock, or electrical equipment?', type: 'options', options: ['Yes','No','Unknown'] },
  ],

  BUILDING_GENERAL: [
    { id: 'BC_TYPE',   text: 'What type of defect is this?',                            type: 'options', options: ['Roof leak','Ceiling damage','Wall crack','Floor / tiling','Door or lock fault','Window damage','Paving','Perimeter fence','Access control','Signage','Other'] },
    { id: 'BC_SAFETY', text: 'Is this defect a safety risk to staff or customers?',    type: 'options', options: ['Yes — immediate risk','Yes — potential risk','No'] },
    { id: 'BC_EXTENT', text: 'How extensive is the damage?',                            type: 'options', options: ['Minor — small area','Moderate — contained','Significant — large area','Severe'] },
    { id: 'BC_DURATION',text: 'How long has this defect been present?',                type: 'options', options: ['Noticed today','This week','More than a week','Unknown'] },
    { id: 'BC_WEATHER',text: 'Is this damage weather-related?',                         type: 'options', options: ['Yes','No','Unknown'] },
  ],

  TROLLEY: [
    { id: 'T_FAULT',   text: 'What is the primary fault? Select all that apply.',               type: 'options', options: ['Wheels not rolling smoothly','Wheel missing or broken','Handle broken or loose','Ear supports missing or broken','Structural damage'] },
    { id: 'T_COUNT',   text: 'How many units are affected?',                            type: 'options', options: ['1','2 to 5','More than 5'] },
    { id: 'T_HANDLES', text: 'Are loose handles being stored for refitment — NOT discarded?', type: 'options', options: ['Yes — stored correctly','No — will action immediately','No handles involved'] },
  ],

  BAKERY: [
    { id: 'B_MOVING',  text: 'Are the moving parts of the equipment operating?',        type: 'options', options: ['Yes','No'] },
    { id: 'B_FEED',    text: 'Is the product feeding or loading correctly into the machine?', type: 'options', options: ['Yes','No','Not applicable'] },
    { id: 'B_OUTPUT',  text: 'Is the output consistent and within expected quality?',   type: 'options', options: ['Yes','Inconsistent','No output'] },
    { id: 'B_JAM',     text: 'Is there a jam, resistance, or overload indication?',     type: 'options', options: ['Yes — describe','No'] },
    { id: 'B_OVENTEMP',text: 'Is the oven reaching and holding the set temperature?',  type: 'options', options: ['Yes','No','Partial','Not applicable'] },
    { id: 'B_OVENFAN', text: 'Is the oven fan rotating during operation?',              type: 'options', options: ['Yes','No','Not applicable'] },
    { id: 'B_HEATING', text: 'Is the heating element or burner active?',                type: 'options', options: ['Yes','No'] },
  ],

  BUTCHERY: [
    { id: 'BU_GUARDS', text: 'Are all safety covers and blade guards in place and engaged?', type: 'options', options: ['Yes — all in place','No — specify which is missing'] },
    { id: 'BU_BLADES', text: 'Are the blades or cutting mechanisms moving?',            type: 'options', options: ['Yes','No','Intermittently'] },
    { id: 'BU_QUALITY',text: 'Is the cutting or mincing output of acceptable quality?', type: 'options', options: ['Yes','Poor — inconsistent','No output'] },
    { id: 'BU_BLOCK',  text: 'Is there a blockage or product jam in the machine?',     type: 'options', options: ['Yes','No'] },
    { id: 'BU_MOTOR',  text: 'Is there audible motor strain or unusual load sound?',   type: 'options', options: ['Yes','No'] },
    { id: 'BU_VACUUM', text: 'Is the vacuum sealing and suction functioning?',          type: 'options', options: ['Yes','Partial — weak suction','No','Not applicable'] },
  ],

  DELI: [
    { id: 'D_HEATING', text: 'Is the heating element or gas burner active and producing heat?', type: 'options', options: ['Yes','No'] },
    { id: 'D_TEMP',    text: 'Is the temperature stable and reaching the set point?',   type: 'options', options: ['Yes','No — not reaching target','Fluctuating'] },
    { id: 'D_GAS',     text: 'Is gas ignition working?',                                type: 'options', options: ['Yes','No','Not applicable — electric unit'] },
    { id: 'D_OIL',     text: 'Is the fryer oil heating correctly?',                     type: 'options', options: ['Yes','No','Not applicable'] },
    { id: 'D_DISPLAY', text: 'Is the cold display counter cooling?',                    type: 'options', options: ['Yes','No','Not applicable'] },
    { id: 'D_FANS',    text: 'Are the internal circulation fans operating?',             type: 'options', options: ['Yes','No','Not applicable'] },
  ],

  FV: [
    { id: 'FV_DISPLAY',text: 'Are the display lights and controls activating on power-up?', type: 'options', options: ['Yes','No'] },
    { id: 'FV_TEFLON', text: 'Is the Teflon strip affixed and undamaged — not burnt or peeling?', type: 'options', options: ['Yes — intact','No — burnt','No — missing or peeling'] },
    { id: 'FV_HINGE',  text: 'Is the hinge mechanism intact and operating smoothly?',   type: 'options', options: ['Yes','No — broken','Stiff'] },
    { id: 'FV_WIRE',   text: 'Is the heating wire exposed or visible outside its housing?', type: 'options', options: ['No — safe','Yes — EMERGENCY STOP — do not operate'] },
    { id: 'FV_DIALS',  text: 'Are the temperature dials or controls responding?',       type: 'options', options: ['Yes','No'] },
    { id: 'FV_DROPPED',text: 'Was the unit recently dropped or knocked?',               type: 'options', options: ['Yes','No','Unknown'] },
    { id: 'FV_SEAL',   text: 'Is the seal forming correctly on the product?',           type: 'options', options: ['Yes','No — not bonding','Partial seal only'] },
  ],

  HVAC: [
    { id: 'H_AIRFLOW', text: 'Is the unit producing airflow?',                          type: 'options', options: ['Yes','No'] },
    { id: 'H_TEMP',    text: 'Is the air reaching the set temperature — cooling or heating?', type: 'options', options: ['Yes','No','Partially'] },
    { id: 'H_DRIP',    text: 'Is there water dripping or leaking from the unit?',       type: 'options', options: ['Yes','No'] },
    { id: 'H_NOISE',   text: 'Is there unusual noise from the indoor or outdoor unit?', type: 'options', options: ['Yes — describe','No'] },
    { id: 'H_AREA',    text: 'Which area does this unit serve?',                         type: 'text' },
  ],

  FIRE: [
    { id: 'FS_TYPE',   text: 'What is the fire safety fault?',                          type: 'options', options: ['Extinguisher expired','Extinguisher missing','Smoke detector fault','Sprinkler issue','Fire door damaged','Hose reel fault','Emergency exit blocked','Panel or alarm fault'] },
    { id: 'FS_ACTIVE', text: 'Is there an active fire or immediate emergency?',         type: 'options', options: ['Yes — evacuate and call 10111 immediately','No'] },
    { id: 'FS_COMPLY', text: 'What is the compliance status of this asset?',            type: 'options', options: ['In date','Overdue','Unknown'] },
    { id: 'FS_TAGOUT', text: 'Is the affected asset tagged and out of service pending repair?', type: 'options', options: ['Yes — tagged out','No — will action now'] },
    { id: 'FS_COVER',  text: 'Is alternative protection in place while this asset is out of service?', type: 'options', options: ['Yes','No','Arranging now'] },
  ],

  PEST: [
    { id: 'PEST_TYPE', text: 'What is the issue?', type: 'options', options: ['Rodent sighting', 'Insect activity', 'Sanitizer station empty', 'Deep clean required', 'Other'] },
    { id: 'PEST_AREA', text: 'Is this in a food-prep area?', type: 'options', options: ['Yes','No'] },
    { id: 'PEST_RISK', text: 'Is there an immediate health risk?', type: 'options', options: ['Yes','No'] },
  ],

  GENERAL: [
    { id: 'GEN_DESC', text: 'Please describe the fault in detail.', type: 'text' }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 7 — FOOD SAFETY
// ─────────────────────────────────────────────────────────────────────────────
const FOOD_SAFETY_QUESTIONS = [
  { id: 'FS_COLDCHAIN',  text: 'Has the cold chain been compromised?',                  type: 'options', options: ['Yes','No','Unknown'] },
  { id: 'FS_PRODTEMP',   text: 'Is product above the safe storage temperature?',        type: 'options', options: ['Yes','No','Unknown'] },
  { id: 'FS_CONTAM',     text: 'Is there a risk of contamination?',                     type: 'options', options: ['Yes','No','Unknown'] },
  { id: 'FS_PRODUCTION', text: 'Has production stopped due to this fault?',             type: 'options', options: ['Yes','No'] },
  { id: 'FS_STOCK',      text: 'Is stock at risk of spoilage or disposal?',             type: 'options', options: ['Yes','No','Unknown'] },
];

const PHASES = {
  IDENTIFICATION: 'IDENTIFICATION',
  POWER_CHECK: 'POWER_CHECK',
  POWER_SUBPATH: 'POWER_SUBPATH',
  UNIVERSAL_ENGINE: 'UNIVERSAL_ENGINE',
  CATEGORY_DIAGNOSTIC: 'CATEGORY_DIAGNOSTIC',
  FOOD_SAFETY: 'FOOD_SAFETY',
  MEDIA_PRIORITY: 'MEDIA_PRIORITY',
  REPORT_CONFIRM: 'REPORT_CONFIRM',
  COMPLETED: 'COMPLETED'
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function generateTicketId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `FM-${ts}-${rand}`;
}

function determineOutcome(state) {
  const diagValues = Object.values(state.diagnosticResults || {});
  const mechValues = {...(state.mechanicalResults || {})};

  // Power light being ON is good, so exclude from "issue" detection if it is Yes
  delete mechValues["Power Light On"];

  const hasDiagIssue = diagValues.some(v => v === 'No' || v === 'None spinning' || (typeof v === 'string' && (v.startsWith('No') || v.includes('None') || v.includes('not'))));
  const hasMechIssue = Object.values(mechValues).some(v => String(v).toLowerCase().startsWith('yes'));

  if (state.emergencyDetected) return 'Emergency Escalation';
  if (state.powerStatus === 'Electrical fault escalated') return 'Technician Required';
  if (hasDiagIssue || hasMechIssue) return 'Technician Required';
  return 'Monitor';
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENGINE LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function getNextQuestion(session) {
  const state = session.state || { phase: PHASES.IDENTIFICATION, step: 'STORE' };
  session.state = state;
  const data = session.data || {};

  // --- PHASE 1: IDENTIFICATION ---
  if (state.phase === PHASES.IDENTIFICATION) {
    switch (state.step) {
      case 'STORE': return "Please provide your 4-digit Store Code (e.g. 1002).";
      case 'REPORTER': return "What is your full name?";
      case 'CATEGORY':
        let catList = "Please select the equipment category:\n";
        Object.keys(CATEGORY_EQUIPMENT).forEach((name, i) => { catList += `${i + 1}. ${name}\n`; });
        return catList;
      case 'EQUIPMENT':
        const equipList = CATEGORY_EQUIPMENT[data.category] || [];
        let eMsg = `Select the specific equipment for ${data.category}:\n`;
        equipList.forEach((name, i) => { eMsg += `${i + 1}. ${name}\n`; });
        return eMsg;
      case 'LOCATION': return "Where exactly is the unit located? (e.g. Aisle 3, Bakery)";
      case 'BRAND': return "What is the Brand of the equipment? (Type 'N/A' to skip)";
      case 'MODEL': return "What is the Model? (Type 'N/A' to skip)";
      case 'TAG': return "What is the Asset Tag? (Type 'N/A' to skip)";
      case 'SERIAL': return "What is the Serial Number? (Type 'N/A' to skip)";
    }
  }

  // --- PHASE 2: POWER CHECK ---
  if (state.phase === PHASES.POWER_CHECK) {
    return "Is there power to the unit? (Yes / No)";
  }

  if (state.phase === PHASES.POWER_SUBPATH) {
    const ap = data.assetProfile || {};
    const path = ap.powerPath || 'B';
    const subStep = parseInt(state.step);

    if (path === 'A') { // Isolator Path
      if (subStep === 1) return "Switch the isolator OFF. Wait 10 seconds. Switch it back ON. Is there power now? (Yes / No)";
      if (subStep === 2) return "Check the DB board. Is the breaker for this unit tripped? (Yes / No)";
      if (subStep === 3) return "Reset the breaker. Is there power now? (Yes / No)";
    } else if (path === 'B' || path === 'C') { // Plug/Move Path
      if (subStep === 1) return "Test the unit on an alternate plug socket. Is there power? (Yes / No)";
      if (subStep === 2) return "Is the circuit breaker at the DB board tripped? (Yes / No)";
      if (subStep === 3) return "Reset it. Is there power now? (Yes / No)";
    } else { // Default DB Path
      if (subStep === 1) return "Is the circuit breaker for this area tripped? (Yes / No)";
      if (subStep === 2) return "Reset it. Is power restored? (Yes / No)";
    }
    return "Proceeding to diagnostic.";
  }

  // --- PHASE 3: UNIVERSAL ENGINE ---
  if (state.phase === PHASES.UNIVERSAL_ENGINE) {
    switch (state.step) {
      case 'SAFETY': return "Are there any safety risks? (e.g. No risk, Staff at risk, Customers at risk)";
      case 'IMPACT':
        let iMsg = "What is the operational impact?\n";
        ['No Impact', 'Minor Impact', 'Department Impact', 'Multiple Departments', 'Store Wide', 'Trading Stopped'].forEach((opt, i) => { iMsg += `${i+1}. ${opt}\n`; });
        return iMsg;
      case 'FAULT_TYPE':
        let fMsg = "What is the primary fault type?\n";
        ['Not Cooling', 'Not Heating', 'Not Starting', 'Leak', 'Noise', 'Vibration', 'Damage', 'Other'].forEach((opt, i) => { fMsg += `${i+1}. ${opt}\n`; });
        return fMsg;
      // Mechanical Yes/No questions (1 by 1)
      case 'MECH_POWER_LIGHT': return "Is the unit's power light on? (Yes / No / N/A)";
      case 'MECH_DISPLAY_ERR': return "Is there an error code on the display? (Yes - provide code / No / N/A)";
      case 'MECH_NOISE': return "Is there any unusual noise? (Yes / No)";
      case 'MECH_JAM': return "Is there a jam or blockage? (Yes / No)";
      case 'MECH_LEAK': return "Is there a visible leak? (Yes / No)";
      case 'MECH_VIB': return "Is there excess vibration? (Yes / No)";
      case 'MECH_BURN': return "Is there a burning smell? (Yes / No)";
      case 'MECH_DMG': return "Is there visible damage or broken parts? (Yes / No)";
    }
  }

  // --- PHASE 4: CATEGORY DIAGNOSTIC ---
  if (state.phase === PHASES.CATEGORY_DIAGNOSTIC) {
    const profile = data.assetProfile?.diagnosticProfile;
    const questions = DIAGNOSTIC_QUESTIONS[profile] || [];
    const qIndex = parseInt(state.step);
    if (questions[qIndex]) {
      const q = questions[qIndex];
      let msg = q.text;
      if (q.options) {
        msg += "\n" + q.options.map((o, i) => `${i+1}. ${o}`).join('\n');
      }
      return msg;
    }
  }

  // --- PHASE 5: FOOD SAFETY ---
  if (state.phase === PHASES.FOOD_SAFETY) {
    const qIndex = parseInt(state.step);
    const q = FOOD_SAFETY_QUESTIONS[qIndex];
    return q.text + "\n1. Yes\n2. No\n3. Unknown";
  }

  // --- PHASE 6: MEDIA & PRIORITY ---
  if (state.phase === PHASES.MEDIA_PRIORITY) {
    if (state.step === 'PHOTO') return "Can you take a photo/video? Send it via WhatsApp if possible. (Yes - sending / No)";
    if (state.step === 'PRIORITY') {
      const p = calculatePriority(data);
      return `Calculated Priority: ${p.label} (SLA: ${p.sla}). Is this acceptable? (Yes / No)`;
    }
    if (state.step === 'PRIORITY_REASON') return "Please provide the reason why the calculated priority is not acceptable:";
  }

  // --- PHASE 7: REPORT CONFIRM ---
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

  // Global Emergency Override
  // If an emergency is detected, we set the flag and priority but CONTINUE.
  if (detectEmergency(text)) {
    data.emergencyDetected = true;
    data.emergencyType = (data.emergencyType && data.emergencyType !== 'None') ? `${data.emergencyType}, ${text}` : text;
    data.safetyRisk = 'Emergency Triggered';
    data.priority = calculatePriority(data);
  }

  // --- PHASE 1: IDENTIFICATION ---
  if (state.phase === PHASES.IDENTIFICATION) {
    if (state.step === 'STORE') {
      const storeName = STORES[text];
      if (storeName) {
        data.store = `${text} Checksave ${storeName}`;
        state.step = 'REPORTER';
      } else {
        return "Invalid store code. Please retry with a valid 4-digit Checksave store code.";
      }
    }
    else if (state.step === 'REPORTER') { data.reporter = text; state.step = 'CATEGORY'; }
    else if (state.step === 'CATEGORY') {
      const cats = Object.keys(CATEGORY_EQUIPMENT);
      const idx = parseInt(text) - 1;
      const selected = cats[idx] || cats.find(c => c.toLowerCase() === lowText);
      if (selected) { data.category = selected; state.step = 'EQUIPMENT'; }
      else return "Invalid category selection.";
    }
    else if (state.step === 'EQUIPMENT') {
      const equips = CATEGORY_EQUIPMENT[data.category];
      const idx = parseInt(text) - 1;
      const selected = equips[idx] || equips.find(e => e.toLowerCase() === lowText);
      if (selected) {
        data.equipment = selected;
        data.assetProfile = ASSET_PROFILES[selected];
        state.step = 'LOCATION';
      }
      else return "Invalid equipment selection.";
    }
    else if (state.step === 'LOCATION') { data.equipmentLocation = text; state.step = 'BRAND'; }
    else if (state.step === 'BRAND') { data.brand = text; state.step = 'MODEL'; }
    else if (state.step === 'MODEL') { data.model = text; state.step = 'TAG'; }
    else if (state.step === 'TAG') { data.assetTag = text; state.step = 'SERIAL'; }
    else if (state.step === 'SERIAL') {
      data.serialNumber = text;
      if (data.assetProfile?.requiresPower) {
        state.phase = PHASES.POWER_CHECK;
        state.step = 1;
      } else {
        state.phase = PHASES.UNIVERSAL_ENGINE;
        state.step = 'SAFETY';
      }
    }
  }

  // --- PHASE 2: POWER CHECK ---
  else if (state.phase === PHASES.POWER_CHECK) {
    if (lowText.includes('yes')) {
      data.powerStatus = 'Confirmed';
      state.phase = PHASES.UNIVERSAL_ENGINE;
      state.step = 'SAFETY';
    } else {
      data.powerStatus = 'No Power';
      state.phase = PHASES.POWER_SUBPATH;
      state.step = 1;
    }
  }

  else if (state.phase === PHASES.POWER_SUBPATH) {
    if (lowText.includes('yes')) {
      data.powerStatus = 'Restored';
      state.phase = PHASES.UNIVERSAL_ENGINE;
      state.step = 'SAFETY';
    } else {
      state.step = parseInt(state.step) + 1;
      const path = data.assetProfile?.powerPath || 'B';
      const max = (path === 'A' || path === 'B' || path === 'C') ? 3 : 2;
      if (state.step > max) {
        data.powerStatus = 'Electrical fault escalated';
        state.phase = PHASES.UNIVERSAL_ENGINE;
        state.step = 'SAFETY';
      }
    }
  }

  // --- PHASE 3: UNIVERSAL ENGINE ---
  else if (state.phase === PHASES.UNIVERSAL_ENGINE) {
    if (!data.mechanicalResults) data.mechanicalResults = {};
    if (state.step === 'SAFETY') { data.safetyRisk = text; state.step = 'IMPACT'; }
    else if (state.step === 'IMPACT') {
      const opts = ['No Impact', 'Minor Impact', 'Department Impact', 'Multiple Departments', 'Store Wide', 'Trading Stopped'];
      data.operationalImpact = opts[parseInt(text)-1] || text;
      state.step = 'FAULT_TYPE';
    }
    else if (state.step === 'FAULT_TYPE') {
      const opts = ['Not Cooling', 'Not Heating', 'Not Starting', 'Leak', 'Noise', 'Vibration', 'Damage', 'Other'];
      data.faultType = opts[parseInt(text)-1] || text;
      state.step = 'MECH_POWER_LIGHT';
    }
    else if (state.step === 'MECH_POWER_LIGHT') { data.mechanicalResults["Power Light On"] = text; state.step = 'MECH_DISPLAY_ERR'; }
    else if (state.step === 'MECH_DISPLAY_ERR') { data.mechanicalResults["Display Error"] = text; state.step = 'MECH_NOISE'; }
    else if (state.step === 'MECH_NOISE') { data.mechanicalResults["Unusual Noise"] = text; state.step = 'MECH_JAM'; }
    else if (state.step === 'MECH_JAM') { data.mechanicalResults["Jam/Blockage"] = text; state.step = 'MECH_LEAK'; }
    else if (state.step === 'MECH_LEAK') { data.mechanicalResults["Visible Leak"] = text; state.step = 'MECH_VIB'; }
    else if (state.step === 'MECH_VIB') { data.mechanicalResults["Excess Vibration"] = text; state.step = 'MECH_BURN'; }
    else if (state.step === 'MECH_BURN') {
      data.mechanicalResults["Burning Smell"] = text;
      if (lowText.includes('yes')) {
         data.emergencyDetected = true;
         data.emergencyType = (data.emergencyType && data.emergencyType !== 'None') ? `${data.emergencyType}, Burning Smell` : 'Burning Smell';
         data.priority = calculatePriority(data);
      }
      state.step = 'MECH_DMG';
    }
    else if (state.step === 'MECH_DMG') {
      data.mechanicalResults["Visible Damage"] = text;
      state.phase = PHASES.CATEGORY_DIAGNOSTIC;
      state.step = 0;
    }
  }

  // --- PHASE 4: CATEGORY DIAGNOSTIC ---
  else if (state.phase === PHASES.CATEGORY_DIAGNOSTIC) {
    if (!data.diagnosticResults) data.diagnosticResults = {};
    if (!data.diagnosticRaw) data.diagnosticRaw = {}; // For conditionals using IDs

    const questions = DIAGNOSTIC_QUESTIONS[data.assetProfile?.diagnosticProfile] || [];
    let qIdx = parseInt(state.step);

    const q = questions[qIdx];
    if (q) {
      const answer = q.options ? (q.options[parseInt(text)-1] || text) : text;
      data.diagnosticResults[q.text] = answer;
      data.diagnosticRaw[q.id] = answer;
    }

    qIdx++;
    while (qIdx < questions.length && questions[qIdx].conditional && !questions[qIdx].conditional(data.diagnosticRaw)) {
      qIdx++;
    }

    state.step = qIdx;
    if (state.step >= questions.length) {
      if (data.assetProfile?.foodSafety) {
        state.phase = PHASES.FOOD_SAFETY;
        state.step = 0;
      } else {
        state.phase = PHASES.MEDIA_PRIORITY;
        state.step = 'PHOTO';
      }
    }
  }

  // --- PHASE 5: FOOD SAFETY ---
  else if (state.phase === PHASES.FOOD_SAFETY) {
    if (!data.foodSafetyResults) data.foodSafetyResults = {};
    let qIdx = parseInt(state.step);
    const q = FOOD_SAFETY_QUESTIONS[qIdx];

    const ans = ['Yes', 'No', 'Unknown'][parseInt(text)-1] || text;
    data.foodSafetyResults[q.id] = ans;

    // Map to foodSafetyRisk object for priority engine
    if (!data.foodSafetyRisk) data.foodSafetyRisk = {};
    if (q.id === 'FS_COLDCHAIN' && ans === 'Yes') data.foodSafetyRisk.coldChainCompromised = true;
    if (q.id === 'FS_PRODTEMP' && ans === 'Yes') data.foodSafetyRisk.productAboveTemp = true;
    if (q.id === 'FS_STOCK' && ans === 'Yes') data.foodSafetyRisk.stockAtRisk = true;

    qIdx++;
    state.step = qIdx;
    if (state.step >= FOOD_SAFETY_QUESTIONS.length) {
      state.phase = PHASES.MEDIA_PRIORITY;
      state.step = 'PHOTO';
    }
  }

  // --- PHASE 6: MEDIA & PRIORITY ---
  else if (state.phase === PHASES.MEDIA_PRIORITY) {
    if (state.step === 'PHOTO') { data.photoAttached = lowText.includes('yes'); state.step = 'PRIORITY'; }
    else if (state.step === 'PRIORITY') {
      if (lowText.includes('no')) {
        state.step = 'PRIORITY_REASON';
      } else {
        data.priorityAccepted = true;
        data.priority = calculatePriority(data);
        data.outcome = determineOutcome(data);
        state.phase = PHASES.REPORT_CONFIRM;
      }
    }
    else if (state.step === 'PRIORITY_REASON') {
      data.priorityAccepted = false;
      data.priorityRejectionReason = text;
      data.priority = calculatePriority(data);
      data.outcome = determineOutcome(data);
      state.phase = PHASES.REPORT_CONFIRM;
    }
  }

  // --- PHASE 7: REPORT CONFIRM ---
  else if (state.phase === PHASES.REPORT_CONFIRM) {
    if (lowText === 'yes') {
      state.phase = PHASES.COMPLETED;
      return "SUCCESS";
    } else if (lowText === 'no') {
      data.userRequestedRestart = true;
      return "RESTART";
    }
  }

  return null;
}

function generateReportText(session) {
  const d = session.data;
  const p = d.priority || calculatePriority(d);
  if (!d.ticketId) d.ticketId = generateTicketId();

  let findings = "";
  if (d.mechanicalResults) {
    findings += Object.entries(d.mechanicalResults)
      .filter(([k, v]) => v.toLowerCase().includes('yes'))
      .map(([k, v]) => `• ${k}`)
      .join('\n');
  }
  if (d.diagnosticResults) {
    if (findings) findings += "\n";
    findings += Object.entries(d.diagnosticResults)
      .map(([k, v]) => `• ${k}: ${v}`)
      .join('\n');
  }

  return `━━━ FM FAULT REPORT #${d.ticketId} ━━━
📍 Store:      ${d.store}
👤 Reporter:   ${d.reporter}
🔧 Asset:      ${d.equipment} (${d.category})
🏷️ Details:    ${d.brand} | ${d.model} | Tag: ${d.assetTag || d.tag}
🔖 S/N:        ${d.serialNumber}
📍 Location:   ${d.equipmentLocation}

⚡ Power:      ${d.powerStatus || 'N/A'}
⚠️ Fault:      ${d.faultType}
⚙️ Findings:
${findings || 'No specific findings recorded'}

🔴 Priority:   ${p.label} (${p.sla})
👷 Tech:       ${determineOutcome(d)}
━━━━━━━━━━━━━━━━━━━━━━━━`;
}

async function saveTicketToSupabase(session) {
  if (!supabase) return;
  const d = session.data;
  const p = d.priority || calculatePriority(d);
  const outcome = determineOutcome(d);

  const report = {
    ticket_id: d.ticketId,
    store: d.store,
    reporter: d.reporter,
    category: d.category,
    equipment: d.equipment,
    location: d.equipmentLocation,
    brand: d.brand,
    model: d.model,
    asset_tag: d.assetTag || d.tag,
    serial_number: d.serialNumber,
    criticality: d.assetProfile?.criticality,
    power_status: d.powerStatus,
    fault_type: d.faultType,
    safety_risk: d.safetyRisk,
    emergency_type: d.emergencyType || 'None',
    operational_impact: d.operationalImpact,
    priority: p.label,
    priority_level: p.level,
    sla: p.sla,
    service_provider: d.assetProfile?.provider || 'FM Manager',
    outcome: outcome,
    technician_required: outcome.includes('Technician') || outcome.includes('Emergency'),
    photo_attached: d.photoAttached || false,
    status: 'Open'
  };

  try {
    const { error } = await supabase.from('tickets').insert(report);
    if (error) console.error('Supabase save error:', error);

    if (d.diagnosticRaw) {
      const findings = Object.entries(d.diagnosticRaw).map(([k, v]) => ({
        ticket_id: d.ticketId,
        finding_key: k,
        finding_value: String(v)
      }));
      await supabase.from('ticket_findings').insert(findings);
    }

    if (d.foodSafetyResults) {
      await supabase.from('ticket_food_safety').insert({
        ticket_id: d.ticketId,
        cold_chain_compromised: d.foodSafetyResults.FS_COLDCHAIN === 'Yes',
        product_above_temp: d.foodSafetyResults.FS_PRODTEMP === 'Yes',
        contamination_risk: d.foodSafetyResults.FS_CONTAM === 'Yes',
        production_stopped: d.foodSafetyResults.FS_PRODUCTION === 'Yes',
        stock_at_risk: d.foodSafetyResults.FS_STOCK === 'Yes'
      });
    }
  } catch (e) {
    console.error('Failed to save to Supabase:', e);
  }
}

async function getLogicResponse(userId, userMessage, session) {
  if (userMessage.toLowerCase() === 'reset' || userMessage.toLowerCase() === 'restart' || userMessage.toLowerCase() === 'log a fault') {
    session.state = { phase: PHASES.IDENTIFICATION, step: 'STORE' };
    session.data = { ticketId: generateTicketId() };
    return "Good day! I'm FM Assist V2. Let's log your fault.\n\n" + getNextQuestion(session);
  }

  if (!session.state || session.state.phase === PHASES.COMPLETED) {
    session.state = { phase: PHASES.IDENTIFICATION, step: 'STORE' };
    session.data = { ticketId: generateTicketId() };
    return "Good day! Let's get started.\n\n" + getNextQuestion(session);
  }

  const result = handleInput(session, userMessage);

  if (result === "SUCCESS") {
    await saveTicketToSupabase(session);
    const report = generateReportText(session);
    session.state = { phase: PHASES.COMPLETED };
    return "Thank you! Your report has been submitted successfully.\n\n" + report;
  }

  if (result === "RESTART") {
    const reason = session.data?.userRequestedRestart ? "(User requested restart at confirmation)" : "";
    session.state = { phase: PHASES.IDENTIFICATION, step: 'STORE' };
    session.data = { ticketId: generateTicketId(), restartReason: reason };
    return "Okay, opening a new report.\n\n" + getNextQuestion(session);
  }

  if (typeof result === 'string') return result;

  let response = getNextQuestion(session);

  if (session.data?.emergencyDetected) {
    response = "⚠️ EMERGENCY: Please have someone call the Facilities Manager immediately.\n\n" + response;
  }

  return response;
}

module.exports = {
  getLogicResponse,
  PHASES,
  ASSET_PROFILES,
  CATEGORY_EQUIPMENT,
  DIAGNOSTIC_QUESTIONS,
  FOOD_SAFETY_QUESTIONS,
  calculatePriority,
  detectEmergency,
  determineOutcome
};
