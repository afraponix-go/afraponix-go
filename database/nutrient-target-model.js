// Aquaponic crop nutrient target model — the single source of truth for the
// ratio-and-floor rules from Afraponix's "Aquaponic Crop Nutrient Targets"
// workbook (Crop Targets tab). Nitrate/N is the anchor: every other nutrient is
// the HIGHER of (ratio x N) and an absolute floor. Fruiting crops carry two
// stages (vegetative + fruiting); leafy crops and herbs carry one (vegetative).
//
// All figures are ELEMENTAL ppm (mg/L): ppm N, P, K, Ca, Mg, Fe.
//
// Editing this file and re-running the crop-target seed re-derives every stored
// target. Keep it in step with the workbook.

// Ratio of each nutrient to N, and the absolute floor, per stage.
const STAGE_RULES = {
  vegetative: {
    ratio: { phosphorus: 0.2, potassium: 0.8, calcium: 0.8, magnesium: 0.2 },
    floor: { phosphorus: 12, potassium: 50, calcium: 50, magnesium: 25, iron: 2.0 },
  },
  fruiting: {
    ratio: { phosphorus: 0.2, potassium: 1.3, calcium: 1.2, magnesium: 0.2 },
    floor: { phosphorus: 18, potassium: 70, calcium: 70, magnesium: 25, iron: 2.5 },
  },
};

// Per-crop N anchors (ppm N) by stage. Leafy greens and herbs are vegetative
// only; fruiting vegetables get both stages. Codes match the `crops` table.
const CROP_ANCHORS = [
  // Leafy greens
  { code: 'arugula', stage: 'vegetative', anchorN: 80 },
  { code: 'celery', stage: 'vegetative', anchorN: 90 },
  { code: 'kale', stage: 'vegetative', anchorN: 80 },
  { code: 'leeks', stage: 'vegetative', anchorN: 80 },
  { code: 'lettuce', stage: 'vegetative', anchorN: 80 },
  { code: 'pac_choi', stage: 'vegetative', anchorN: 80 },
  { code: 'spinach', stage: 'vegetative', anchorN: 85 },
  { code: 'spring_onion', stage: 'vegetative', anchorN: 70 },
  { code: 'swiss_chard', stage: 'vegetative', anchorN: 80 },
  // Herbs
  { code: 'basil', stage: 'vegetative', anchorN: 70 },
  { code: 'chives', stage: 'vegetative', anchorN: 70 },
  { code: 'cilantro', stage: 'vegetative', anchorN: 65 },
  { code: 'mint', stage: 'vegetative', anchorN: 70 },
  { code: 'oregano', stage: 'vegetative', anchorN: 60 },
  { code: 'parsley', stage: 'vegetative', anchorN: 70 },
  { code: 'thyme', stage: 'vegetative', anchorN: 60 },
  // Fruiting vegetables — two stages each
  { code: 'cucumbers', stage: 'vegetative', anchorN: 70 },
  { code: 'cucumbers', stage: 'fruiting', anchorN: 65 },
  { code: 'eggplant', stage: 'vegetative', anchorN: 70 },
  { code: 'eggplant', stage: 'fruiting', anchorN: 65 },
  { code: 'peppers', stage: 'vegetative', anchorN: 65 },
  { code: 'peppers', stage: 'fruiting', anchorN: 60 },
  { code: 'strawberries', stage: 'vegetative', anchorN: 60 },
  { code: 'strawberries', stage: 'fruiting', anchorN: 55 },
  { code: 'tomatoes', stage: 'vegetative', anchorN: 70 },
  { code: 'tomatoes', stage: 'fruiting', anchorN: 60 },
  // Cherry tomatoes share the tomato anchors.
  { code: 'cherry_tomatoes', stage: 'vegetative', anchorN: 70 },
  { code: 'cherry_tomatoes', stage: 'fruiting', anchorN: 60 },
];

const round1 = (n) => Math.round(n * 10) / 10;

// Compute the six elemental targets (ppm) from an N anchor and stage. Returns a
// map keyed by nutrient code (nitrogen/phosphorus/potassium/calcium/magnesium/
// iron), each { target, floor } — target is max(ratio x N, floor); floor is the
// absolute minimum below which the crop suffers regardless of nitrate.
function computeTargets(anchorN, stage) {
  const rules = STAGE_RULES[stage];
  if (!rules) throw new Error(`Unknown stage: ${stage}`);
  const N = Number(anchorN);
  const t = (nutrient) => {
    const floor = rules.floor[nutrient];
    const ratio = rules.ratio[nutrient];
    const value = ratio != null ? Math.max(ratio * N, floor) : floor;
    return { target: round1(value), floor };
  };
  return {
    nitrogen: { target: round1(N), floor: null },
    phosphorus: t('phosphorus'),
    potassium: t('potassium'),
    calcium: t('calcium'),
    magnesium: t('magnesium'),
    iron: t('iron'),
  };
}

module.exports = { STAGE_RULES, CROP_ANCHORS, computeTargets };
