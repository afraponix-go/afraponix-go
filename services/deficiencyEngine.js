// Deficiency analysis behind ONE swappable interface. Callers use
// analyzeBatchPhoto(context) and never know which engine ran; the engine is
// chosen by env (DEFICIENCY_ENGINE), so the LLM v1 can later be replaced by an
// in-house embedding/retrieval model — trained on the confirm/correct labels the
// route records — without changing the routes or the UI.
//
// context = {
//   imageBase64, mediaType,          // the photo
//   crop,                            // { name, code }
//   targets,                         // { n,p,k,ca,mg,fe, ec } or null (per-crop targets)
//   readings,                        // [{ type, value, days }] latest reading per type + its age in days, or []
// }
// returns { engine, model?, deficiencies:[{nutrient,confidence,visible_signs,severity}],
//           issues:[{kind:'pest'|'disease',name,confidence,severity,visible_signs,management:[]}],
//           ruling_out:[], overall, suggested_checks:[],
//           data_gaps:[{nutrient,status:'stale'|'none',days}] }  // nutrients with no current reading

const NUTRIENTS = [
  ['n', 'Nitrogen (N)'], ['p', 'Phosphorus (P)'], ['k', 'Potassium (K)'],
  ['ca', 'Calcium (Ca)'], ['mg', 'Magnesium (Mg)'], ['fe', 'Iron (Fe)'],
];

// How old a reading may be and still count as evidence about the water today:
// two weeks. Anything older is "unknown", never "was fine last month".
const FRESH_DAYS = Number(process.env.READING_FRESH_DAYS) || 14;

// Reading keys the app stores (nutrient_readings.nutrient_type) per nutrient.
// Nitrogen is tracked as nitrate in the water form.
const READING_KEYS = {
  n: ['n', 'nitrogen', 'nitrate'], p: ['p', 'phosphorus'], k: ['k', 'potassium'],
  ca: ['ca', 'calcium'], mg: ['mg', 'magnesium'], fe: ['fe', 'iron'],
};

function readingStatus(days) {
  if (days == null) return 'none';
  return days <= FRESH_DAYS ? 'fresh' : 'stale';
}

// Per-nutrient { value, days, status } from the latest reading of each type.
// readings = [{ type, value, days }] (days = age of that reading, or null).
function readingInfo(readings) {
  const byType = new Map((readings || []).map((r) => [String(r.type).toLowerCase(), r]));
  const info = {};
  for (const [key] of NUTRIENTS) {
    const hit = READING_KEYS[key].map((k) => byType.get(k)).find(Boolean);
    info[key] = hit
      ? { value: hit.value, days: hit.days ?? null, status: readingStatus(hit.days ?? null) }
      : { value: null, days: null, status: 'none' };
  }
  return info;
}

