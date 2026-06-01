// logic-engine.js
// FM Assist — Deterministic Logic Engine
// This replaces the AI brain with a structured state machine based on the knowledge base.

const CATEGORIES = {
    1: "Refrigeration — Upright fridge",
    2: "Refrigeration — Cold room",
    3: "Refrigeration — Freezer room",
    4: "Refrigeration — Island freezer",
    5: "Refrigeration — Serve over (cold display)",
    6: "Electrical — Lighting",
    7: "Electrical — Plug points / sockets",
    8: "Electrical — Switches / DB board",
    9: "Backup power — Generator / UPS",
    10: "Plumbing",
    11: "Building & Civil — Tiling / fixtures / fittings",
    12: "Building & Civil — Roof / ceiling / structure",
    13: "Trolleys — Customer trolleys",
    14: "Trolleys — Basket / pallet / flatbed",
    15: "Bakery equipment",
    16: "Butchery equipment",
    17: "Deli / Pie shop equipment",
    18: "Fruit & Veg equipment — sealers / wrappers",
    19: "HVAC / Aircon",
    20: "Fire safety equipment",
    21: "Pest & Hygiene",
    22: "General / Other"
};

const DIAGNOSTIC_FLOW = {
    1: [ // Upright fridge
        { q: "What is the current temperature reading on the display?" },
        { q: "Is there airflow blowing from the vents at eye level? (Yes / No)" },
        { q: "How many base fans underneath the unit are spinning? (All / Some / None)" },
        { q: "Is there stagnant water visible near the base fans? (Yes / No)" },
        { q: "Is there visible damage at the base — broken fan or burnt motor smell? (Yes / No)" },
        { q: "Is this an AHT Freor unit? (Yes / No)", id: 'is_aht' },
        { q: "Are the fans on top of the AHT Freor unit spinning? (Yes / No)", skip: (d) => d.is_aht?.toLowerCase().includes('no') }
    ],
    2: [ // Cold room
        { q: "What is the current temperature reading on the display?" },
        { q: "Are the blower fans inside the cold room spinning? (All / Some / None)", id: 'fans' },
        { q: "How many fans are spinning out of the total? (e.g. 2 of 4)", skip: (d) => d.fans?.toLowerCase().includes('all') || d.fans?.toLowerCase().includes('none') },
        { q: "Is there ice build-up on the blower unit? (Front / Back / Both / No)" },
        { q: "Is the compressor fan spinning on the exterior unit outside the building? (Yes / No / Not visible)" }
    ],
    3: [ // Freezer room
        { q: "What is the current temperature reading on the display?" },
        { q: "Are the blower fans inside the freezer room spinning? (All / Some / None)", id: 'fans' },
        { q: "How many fans are spinning out of the total? (e.g. 1 of 3)", skip: (d) => d.fans?.toLowerCase().includes('all') || d.fans?.toLowerCase().includes('none') },
        { q: "Is there ice build-up on the blower unit? (Front / Back / Both / No)" },
        { q: "Is the compressor fan spinning on the exterior unit? (Yes / No / Not visible)" }
    ],
    4: [ // Island freezer
        { q: "What is the current temperature reading on the display?" },
        { q: "Are the interior fans inside the island unit spinning? (All / Some — count / None)" },
        { q: "Is there ice build-up on the interior evaporator? (Yes / No)" },
        { q: "Is the compressor fan spinning on the exterior or base unit? (Yes / No / Not visible)" }
    ],
    5: [ // Serve over
        { q: "What is the current temperature reading on the display?" },
        { q: "Are the interior fans inside the serve-over spinning? (All / Some — count / None)" },
        { q: "Is there ice build-up visible on any internal surface? (Yes — describe / No)" },
        { q: "Is the compressor fan spinning on the exterior or base unit? (Yes / No / Not visible)" }
    ],
    13: [ // Trolleys - Customer
        { q: "What is the fault?\n1. Wheels not rolling smoothly\n2. Wheel missing or broken\n3. Handle broken or loose\n4. Ear supports missing or broken\n5. Structural damage" },
        { q: "How many units are affected? (1 / 2 to 5 / More than 5)" },
        { q: "Are loose handles being stored for refitment — NOT discarded? (Yes / No)" }
    ],
    14: [ // Trolleys - Baskets etc
        { q: "What is the fault?\n1. Wheels not rolling smoothly\n2. Wheel missing or broken\n3. Handle broken or loose\n4. Ear supports missing or broken\n5. Structural damage" },
        { q: "How many units are affected? (1 / 2 to 5 / More than 5)" },
        { q: "Are loose handles being stored for refitment — NOT discarded? (Yes / No)" }
    ],
    15: [ // Bakery
        { q: "Are the moving parts of the equipment operating? (Yes / No)" },
        { q: "Is the product feeding or loading correctly into the machine? (Yes / No / N/A)" },
        { q: "Is the output consistent and within expected quality? (Yes / Inconsistent / No output)" },
        { q: "Is there a jam, resistance, or overload indication? (Yes — describe / No)" },
        { q: "Is the oven reaching and holding the set temperature? (Yes / No / N/A)" },
        { q: "Is the oven fan rotating during operation? (Yes / No / N/A)" }
    ],
    16: [ // Butchery
        { q: "Are all safety covers and blade guards in place and engaged? (Yes / No — specify which)" },
        { q: "Are the blades or cutting mechanisms moving? (Yes / No / Intermittent)" },
        { q: "Is the cutting or mincing output of acceptable quality? (Yes / Poor / No output)" },
        { q: "Is there a blockage or product jam in the machine? (Yes / No)" },
        { q: "Is there audible motor strain or unusual load sound? (Yes / No)" },
        { q: "Is the vacuum sealing and suction functioning? (Yes / Partial / No / N/A)" }
    ],
    17: [ // Deli / Pie shop
        { q: "Is the heating element or gas burner active and producing heat? (Yes / No)" },
        { q: "Is the temperature stable and reaching the set point? (Yes / No / Fluctuating)" },
        { q: "Is gas ignition working? (Yes / No / N/A)" },
        { q: "Is the fryer oil heating correctly? (Yes / No / N/A)" },
        { q: "Is the cold display counter cooling? (Yes / No)" },
        { q: "Are the internal circulation fans operating? (Yes / No / N/A)" }
    ],
    18: [ // Fruit & Veg
        { q: "Are the display lights and controls activating on power-up? (Yes / No)" },
        { q: "Is the Teflon strip affixed and undamaged? (Yes / No — burnt / No — missing)" },
        { q: "Is the hinge mechanism intact and operating smoothly? (Yes / No — broken / Stiff)" },
        { q: "Is the heating wire exposed or visible outside its housing? (No — safe / Yes — STOP)", id: 'wire_exposed' },
        { q: "Are the temperature dials or controls responding? (Yes / No)" },
        { q: "Was the unit recently dropped or knocked? (Yes / No / Unknown)" },
        { q: "Is the seal forming correctly on the product? (Yes / No / Partial)" }
    ],
    19: [ // HVAC
        { q: "Is the unit producing airflow? (Yes / No)" },
        { q: "Is the air reaching the set temperature — cooling or heating? (Yes / No / Partially)" },
        { q: "Is there water dripping or leaking from the unit? (Yes / No)" },
        { q: "Is there unusual noise from the indoor or outdoor unit? (Yes — describe / No)" }
    ],
    10: [ // Plumbing
        { q: "What is the plumbing fault?\n1. Burst pipe\n2. Active leak\n3. Blocked drain\n4. Geyser issue\n5. Low pressure\n6. Valve failure\n7. Sewage backup\n8. Borehole / pump\n9. Other" },
        { q: "Is there active water flow causing immediate damage or safety risk? (Yes / No)" },
        { q: "What is the exact location of the fault?" }
    ],
    20: [ // Fire Safety
        { q: "What is the fire safety fault?\n1. Extinguisher expired\n2. Extinguisher missing\n3. Smoke detector fault\n4. Sprinkler issue\n5. Fire door damaged\n6. Hose reel fault\n7. Emergency exit blocked\n8. Panel or alarm fault" },
        { q: "Is there an active fire or immediate emergency? (Yes — evacuate now! / No)" },
        { q: "Is the affected equipment tagged and out of service pending repair? (Yes / No)" }
    ],
    9: [ // Backup Power
        { q: "Is the unit starting and running? (Yes / No / Starts then shuts down)" },
        { q: "What is the current fuel level? (Full / Half / Low / Empty / N/A)" },
        { q: "Is the battery charged and all connections secure? (Yes / No / Unknown)" },
        { q: "Are there error codes or warning lights on the display? (Yes — describe / No)" },
        { q: "Is the output power stable when running? (Yes / No / Not reaching equipment)" },
        { q: "Is there a visible oil, fuel, or coolant leak? (Yes / No)" },
        { q: "Is the automatic changeover activating during a power cut? (Yes / No / Not tested)" }
    ],
    11: [ // Building Civil Tiling
        { q: "What type of defect is this?\n1. Roof leak 2. Ceiling damage 3. Wall crack 4. Floor / tiling 5. Door/lock 6. Window 7. Paving 8. Fence 9. Access control 10. Signage 11. Other" },
        { q: "Is this a safety risk to staff or customers? (Yes / No)" },
        { q: "How long has this defect been present? (Today / This week / Longer / Unknown)" }
    ],
    12: [ // Building Civil Roof
        { q: "What type of defect is this?\n1. Roof leak 2. Ceiling damage 3. Wall crack 4. Floor / tiling 5. Door/lock 6. Window 7. Paving 8. Fence 9. Access control 10. Signage 11. Other" },
        { q: "Is this a safety risk to staff or customers? (Yes / No)" },
        { q: "How long has this defect been present? (Today / This week / Longer / Unknown)" }
    ],
    6: [ // Electrical - Lighting
        { q: "Is the failure affecting 1. A single bulb 2. A section/aisle 3. The entire floor" },
        { q: "Is there any flickering or buzzing heard? (Yes / No)" },
        { q: "Is the emergency lighting functional? (Yes / No / N/A)" }
    ],
    7: [ // Electrical - Plug points
        { q: "Is there visible damage to the socket (burnt/cracked)? (Yes / No)" },
        { q: "Is the plug loose when inserted? (Yes / No)" },
        { q: "How many sockets are affected?" }
    ],
    8: [ // Electrical - Switches / DB
        { q: "Is there a burning smell near the board? (Yes / No)" },
        { q: "Are any breakers hot to the touch? (Yes / No / Unknown)" },
        { q: "Is there a loud humming or arcing sound? (Yes / No)" }
    ],
    21: [ // Pest & Hygiene
        { q: "What is the issue? 1. Rodent sighting 2. Insect activity 3. Sanitizer station empty 4. Deep clean required 5. Other" },
        { q: "Is this in a food-prep area? (Yes / No)" },
        { q: "Is there an immediate health risk? (Yes / No)" }
    ],
    22: [ // General
        { q: "Please describe the fault in detail." },
        { q: "How long has this been an issue?" },
        { q: "Are any other units or sections affected?" }
    ]
};

