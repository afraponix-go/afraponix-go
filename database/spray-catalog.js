// Reference spray product catalog, based on Afraponix's BCF Spray Plan, with a
// fish-safety rating added for aquaponic use. Ratings reflect established
// aquaculture toxicology: pyrethrins and copper are the notably fish-toxic
// items, biologicals (Bacillus/Trichoderma/Metarhizium) and nutrient foliar
// feeds are safe. These are guidance for a stocked recirculating system, not a
// substitute for the product label — always avoid overspray/runoff into the
// fish water. Seeded (idempotent, by code) into the global spray_products
// catalog (user_id NULL). Extend or correct here and re-run the seed.

// fish_safety: 'safe' | 'caution' | 'toxic'. phi_days = pre-harvest interval;
// resistance_group = IRAC (insecticides) / FRAC (fungicides) mode-of-action
// group for rotation. The BCF products are organic/biological with 0-day PHI —
// confirm against each product label and local regulations.
const SPRAY_CATALOG = [
  // Insecticides
  { code: 'bioneem', category: 'insecticides', product_name: 'Bioneem', active_ingredient: 'Azadirachtin', target: 'Bollworm, Snout Beetle, Aphids, Two-Spotted Mite, European Red Mite, Codling Moth, Fruit Fly', default_rate: '100 ml per 10L', interval_days: 7, fish_safety: 'caution', fish_note: 'Neem can harm fish at high concentration — avoid overspray into the water.', compatibility_notes: 'Preventative foliar — combine with foliar feeds.', phi_days: 0, resistance_group: 'IRAC UN' },
  { code: 'pyrol', category: 'insecticides', product_name: 'Pyrol', active_ingredient: 'Pyrethrin', target: 'Bollworm, Snout Beetle, Aphids, Two-Spotted Mite, European Red Mite, Codling Moth, Fruit Fly', default_rate: '100 ml per 10L', interval_days: 7, fish_safety: 'toxic', fish_note: 'Pyrethrins are highly toxic to fish — keep out of the system water entirely.', compatibility_notes: 'Reactive foliar — combine with foliar feeds.', phi_days: 0, resistance_group: 'IRAC 3A' },
  { code: 'metarhizium_62', category: 'insecticides', product_name: 'Metarhizium 62', active_ingredient: 'Metarhizium anisopliae', target: 'Thrips, Whitefly, Snout Beetle', default_rate: '5 ml per 10L', interval_days: 10, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Biological — always foliar, combine with foliar feeds.', phi_days: 0, resistance_group: 'IRAC BC' },
  { code: 'eco_insect_control', category: 'insecticides', product_name: 'Eco Insect Control', active_ingredient: 'Spinosad', target: 'Thrips, Bollworm, Lawn Caterpillar', default_rate: '7 ml per 10L', interval_days: 7, fish_safety: 'caution', fish_note: 'Toxic to aquatic invertebrates — avoid runoff into the system.', compatibility_notes: 'Reactive foliar — combine with foliar feeds.', phi_days: 1, resistance_group: 'IRAC 5' },

  // Fungicides
  { code: 'copper_soap', category: 'fungicides', product_name: 'Copper Soap', active_ingredient: 'Copper Octanoate', target: 'Downy Mildew, Powdery Mildew', default_rate: '150 ml per 10L', interval_days: 7, fish_safety: 'toxic', fish_note: 'Copper is toxic to fish and the biofilter — do not let it reach the water.', compatibility_notes: 'Preventative foliar — combine with foliar feeds.', phi_days: 0, resistance_group: 'FRAC M01' },
  { code: 'bacillus', category: 'fungicides', product_name: 'Bacillus', active_ingredient: 'Bacillus subtilis', target: 'Downy Mildew, Powdery Mildew', default_rate: '10 ml per 10L', interval_days: 10, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Preventative biological — combine with ORGANIC foliar feeds.', phi_days: 0, resistance_group: 'FRAC BM02' },
  { code: 'amylox', category: 'fungicides', product_name: 'AmyloX', active_ingredient: 'Bacillus amyloliquefaciens', target: 'Downy Mildew, Powdery Mildew', default_rate: '20 g per 10L', interval_days: 10, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Reactive biological — combine with ORGANIC foliar feeds.', phi_days: 0, resistance_group: 'FRAC BM02' },
  { code: 'lime_sulphur', category: 'fungicides', product_name: 'Lime Sulphur', active_ingredient: 'Polysulphide Sulphur', target: 'Downy Mildew, Powdery Mildew', default_rate: '250 ml per 10L', interval_days: 14, fish_safety: 'caution', fish_note: 'Sulphur and pH swings can stress fish — avoid overspray into the water.', compatibility_notes: 'Reactive — combine with ORGANIC foliar feeds. Do not mix with copper products.', phi_days: 0, resistance_group: 'FRAC M02' },
  { code: 'full_cream_milk', category: 'fungicides', product_name: 'Full Cream Milk', active_ingredient: 'Milk Protein', target: 'Powdery Mildew', default_rate: '1 part milk to 2-3 parts water', interval_days: 7, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Reactive — combine with ORGANIC foliar feeds.', phi_days: 0, resistance_group: null },
  { code: 'trichoderma', category: 'fungicides', product_name: 'Trichoderma', active_ingredient: 'Trichoderma asperellum', target: 'Pythium', default_rate: '30 ml per 10L', interval_days: 14, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Reactive biological — combine with ORGANIC foliar feeds.', phi_days: 0, resistance_group: 'FRAC BM02' },

  // Foliar feeds (nutrients — no PHI restriction, no resistance group)
  { code: 'nitrosol', category: 'foliar-feeds', product_name: 'Nitrosol', active_ingredient: 'NPK, Magnesium, Calcium, Sulphur, Micronutrients, Growth hormone', target: 'Complete nutrient solution', default_rate: '50 ml per 10L', interval_days: 7, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Complete nutrient foliar feed.', phi_days: 0, resistance_group: null },
  { code: 'eckosil', category: 'foliar-feeds', product_name: 'Eckosil', active_ingredient: 'Silicon, Iron EDTA, Molybdenum, Zinc', target: 'Silicon and micronutrients', default_rate: '3 ml per 10L', interval_days: 14, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Silicon and micronutrient foliar feed.', phi_days: 0, resistance_group: null },
  { code: 'seabrix', category: 'foliar-feeds', product_name: 'Seabrix / Oceanfert / Seaboost / Seagrow', active_ingredient: 'N, P, K, Ca, Mg + Micronutrients', target: 'Seaweed extract nutrition', default_rate: '30 ml per 10L', interval_days: 7, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Seaweed extract with complete nutrition.', phi_days: 0, resistance_group: null },
  { code: 'fulvic_acid', category: 'foliar-feeds', product_name: 'Fulvic Acid', active_ingredient: 'Fulvic Acid, Humic Acid', target: 'Nutrient uptake enhancement', default_rate: '7.5 g per 10L', interval_days: 14, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Nutrient uptake enhancer.', phi_days: 0, resistance_group: null },
  { code: 'iron_chelate', category: 'foliar-feeds', product_name: 'Iron Chelate', active_ingredient: 'Iron DTPA Chelate 11%', target: 'Iron deficiency correction', default_rate: '25-50 g per 10L', interval_days: 7, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Iron deficiency correction.', phi_days: 0, resistance_group: null },
  { code: 'potassium_nitrate', category: 'foliar-feeds', product_name: 'Potassium Nitrate', active_ingredient: '38.7% Potassium, 61.3% Nitrate', target: 'Potassium and nitrogen boost', default_rate: '100 g / 0.5% per 10L with Nitrosol/seaweed extract', interval_days: 7, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Potassium and nitrogen boost.', phi_days: 0, resistance_group: null },
  { code: 'calcium_nitrate', category: 'foliar-feeds', product_name: 'Calcium Nitrate', active_ingredient: '24.4% Calcium, 77.6% Nitrate', target: 'Calcium deficiency prevention', default_rate: '100 g / 0.5% per 10L with Nitrosol/seaweed extract', interval_days: 7, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Calcium deficiency prevention.', phi_days: 0, resistance_group: null },
  { code: 'magnesium_sulphate', category: 'foliar-feeds', product_name: 'Magnesium Sulphate (Epsom Salt)', active_ingredient: '20.2% Magnesium, 79.8% Sulphate', target: 'Magnesium supplementation', default_rate: '100 g / 0.5% per 10L with Nitrosol/seaweed extract', interval_days: 10, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Promotes green growth; spray on leafy plants.', phi_days: 0, resistance_group: null },
  { code: 'calsure', category: 'foliar-feeds', product_name: 'Calsure', active_ingredient: 'Calcium Chelate', target: 'Calcium deficiency treatment', default_rate: '200 ml / 1% per 10L with fulvic acid', interval_days: 7, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Use when calcium deficiency is detected.', phi_days: 0, resistance_group: null },
  { code: 'organofert', category: 'foliar-feeds', product_name: 'Organofert', active_ingredient: 'Humic and Fulvic Acids, Earthworm extracts, Micro-organisms, Fish Emulsion', target: 'Organic nutrition', default_rate: '200 ml per 10L', interval_days: 14, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Organic nutrition foliar feed.', phi_days: 0, resistance_group: null },
  { code: 'shiman_2_1_2', category: 'foliar-feeds', product_name: 'Shiman 2-1-2', active_ingredient: 'Full spectrum of minerals', target: 'Mineral supplementation', default_rate: '20 g per 10L', interval_days: 14, fish_safety: 'safe', fish_note: null, compatibility_notes: 'Do not use with Lime Sulphur, Bordeaux mixture or copper-containing products.', phi_days: 0, resistance_group: null },
]

// Default weekly cadence by category (the BCF rotation): insecticides Monday,
// fungicides Wednesday, foliar feeds both. Used to pre-fill a programme.
const CATEGORY_DEFAULT_DAYS = {
  insecticides: 'mon',
  fungicides: 'wed',
  'foliar-feeds': 'mon,wed',
  'soil-drenches': 'mon',
}

const SPRAY_CATEGORIES = [
  { code: 'insecticides', label: 'Insecticides' },
  { code: 'fungicides', label: 'Fungicides' },
  { code: 'foliar-feeds', label: 'Foliar feeds' },
  { code: 'soil-drenches', label: 'Soil drenches' },
]

module.exports = { SPRAY_CATALOG, CATEGORY_DEFAULT_DAYS, SPRAY_CATEGORIES }
