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
//   readings,                        // [{ type, value }] latest water/nutrient readings, or []
// }
// returns { engine, model?, deficiencies:[{nutrient,confidence,visible_signs,severity}],
//           ruling_out:[], overall, suggested_checks:[] }

const NUTRIENTS = [
  ['n', 'Nitrogen (N)'], ['p', 'Phosphorus (P)'], ['k', 'Potassium (K)'],
  ['ca', 'Calcium (Ca)'], ['mg', 'Magnesium (Mg)'], ['fe', 'Iron (Fe)'],
];

function readingsSummary(targets, readings) {
  const byType = new Map((readings || []).map((r) => [String(r.type).toLowerCase(), r.value]));
  const lines = [];
  for (const [key, label] of NUTRIENTS) {
    const target = targets ? targets[key] : null;
    // match reading by nutrient key or common aliases
    const measured = byType.get(key) ?? byType.get(label.split(' ')[0].toLowerCase()) ?? null;
    if (target == null && measured == null) continue;
    lines.push(`- ${label}: measured ${measured != null ? measured : '—'}${target != null ? `, target ${target}` : ''}`);
  }
  const ph = byType.get('ph');
  if (ph != null) lines.push(`- pH: ${ph}`);
  return lines.length ? lines.join('\n') : '(no recent water readings available)';
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
    'You are an aquaponics crop-health advisor. From a leaf photo and the grower\'s own recent water/nutrient readings, ' +
    'identify LIKELY nutrient deficiencies visible in the plant. Cross-check what you see against the readings: if leaves ' +
    'look deficient in a nutrient that measures adequate, say so and suggest pH lock-out or root issues instead. Be advisory, ' +
    'never definitive — deficiency symptoms overlap and photos can mislead. Respond with ONLY a JSON object, no prose, matching:\n' +
    '{"deficiencies":[{"nutrient":"<name>","confidence":"low|medium|high","visible_signs":"<what in the photo>","severity":"mild|moderate|severe"}],' +
    '"ruling_out":["<nutrient/cause and why>"],"overall":"<one sentence>","suggested_checks":["<action>","<action>"]}\n' +
    'Use the exact nutrient names: Nitrogen (N), Phosphorus (P), Potassium (K), Calcium (Ca), Magnesium (Mg), Iron (Fe). ' +
    'Empty deficiencies array if the plant looks healthy.';

  const userText =
    `Crop: ${cropName}.\nRecent readings (measured vs target):\n${readingsSummary(context.targets, context.readings)}\n\n` +
    'Analyse the attached leaf photo.';

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
    deficiencies: Array.isArray(parsed.deficiencies) ? parsed.deficiencies : [],
    ruling_out: Array.isArray(parsed.ruling_out) ? parsed.ruling_out : [],
    overall: typeof parsed.overall === 'string' ? parsed.overall : '',
    suggested_checks: Array.isArray(parsed.suggested_checks) ? parsed.suggested_checks : [],
  };
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
