// Batch numbers in the growers' convention: "WW/YY · Label" — ISO week /
// 2-digit year · cultivar-or-crop. Mirrors the client generator in
// client/src/features/plants/plantGrowth.ts; kept in sync so seedling batches
// (numbered server-side at sow) and plant batches read identically.

// ISO-8601 week + week-year (the week's Thursday decides the year).
function isoWeekYear(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { week, year: t.getUTCFullYear() };
}

// The label after the dot: the cultivar for "Type — Cultivar" varieties
// ("Butter — Anandra" → "Anandra"), else the crop's display name.
function batchLabel(cropDisplay, seedVariety) {
    const cultivar = seedVariety ? String(seedVariety).split('—').pop().trim() : '';
    return cultivar || (cropDisplay || '').trim() || 'Batch';
}

// Build "WW/YY · Label", appending " #2", " #3"… when that id already exists in
// `existing` (an iterable of taken numbers).
function buildBatchNumber(label, existing = [], when = new Date()) {
    const { week, year } = isoWeekYear(when);
    const p2 = (n) => String(n).padStart(2, '0');
    const base = `${p2(week)}/${p2(year % 100)} · ${(label || 'Batch').trim()}`;
    const taken = new Set(existing);
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base} #${n}`)) n++;
    return `${base} #${n}`;
}

module.exports = { isoWeekYear, batchLabel, buildBatchNumber };