const PHASES = {
    IDENTIFICATION: 'IDENTIFICATION',
    POWER_CHECK: 'POWER_CHECK',
    POWER_SUBPATH: 'POWER_SUBPATH',
    UNIVERSAL_ENGINE: 'UNIVERSAL_ENGINE',
    CATEGORY_DIAGNOSTIC: 'CATEGORY_DIAGNOSTIC',
    MEDIA_PRIORITY: 'MEDIA_PRIORITY',
    REPORT_CONFIRM: 'REPORT_CONFIRM',
    COMPLETED: 'COMPLETED'
};

function getNextQuestion(session) {
    const state = session.state || { phase: PHASES.IDENTIFICATION, step: 1 };
    session.state = state;

    // --- PHASE 1: IDENTIFICATION ---
    if (state.phase === PHASES.IDENTIFICATION) {
        switch (state.step) {
            case 1: return "Please provide the store or branch name you are reporting from.";
            case 2: return "What is your full name?";
            case 3:
                let catList = "Please select the equipment category (enter number):\n";
                Object.entries(CATEGORIES).forEach(([id, name]) => {
                    catList += `${id}. ${name}\n`;
                });
                return catList;
            case 4: return "Where exactly is the unit located? (e.g. Aisle 3, Dairy section, Bakery, Loading bay)";
            case 5: return "Please give me the following details:\na) Equipment name / type\nb) Brand\nc) Model (if visible)\nd) Asset tag\ne) Serial number\n\nReply with each one, or type 'unknown' for anything you cannot find.";
        }
    }

    // --- PHASE 2: POWER CHECK ---
    if (state.phase === PHASES.POWER_CHECK) {
        return "Is there power to the unit? Check the display panel or any lights on the equipment.\nOptions: Yes / No";
    }

    if (state.phase === PHASES.POWER_SUBPATH) {
        const cat = parseInt(session.data.category_id);
        const subStep = state.step;

        // Cold room/Freezer room (Fixed installation): ISOLATOR PATH
        if (cat === 2 || cat === 3) {
            if (subStep === 1) return "Switch the isolator OFF. Wait 10 seconds. Switch it back ON. Is there power now?\nOptions: Yes / No";
            if (subStep === 2) return "Check the distribution board (DB board). Is the breaker for this unit tripped or switched off?\nOptions: Yes / No";
            if (subStep === 3) return "Reset the breaker. Is there power now?\nOptions: Yes / No";
        }

        // Upright fridge/Serve over/Bakery/Butchery/Deli/F&V: PLUG PATH
        if ([1, 5, 15, 16, 17, 18].includes(cat)) {
            if (subStep === 1) return "Test the unit on an alternate plug socket nearby. Is there power on the alternate socket?\nOptions: Yes / No";
            if (subStep === 2) return "Is the circuit breaker at the DB board tripped?\nOptions: Yes / No";
            if (subStep === 3) return "Reset it. Is there power now?\nOptions: Yes / No";
        }

        // Island freezer: MOVE PATH
        if (cat === 4) {
            if (subStep === 1) return "Move the island freezer to an alternate socket. Is there power now? (Mandatory if no power)\nOptions: Yes / No";
        }

        // Electrical categories (6, 7, 8): DB PATH
        if ([6, 7, 8].includes(cat)) {
            if (subStep === 1) return "Is the circuit breaker for this area tripped at the DB board?\nOptions: Yes / No";
            if (subStep === 2) return "Reset it. Is power restored?\nOptions: Yes / No";
            if (subStep === 3) return "Is there visible damage — burn marks, exposed wire, or sparking?\nOptions: Yes / No";
        }

        return "Electrical fault confirmed. Proceeding to remaining diagnostic steps.";
    }

    // --- PHASE 3: UNIVERSAL ENGINE ---
    if (state.phase === PHASES.UNIVERSAL_ENGINE) {
        switch (state.step) {
            case 1: return "Are all required supplies confirmed and available?\n1. All confirmed (power / water / gas)\n2. Water supply missing or off\n3. Gas supply missing\n4. Not sure";
            case 2: return "Are all safety conditions correct?\n1. All correct — doors seal, guards in place\n2. Door or seal issue\n3. Safety guard or interlock missing\n4. Safety risk — persons may be at risk";
            case 3: return "What is the equipment failing to do? Select the closest match:\n1. Cool / maintain temperature\n2. Heat / cook\n3. Cut / slice / mince\n4. Mix / blend\n5. Rotate / drive / move\n6. Pump / pressurise\n7. Dispense / fill\n8. Seal / wrap\n9. Display / show readings\n10. Other";
            case 4: return "Are any of the following present? Select all that apply (e.g. 2, 4):\n1. None of the below\n2. Unusual noise — grinding / clicking / buzzing / rattling\n3. Jam or blockage\n4. Visible leak — water / oil / gas\n5. Excess vibration\n6. Burning smell\n7. Visible damage or broken parts";
        }
    }

    // --- PHASE 4: CATEGORY DIAGNOSTIC ---
    if (state.phase === PHASES.CATEGORY_DIAGNOSTIC) {
        const cat = parseInt(session.data.category_id);
        const flow = DIAGNOSTIC_FLOW[cat] || [{ q: "Please provide any additional details about the fault for this category." }];

        let subStep = state.step;
        while (subStep <= flow.length) {
            const currentQ = flow[subStep - 1];
            if (currentQ.skip && currentQ.skip(session.data)) {
                subStep++;
                state.step = subStep;
                continue;
            }
            return currentQ.q;
        }
    }

    // --- PHASE 5: MEDIA & PRIORITY ---
    if (state.phase === PHASES.MEDIA_PRIORITY) {
        if (state.step === 1) return "Can you take a photo or video of the fault? If yes, please send it now via WhatsApp.\nOptions: Yes — sending now / No — not possible";
        if (state.step === 2) return "How urgent is this fault?\n1. Emergency — safety risk or full operation stopped. Respond within 1 hour.\n2. Urgent — major operational impact. Respond within 4 hours.\n3. High — significant fault, not critical. Respond within 24 hours.\n4. Routine — low impact, next available slot.";
    }

    // --- PHASE 6: REPORT CONFIRM ---
    if (state.phase === PHASES.REPORT_CONFIRM) {
        const report = generateReport(session);
        return report + "\n\nIs this correct? Reply YES to submit or NO to make a change.";
    }

    return "Thank you. Your report has been submitted. Would you like to log another fault?";
}

