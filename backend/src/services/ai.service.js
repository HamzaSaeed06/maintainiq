// Gemini AI service helper - MaintainIQ
const generateTriagePrompt = (assetContext, complaint) => {
  return `You are an automated maintenance triage AI for MaintainIQ asset manager.
Given the following asset context and a raw complaint text, analyze the issue and produce a structured JSON response.

--- ASSET CONTEXT ---
Name: ${assetContext.name}
Category: ${assetContext.category}
Location: ${assetContext.location}
Condition: ${assetContext.condition}
Current Status: ${assetContext.status}
Recent History Logs: ${JSON.stringify(assetContext.recentActivity)}

--- USER COMPLAINT ---
"${complaint}"

--- SAFETY CONSTRAINTS (CRITICAL) ---
If the complaint involves electrical (sparks, shocks, wiring, smell of burning wire), gas (gas leaks, smell of gas, propane), fire (smoke, open flame, combustion), or structural (cracks in main columns, collapsing ceiling/wall, structural hazard) safety risks, you MUST:
1. Recommend setting priority to "Critical" or "High".
2. In "initialChecks", instruct the user to STOP USE IMMEDIATELY, DO NOT ATTEMPT DIY REPAIRS, and contact a qualified technician or emergency help.
3. NEVER provide DIY repair steps, inspections, or troubleshooting for these high-risk areas.

--- SCHEMA REQUIREMENTS ---
Return ONLY a valid JSON object matching the following structure. Do not wrap it in markdown markers or add comments.
{
  "title": "A short, descriptive title of the issue",
  "category": "HVAC | Electrical | Plumbing | Structural | Appliance | Other (select the most appropriate)",
  "priority": "Low | Medium | High | Critical (select based on urgency)",
  "possibleCauses": ["list", "of", "possible", "underlying", "causes"],
  "initialChecks": ["list", "of", "safe", "initial", "inspections", "or", "safety", "steps"],
  "recurringWarning": "a warning string if this is a recurring style issue or contains safety risk, otherwise null"
}
`;
};

// Fallback mock JSON generator for development when GEMINI_API_KEY is not set or times out
const getMockTriageResult = (assetContext, complaint) => {
  const text = complaint.toLowerCase();
  const isElectrical = text.includes('spark') || text.includes('wire') || text.includes('shock') || text.includes('electrical') || text.includes('volt') || text.includes('power') || text.includes('burning');
  const isGas = text.includes('gas') || text.includes('odor') || text.includes('smell') || text.includes('propane') || text.includes('leak');
  const isFire = text.includes('smoke') || text.includes('fire') || text.includes('flame') || text.includes('heat');
  const isStructural = text.includes('collapse') || text.includes('crack') || text.includes('wall') || text.includes('ceiling') || text.includes('beam') || text.includes('floor');

  // Trigger safety rules if any of these hazards are present
  if (isElectrical || isGas || isFire || isStructural) {
    let category = 'Other';
    if (isElectrical) category = 'Electrical';
    else if (isGas || isFire) category = 'Other';
    else if (isStructural) category = 'Structural';

    let hazardType = 'safety hazard';
    if (isElectrical) hazardType = 'electrical risk';
    if (isGas) hazardType = 'gas / toxic leak';
    if (isFire) hazardType = 'fire risk';
    if (isStructural) hazardType = 'structural danger';

    return {
      title: `Critical Hazard - Suspected ${category || 'Safety'} Issue`,
      category: category,
      priority: 'Critical',
      possibleCauses: [`Severe fault causing dangerous ${hazardType}`],
      initialChecks: [
        'STOP USE IMMEDIATELY - Critical safety risk detected',
        'Do not touch or attempt DIY troubleshooting',
        'Isolate the area and evacuate if necessary',
        'Notify facility manager and call a certified technician immediately'
      ],
      recurringWarning: `WARNING: Potentially dangerous ${hazardType} identified. Manual technician dispatch is required.`
    };
  }

  // General HVAC
  if (text.includes('cooling') || text.includes('heating') || text.includes('ac') || text.includes('temp') || text.includes('heater') || text.includes('hvac')) {
    return {
      title: 'Thermostat or Compressor Inefficiency',
      category: 'HVAC',
      priority: 'Medium',
      possibleCauses: ['Clogged air filter', 'Low refrigerant pressure', 'Faulty thermostat control unit'],
      initialChecks: [
        'Check if main power switch is turned ON',
        'Inspect and clean/replace filter if blocked',
        'Confirm thermostat is set to correct temperature'
      ],
      recurringWarning: null
    };
  }

  // General Plumbing
  if (text.includes('leak') || text.includes('water') || text.includes('drip') || text.includes('plumb') || text.includes('pipe')) {
    return {
      title: 'Water Leakage or Pipe Drainage Issue',
      category: 'Plumbing',
      priority: 'Medium',
      possibleCauses: ['Failed seal or fitting washer', 'Pipe blockage', 'Corroded pipe joints'],
      initialChecks: [
        'Locate and shut off local isolation water valve',
        'Wipe area to isolate dry vs active point of leakage',
        'Do not apply chemical sealants without cleaning'
      ],
      recurringWarning: null
    };
  }

  // Default fallback
  return {
    title: 'General Fault Reported',
    category: assetContext.category || 'Other',
    priority: 'Low',
    possibleCauses: ['Mechanical wear', 'Unknown error state'],
    initialChecks: [
      'Visually inspect the unit for external damage',
      'Restart the machine if safe to do so'
    ],
    recurringWarning: null
  };
};

/**
 * Calls Gemini API to analyze a user's complaint with context, returning structured details
 * @param {Object} assetContext Basic asset fields (name, category, location, condition, etc.)
 * @param {string} complaint Raw text complaint typed by the user
 * @returns {Promise<Object>} Triage suggestion JSON matching Project Spec schema
 */
const analyzeComplaintWithAI = async (assetContext, complaint) => {
  const apiKey = process.env.GEMINI_API_KEY;

  // Use dynamic mocks if API key is not supplied or is a placeholder
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    console.log('[AI Service] Gemini API key placeholder detected. Using safety-compliant dynamic mock fallback.');
    return getMockTriageResult(assetContext, complaint);
  }

  const prompt = generateTriagePrompt(assetContext, complaint);
  
  // Try multiple model versions in order of preference
  const models = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-pro',
    'gemini-1.0-pro'
  ];

  let lastError = null;
  
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      console.log(`[AI Service] Trying model: ${model}`);

      // Timebox calling to ~10 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9500);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini status ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Empty response content received from Gemini model');
      }

      // Try-parse the parsed response
      const parsed = JSON.parse(rawText.trim());

      // Validate schema compliance
      const required = ['title', 'category', 'priority', 'possibleCauses', 'initialChecks', 'recurringWarning'];
      for (const key of required) {
        if (!(key in parsed)) {
          throw new Error(`Invalid schema: missing field "${key}" from AI response`);
        }
      }

      console.log(`[AI Service] Successfully used model: ${model}`);
      return parsed;
    } catch (err) {
      lastError = err;
      console.warn(`[AI Service] Model ${model} failed:`, err.message);
      continue; // Try next model
    }
  }

  // All models failed, use fallback
  console.error('[AI Service] All Gemini models failed. Using mock fallback.');
  return getMockTriageResult(assetContext, complaint);
};

module.exports = {
  analyzeComplaintWithAI,
  getMockTriageResult,
};