const ago = (d) => (d == null ? 'unknown date' : d === 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`);

function readingsSummary(targets, readings) {
  const info = readingInfo(readings);
  const lines = [];
  for (const [key, label] of NUTRIENTS) {
    const target = targets ? targets[key] : null;
    const r = info[key];
    const tgt = target != null ? `, target ${target}` : '';
    if (r.status === 'none') lines.push(`- ${label}: NOT MEASURED — no reading on record${tgt}`);
    else if (r.status === 'stale') lines.push(`- ${label}: STALE — last measured ${r.value} ${ago(r.days)}${tgt}; do NOT treat as the current level`);
    else lines.push(`- ${label}: measured ${r.value} ${ago(r.days)}${tgt}`);
  }
  const ph = (readings || []).find((r) => String(r.type).toLowerCase() === 'ph');
  if (ph) lines.push(`- pH: ${ph.value} (${ago(ph.days ?? null)}${readingStatus(ph.days ?? null) === 'stale' ? ', STALE' : ''})`);
  return lines.join('\n');
}

// Which nutrients we have no usable current reading for — computed from the
// data, not left to the model, so the UI can always say "can't confirm".
function dataGaps(readings) {
  const info = readingInfo(readings);
  return NUTRIENTS.filter(([k]) => info[k].status !== 'fresh').map(([k, label]) => ({
    nutrient: label, status: info[k].status, days: info[k].days,
  }));
}

// Tag each deficiency finding with how current the reading for that nutrient is.
function annotateDeficiencies(deficiencies, readings) {
  const info = readingInfo(readings);
  return deficiencies.map((d) => {
    const name = String(d && d.nutrient || '');
    const hit = NUTRIENTS.find(([k, label]) => label.toLowerCase() === name.toLowerCase() || new RegExp(`\\(${k}\\)`, 'i').test(name));
    if (!hit) return d;
    const r = info[hit[0]];
    return { ...d, reading: { status: r.status, days: r.days, value: r.value } };
  });
}

// ---- Claude vision engine ----
async function claudeEngine(context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error('Deficiency analysis engine is not configured (set ANTHROPIC_API_KEY).');
    err.code = 'engine_unconfigured';
    throw err;
  }
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  const model = process.env.DEFICIENCY_MODEL || 'claude-sonnet-5';

  const cropName = context.crop?.name || context.crop?.code || 'an aquaponics leafy crop';
  const system =
    'You are an aquaponics crop-health advisor. From a leaf/plant photo and the grower\'s own recent water/nutrient readings, ' +
    'identify what is LIKELY wrong with the plant, in three separate categories: (1) nutrient deficiencies, (2) PESTS ' +
    '(insects, mites, slugs/snails, etc. — name the pest and what you can see: the insect itself, webbing, frass, honeydew, ' +
    'chewing/mining/stippling damage), and (3) DISEASES (fungal, bacterial, viral or water-mould/root rot — name it, e.g. ' +
    'powdery mildew, downy mildew, leaf spot, botrytis, pythium). Cross-check against the readings: if leaves look deficient in ' +
    'a nutrient that measures adequate, say so and suggest pH lock-out or root issues instead. ' +
    'READING FRESHNESS: each reading is labelled with its age. Only a reading from the last two weeks is evidence about the ' +
    'water today. A reading marked STALE or NOT MEASURED tells you NOTHING about that nutrient now — never use it to rule a ' +
    'deficiency out, never say a nutrient is "adequate" or "fine" because it was fine before, and never put it in ruling_out on ' +
    'that basis. If the leaves look deficient in a nutrient whose reading is stale or missing, report the deficiency anyway, say ' +
    'plainly that the water level is unverified, and make re-testing that nutrient the first suggested check. ' +
    'Actively distinguish look-alikes — ' +
    'pest damage vs deficiency, fungal spotting vs nutrient burn, viral mosaic vs iron/magnesium chlorosis — and say which you ' +
    'rule out and why. Be advisory, never definitive; photos can mislead. This is a fish-stocked system, so any management ' +
    'step must be fish-safe: prefer cultural, mechanical and biological controls (removal, airflow, humidity, beneficial insects, ' +
    'Bt, insecticidal soap, neem used with care) and explicitly warn off anything that must not reach the water. ' +
    'Respond with ONLY a JSON object, no prose, matching:\n' +
    '{"deficiencies":[{"nutrient":"<name>","confidence":"low|medium|high","visible_signs":"<what in the photo>","severity":"mild|moderate|severe"}],' +
    '"issues":[{"kind":"pest|disease","name":"<specific pest or disease>","confidence":"low|medium|high","visible_signs":"<what in the photo>","severity":"mild|moderate|severe","management":["<fish-safe action>"]}],' +
    '"ruling_out":["<nutrient/pest/disease and why>"],"overall":"<one sentence covering all findings>","suggested_checks":["<action>","<action>"]}\n' +
    'Use the exact nutrient names: Nitrogen (N), Phosphorus (P), Potassium (K), Calcium (Ca), Magnesium (Mg), Iron (Fe). ' +
    'Use empty arrays for any category with nothing found; both empty means the plant looks healthy.';

  const userText =
    `Crop: ${cropName}.\nWater readings, each with its age (measured vs target):\n${readingsSummary(context.targets, context.readings)}\n\n` +
    'Analyse the attached plant photo for deficiencies, pests and disease.';

  const resp = await client.messages.create({
    model,
    max_tokens: 2000,
    output_config: { effort: 'low' },
    system,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: context.mediaType || 'image/jpeg', data: context.imageBase64 } },
        { type: 'text', text: userText },
      ],
    }],
  });

  const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const parsed = extractJson(text);
  return {
    engine: 'claude',
    model,
    deficiencies: annotateDeficiencies(Array.isArray(parsed.deficiencies) ? parsed.deficiencies : [], context.readings),
    issues: normaliseIssues(parsed.issues),
    ruling_out: Array.isArray(parsed.ruling_out) ? parsed.ruling_out : [],
    overall: typeof parsed.overall === 'string' ? parsed.overall : '',
    suggested_checks: Array.isArray(parsed.suggested_checks) ? parsed.suggested_checks : [],
    data_gaps: dataGaps(context.readings),
  };
}

// Pest/disease findings: keep only well-formed entries so the UI can render
// them without defensive checks, and coerce `kind` to the two values it knows.
// If the model returns an unrecognised `kind`, decide from the name rather than
// defaulting everything to "pest" (powdery mildew is not a pest).
const DISEASE_WORDS = /mildew|blight|rot\b|mou?ld|spot|wilt|virus|mosaic|botrytis|pythium|rust|canker|scab|anthracnose|fusarium|damping/i;

function normaliseIssues(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i) => i && typeof i.name === 'string' && i.name.trim())
    .map((i) => ({
      kind: i.kind === 'disease' || i.kind === 'pest' ? i.kind : DISEASE_WORDS.test(i.name) ? 'disease' : 'pest',
      name: i.name.trim(),
      confidence: ['low', 'medium', 'high'].includes(i.confidence) ? i.confidence : 'low',
      severity: ['mild', 'moderate', 'severe'].includes(i.severity) ? i.severity : undefined,
      visible_signs: typeof i.visible_signs === 'string' ? i.visible_signs : '',
      management: Array.isArray(i.management) ? i.management.filter((m) => typeof m === 'string' && m.trim()) : [],
    }));
}

// The model is asked for pure JSON, but be tolerant of stray prose/fences.
function extractJson(text) {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s === -1 || e === -1 || e < s) return {};
  try {
    return JSON.parse(text.slice(s, e + 1));
  } catch {
    return {};
  }
}

const ENGINES = { claude: claudeEngine };

async function analyzeBatchPhoto(context) {
  const name = process.env.DEFICIENCY_ENGINE || 'claude';
  const engine = ENGINES[name];
  if (!engine) {
    const err = new Error(`Unknown deficiency engine '${name}'.`);
    err.code = 'engine_unconfigured';
    throw err;
  }
  return engine(context);
}

module.exports = { analyzeBatchPhoto };