function handleInput(session, input) {
    const state = session.state || { phase: PHASES.IDENTIFICATION, step: 1 };
    if (!session.data) session.data = {};
    const data = session.data;

    const text = input.trim();
    const lowText = text.toLowerCase();

    // --- PHASE 1: IDENTIFICATION ---
    if (state.phase === PHASES.IDENTIFICATION) {
        if (state.step === 1) { data.store = text; state.step = 2; }
        else if (state.step === 2) { data.reporter = text; state.step = 3; }
        else if (state.step === 3) {
            let catId = null;
            const match = text.match(/\d+/);

            if (match) {
                catId = parseInt(match[0]);
            } else {
                // Try fuzzy matching on category name (for UI chips)
                const search = text.toLowerCase();
                const entry = Object.entries(CATEGORIES).find(([id, name]) =>
                    name.toLowerCase().includes(search)
                );
                if (entry) catId = parseInt(entry[0]);
            }

            if (catId && CATEGORIES[catId]) {
                data.category_id = catId;
                data.category = CATEGORIES[catId];
                state.step = 4;
            } else {
                return "Invalid category. Please enter a number between 1 and 22 or select from the options.";
            }
        }
        else if (state.step === 4) { data.location = text; state.step = 5; }
        else if (state.step === 5) {
            data.equipment_details = text;
            state.phase = PHASES.POWER_CHECK;
            state.step = 1;
        }
    }

    // --- PHASE 2: POWER CHECK ---
    else if (state.phase === PHASES.POWER_CHECK) {
        if (lowText.includes('yes')) {
            data.power_status = "Confirmed";
            state.phase = PHASES.UNIVERSAL_ENGINE;
            state.step = 1;
        } else if (lowText.includes('no')) {
            data.power_status = "No Power";
            state.phase = PHASES.POWER_SUBPATH;
            state.step = 1;
        } else {
            return "Please reply with Yes or No.";
        }
    }

    else if (state.phase === PHASES.POWER_SUBPATH) {
        const cat = parseInt(data.category_id);

        if (lowText.includes('yes')) {
            data.power_status = "Restored after check";
            state.phase = PHASES.UNIVERSAL_ENGINE;
            state.step = 1;
        } else if (lowText.includes('no')) {
            state.step++;

            // Logic for when to stop subpath and escalate
            let maxSubSteps = 1;
            if ([2, 3, 1, 5, 15, 16, 17, 18, 6, 7, 8].includes(cat)) maxSubSteps = 3;
            if (cat === 4) maxSubSteps = 1;

            if (state.step > maxSubSteps) {
                data.power_status = "Electrical fault escalated";
                state.phase = PHASES.UNIVERSAL_ENGINE;
                state.step = 1;
            }
        } else {
            return "Please reply with Yes or No.";
        }
    }

    // --- PHASE 3: UNIVERSAL ENGINE ---
    else if (state.phase === PHASES.UNIVERSAL_ENGINE) {
        if (state.step === 1) {
            const supplies = ["", "All confirmed", "Water supply missing", "Gas supply missing", "Not sure"];
            data.supplies = supplies[parseInt(text)] || text;
            state.step = 2;
        }
        else if (state.step === 2) {
            const safety = ["", "All correct", "Door/seal issue", "Safety guard missing", "Safety risk — persons may be at risk"];
            data.safety = safety[parseInt(text)] || text;
            if (text.includes('4') || lowText.includes('risk')) {
                data.priority = "EMERGENCY — SAFETY RISK";
                state.phase = PHASES.REPORT_CONFIRM;
            } else {
                state.step = 3;
            }
        }
        else if (state.step === 3) {
            const failures = ["", "Cooling", "Heating", "Cutting", "Mixing", "Rotating", "Pumping", "Dispensing", "Sealing", "Display", "Other"];
            data.failing_to = failures[parseInt(text)] || text;
            state.step = 4;
        }
        else if (state.step === 4) {
            data.mechanical = text;
            if (text.includes('6') || lowText.includes('burning')) {
                data.priority = "EMERGENCY — FIRE RISK";
                state.phase = PHASES.REPORT_CONFIRM;
            } else {
                state.phase = PHASES.CATEGORY_DIAGNOSTIC;
                state.step = 1;
            }
        }
    }

    // --- PHASE 4: CATEGORY DIAGNOSTIC ---
    else if (state.phase === PHASES.CATEGORY_DIAGNOSTIC) {
        if (!data.diagnostic) data.diagnostic = [];

        const cat = parseInt(data.category_id);
        const flow = DIAGNOSTIC_FLOW[cat] || [];

        // Save answer if current question has an ID
        const currentQ = flow[state.step - 1];
        if (currentQ && currentQ.id) {
            data[currentQ.id] = text;
        }

        data.diagnostic.push(text);
        state.step++;

        // Check if we should skip the NEXT question(s)
        while (state.step <= flow.length) {
            const nextQ = flow[state.step - 1];
            if (nextQ.skip && nextQ.skip(data)) {
                state.step++;
            } else {
                break;
            }
        }

        // Check for emergency escalation in F&V (Exposed wire)
        if (cat === 18 && data.wire_exposed && (data.wire_exposed.toLowerCase().includes('yes') || data.wire_exposed.toLowerCase().includes('stop'))) {
            data.priority = "EMERGENCY — EXPOSED WIRE";
            state.phase = PHASES.REPORT_CONFIRM;
            return null;
        }

        if (state.step > flow.length) {
            state.phase = PHASES.MEDIA_PRIORITY;
            state.step = 1;
        }
    }

    // --- PHASE 5: MEDIA & PRIORITY ---
    else if (state.phase === PHASES.MEDIA_PRIORITY) {
        if (state.step === 1) { data.photo = text; state.step = 2; }
        else if (state.step === 2) {
            const priorities = ["", "Emergency 1h", "Urgent 4h", "High 24h", "Routine"];
            data.priority = priorities[parseInt(text)] || text;
            state.phase = PHASES.REPORT_CONFIRM;
        }
    }

    // --- PHASE 6: REPORT CONFIRM ---
    else if (state.phase === PHASES.REPORT_CONFIRM) {
        if (lowText.includes('yes')) {
            state.phase = PHASES.COMPLETED;
            return "SUCCESS";
        } else if (lowText.includes('no')) {
            return "RESTART";
        } else {
            return "Please reply YES to submit or NO to restart.";
        }
    }

    return null;
}

function generateReport(session) {
    const data = session.data;
    if (!data.ticket_id) {
        data.ticket_id = 'TKT-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    return `━━━ FM FAULT REPORT #${data.ticket_id} ━━━
📍 Store / Branch:     ${data.store || 'N/A'}
👤 Reported by:        ${data.reporter || 'N/A'}
📅 Date & time:        ${new Date().toLocaleString()}

🔧 Category:           ${data.category || 'N/A'}
📦 Equipment:          ${data.equipment_details || 'N/A'}
📍 Location:           ${data.location || 'N/A'}

⚡ Power status:       ${data.power_status || 'N/A'}
⚙️ Failing to:         ${data.failing_to || 'N/A'}
📝 Other findings:     ${(data.diagnostic || []).join(' | ')}

🔴 Priority / SLA:     ${data.priority || 'N/A'}
👷 Technician needed:  Yes
📸 Photo attached:     ${data.photo || 'No'}
━━━━━━━━━━━━━━━━━━━━━━━━`;
}

async function getLogicResponse(userId, userMessage, session) {
    if (userMessage.toLowerCase() === 'reset' || userMessage.toLowerCase() === 'restart') {
        session.state = { phase: PHASES.IDENTIFICATION, step: 1 };
        session.data = {};
        return getNextQuestion(session);
    }

    if (!session.state || session.state.phase === PHASES.COMPLETED) {
        session.state = { phase: PHASES.IDENTIFICATION, step: 1 };
        session.data = {};
        return "Good day! I'm FM Assist. Let's log your fault.\n\n" + getNextQuestion(session);
    }

    const result = handleInput(session, userMessage);

    if (userMessage.toLowerCase() === 'log a fault') {
        session.state = { phase: PHASES.IDENTIFICATION, step: 1 };
        session.data = {};
        return getNextQuestion(session);
    }

    if (result === "SUCCESS") {
        const report = generateReport(session);
        session.state = { phase: PHASES.COMPLETED };
        return "Thank you! Your report has been submitted successfully. [TICKET #" + session.data.ticket_id + "]\n\n" + report;
    }

    if (result === "RESTART") {
        session.state = { phase: PHASES.IDENTIFICATION, step: 1 };
        session.data = {};
        return "Okay, let's start over.\n\n" + getNextQuestion(session);
    }

    if (typeof result === 'string') return result;

    return getNextQuestion(session);
}

module.exports = { getLogicResponse, PHASES };
